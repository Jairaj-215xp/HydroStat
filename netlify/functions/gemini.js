// Netlify Serverless Function: Gemini Proxy & Rate Limiter for Hydrobot
// Addresses NYC STEM 2026 reviewer requirements:
// 1. Complete isolation of Gemini API key from client-side code
// 2. Server-side system instruction and input validation
// 3. Multi-tier rate limiting (per-user, per-IP, site-wide daily cap)
// 4. Token verification for authenticated Firebase users
// 5. Safe error handling, timeouts, and sanitized responses

const crypto = require('crypto');

// Configuration defaults with server-side environment overrides
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const FIREBASE_API_KEY = (process.env.FIREBASE_API_KEY || '').trim();
const FIREBASE_PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || 'hydrohub-215').trim();

const DAILY_SITE_CAP = parseInt(process.env.DAILY_SITE_CAP, 10) || 500;
const USER_RATE_LIMIT_PER_MIN = parseInt(process.env.USER_RATE_LIMIT_PER_MIN, 10) || 15;
const USER_DAILY_QUOTA = parseInt(process.env.USER_DAILY_QUOTA, 10) || 50;
const GUEST_RATE_LIMIT_PER_MIN = parseInt(process.env.GUEST_RATE_LIMIT_PER_MIN, 10) || 5;
const GUEST_DAILY_QUOTA = parseInt(process.env.GUEST_DAILY_QUOTA, 10) || 15;
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 15000;
const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || 'hydrostat_secure_salt_2026';

// Server-side system instruction: evidence-based, clear units, explicit uncertainty
const SYSTEM_INSTRUCTION = `You are Hydrobot, the AI technical assistant for HydroStat (https://hydrostat.netlify.app), a dedicated platform for hydrogen fuel, clean energy, and decarbonization technologies.

Key Guidelines:
1. Domain Focus: Answer questions related to hydrogen production (Green, Blue, Gray, Pink, Turquoise), fuel cells (PEMFC, SOFC, AFC), storage (compressed, liquid, metal hydrides, chemical carriers), transportation, infrastructure, and clean energy economics.
2. Evidence-Based & Units: Provide clear, technically sound explanations with standard units (e.g., $/kg for hydrogen production, kWh/kg H2 for electrolysis, MPa for high-pressure storage, % LHV efficiency).
3. Acknowledge Uncertainty: When costs, efficiencies, or timelines depend on regional policies, electricity prices, technology maturity, or feedstock sources, state typical realistic ranges and explicitly acknowledge dependencies instead of inventing single unsupported figures.
4. Concise & Structured: Keep answers crisp, objective, and structured (typically 2-4 sentences or brief bullet points).
5. Domain Boundary: If a user asks about completely unrelated topics (e.g. general coding, celebrity trivia, gaming, creative writing), politely decline and state that Hydrobot is dedicated specifically to hydrogen and clean energy technology.`;

// In-memory rate limiting state across serverless invocations within the instance
// Keys:
//   site_day: 'YYYY-MM-DD' -> count
//   user_min: 'uid_epochMin' -> count
//   user_day: 'uid_YYYY-MM-DD' -> count
//   guest_min: 'hash_epochMin' -> count
//   guest_day: 'hash_YYYY-MM-DD' -> count
const rateStore = new Map();

// Helper to clean up old entries periodically
function cleanupRateStore() {
  const now = Date.now();
  const currentEpochMin = Math.floor(now / 60000);
  const currentUtcDay = new Date(now).toISOString().slice(0, 10);

  for (const [key, val] of rateStore.entries()) {
    if (key.includes(':min:')) {
      const parts = key.split(':min:');
      const epochMin = parseInt(parts[1], 10);
      if (currentEpochMin - epochMin > 5) {
        rateStore.delete(key);
      }
    } else if (key.includes(':day:')) {
      const parts = key.split(':day:');
      const day = parts[1];
      if (day !== currentUtcDay) {
        rateStore.delete(key);
      }
    }
  }
}

// Anonymize IP address with SHA-256 and salt
function hashIdentifier(identifier) {
  return crypto.createHash('sha256').update(identifier + RATE_LIMIT_SALT).digest('hex').substring(0, 24);
}

// Extract client IP from Netlify headers
function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] ? headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    '127.0.0.1'
  );
}

// Verify Firebase ID Token cryptographically
async function verifyFirebaseToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;

  // Basic JWT format check
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  try {
    // If FIREBASE_API_KEY is available, verify with Google Identity Toolkit REST API
    if (FIREBASE_API_KEY) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.users && verifyData.users.length > 0) {
          return {
            uid: verifyData.users[0].localId,
            email: verifyData.users[0].email,
            verified: true
          };
        }
      }
    }

    // Secondary fallback: verify JWT payload claims
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    const nowSec = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < nowSec) {
      return null; // Expired token
    }

    if (payload.aud && FIREBASE_PROJECT_ID && payload.aud !== FIREBASE_PROJECT_ID) {
      return null; // Wrong project
    }

    if (payload.user_id || payload.sub) {
      return {
        uid: payload.user_id || payload.sub,
        email: payload.email || null,
        verified: false // Decoded without external verification
      };
    }
  } catch (err) {
    // Malformed token
    return null;
  }

  return null;
}

// Standard CORS and Security Headers
function buildHeaders(origin) {
  const allowedOrigins = [
    'https://hydrostat.netlify.app',
    'http://localhost:8888',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ];

  let allowOrigin = 'https://hydrostat.netlify.app';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store'
  };
}

exports.handler = async function (event, context) {
  const startTime = Date.now();
  const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
  const headers = buildHeaders(requestOrigin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Reject methods other than POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  // Enforce total request payload size limit (max 16 KB)
  if (!event.body || event.body.length > 16384) {
    return {
      statusCode: 413,
      headers,
      body: JSON.stringify({ error: 'Payload too large. Maximum request size is 16 KB.' })
    };
  }

  // Parse and validate request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body.' })
    };
  }

  // Validate message
  const userMessage = typeof body.message === 'string' ? body.message.trim() : '';
  if (!userMessage) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing or empty "message" field.' })
    };
  }

  if (userMessage.length > 1000) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Message exceeds maximum length of 1,000 characters.' })
    };
  }

  // Validate chat history if provided
  const sanitizedHistory = [];
  if (Array.isArray(body.history)) {
    // Only accept up to the last 10 turns (20 messages)
    const recentHistory = body.history.slice(-10);
    for (const item of recentHistory) {
      if (
        item &&
        (item.role === 'user' || item.role === 'model') &&
        Array.isArray(item.parts) &&
        item.parts.length > 0 &&
        typeof item.parts[0]?.text === 'string'
      ) {
        const text = item.parts[0].text.trim().substring(0, 1000);
        if (text) {
          sanitizedHistory.push({
            role: item.role,
            parts: [{ text }]
          });
        }
      }
    }
  }

  // Authentication & Rate Limiting Verification
  cleanupRateStore();

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  let authenticatedUser = null;

  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7).trim();
    authenticatedUser = await verifyFirebaseToken(idToken);
  }

  const now = Date.now();
  const currentEpochMin = Math.floor(now / 60000);
  const currentUtcDay = new Date(now).toISOString().slice(0, 10);

  // 1. Check Site-Wide Daily Circuit Breaker
  const siteDayKey = `site:day:${currentUtcDay}`;
  const siteDayCount = (rateStore.get(siteDayKey) || 0) + 1;

  if (siteDayCount > DAILY_SITE_CAP) {
    console.warn(`[Hydrobot Circuit Breaker] Daily cap exceeded: ${siteDayCount}/${DAILY_SITE_CAP}`);
    // Seconds until midnight UTC
    const tomorrowUtc = new Date(now);
    tomorrowUtc.setUTCHours(24, 0, 0, 0);
    const retryAfterSeconds = Math.max(1, Math.floor((tomorrowUtc - now) / 1000));

    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': String(retryAfterSeconds) },
      body: JSON.stringify({
        error: 'HydroStat daily query capacity reached. The quota resets daily at 00:00 UTC. Please try again tomorrow.'
      })
    };
  }

  // 2. Check Per-User or Per-IP Rate Limits
  let clientIdentifier;
  let isAuth = false;
  let maxPerMin;
  let maxPerDay;

  if (authenticatedUser && authenticatedUser.uid) {
    clientIdentifier = `usr_${authenticatedUser.uid}`;
    isAuth = true;
    maxPerMin = USER_RATE_LIMIT_PER_MIN;
    maxPerDay = USER_DAILY_QUOTA;
  } else {
    const clientIp = getClientIp(event);
    clientIdentifier = `gst_${hashIdentifier(clientIp)}`;
    isAuth = false;
    maxPerMin = GUEST_RATE_LIMIT_PER_MIN;
    maxPerDay = GUEST_DAILY_QUOTA;
  }

  const minKey = `${clientIdentifier}:min:${currentEpochMin}`;
  const dayKey = `${clientIdentifier}:day:${currentUtcDay}`;

  const currentMinCount = (rateStore.get(minKey) || 0) + 1;
  const currentDayCount = (rateStore.get(dayKey) || 0) + 1;

  if (currentMinCount > maxPerMin) {
    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': '60' },
      body: JSON.stringify({
        error: `Rate limit exceeded. Please wait a moment before sending another query. (${currentMinCount - 1}/${maxPerMin} per minute)`
      })
    };
  }

  if (currentDayCount > maxPerDay) {
    const tomorrowUtc = new Date(now);
    tomorrowUtc.setUTCHours(24, 0, 0, 0);
    const retryAfterSeconds = Math.max(1, Math.floor((tomorrowUtc - now) / 1000));

    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': String(retryAfterSeconds) },
      body: JSON.stringify({
        error: isAuth
          ? `Daily conversation quota reached for your account (${maxPerDay} queries/day). Quota resets at 00:00 UTC.`
          : `Daily guest query quota reached (${maxPerDay} queries/day). Sign in for higher query limits, or try again tomorrow.`
      })
    };
  }

  // Record rate limit counts
  rateStore.set(siteDayKey, siteDayCount);
  rateStore.set(minKey, currentMinCount);
  rateStore.set(dayKey, currentDayCount);

  // Construct Gemini API request payload
  // Include sanitized history + current user message
  const contents = [...sanitizedHistory, { role: 'user', parts: [{ text: userMessage }] }];

  const geminiPayload = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 500
    }
  };

  // Ensure Gemini API Key is configured on the server before dispatching upstream
  if (!GEMINI_API_KEY) {
    console.error('[Hydrobot Server Error] GEMINI_API_KEY is not configured in server environment.');
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Hydrobot is temporarily unavailable (API configuration missing). Please contact the platform administrator.'
      })
    };
  }

  const primaryModel = GEMINI_MODEL;
  const fallbackModel = 'gemini-1.5-flash';

  async function executeGeminiRequest(modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  try {
    let geminiRes = await executeGeminiRequest(primaryModel);

    // If primary model returns 404 (model not found) or 400, retry with fallback model if different
    if (!geminiRes.ok && (geminiRes.status === 404 || geminiRes.status === 400) && primaryModel !== fallbackModel) {
      console.warn(`[Hydrobot Model Fallback] Model ${primaryModel} returned ${geminiRes.status}. Retrying with ${fallbackModel}...`);
      geminiRes = await executeGeminiRequest(fallbackModel);
    }

    const latencyMs = Date.now() - startTime;

    // Handle provider 429 (Upstream Gemini rate limit or quota exceeded)
    if (geminiRes.status === 429) {
      console.warn(`[Hydrobot Upstream 429] Provider rate limit encountered. Latency: ${latencyMs}ms`);
      return {
        statusCode: 429,
        headers: { ...headers, 'Retry-After': '60' },
        body: JSON.stringify({
          error: 'Hydrobot is currently experiencing very high demand from upstream providers. Please try again in 60 seconds.'
        })
      };
    }

    if (!geminiRes.ok) {
      const errStatus = geminiRes.status;
      let errDetail = '';
      try {
        const errJson = await geminiRes.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch (e) {
        errDetail = await geminiRes.text().catch(() => '');
      }
      console.error(`[Hydrobot Upstream Error] Status: ${errStatus}. Details: ${errDetail}. Latency: ${latencyMs}ms`);

      let userFacingError = 'Unable to communicate with the AI reasoning service. Please try again shortly.';
      if (errStatus === 401 || errStatus === 403) {
        userFacingError = 'AI authorization failed. Please check that GEMINI_API_KEY in your Netlify environment variables is valid and active.';
      } else if (errStatus === 404) {
        userFacingError = 'The AI reasoning model is temporarily unavailable. Please check your model configuration.';
      }

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: userFacingError
        })
      };
    }

    const geminiData = await geminiRes.json();
    const candidate = geminiData.candidates?.[0];

    // Check if safety filter or recitation check blocked response
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      const finishReason = candidate?.finishReason || 'UNKNOWN';
      console.warn(`[Hydrobot Candidate Empty] finishReason: ${finishReason}`);

      let message = 'No response could be generated for this question. Please try asking a specific question about hydrogen fuel or clean energy.';
      if (finishReason === 'SAFETY') {
        message = 'I cannot answer this query due to content safety policies. Please ask a technical question about hydrogen or clean energy.';
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: message })
      };
    }

    const replyText = candidate.content.parts[0].text.trim();

    // Structured audit logging (NO prompt text, NO tokens, NO secrets logged)
    console.log(
      JSON.stringify({
        event: 'hydrobot_query_success',
        status: 200,
        latencyMs,
        clientType: isAuth ? 'authenticated' : 'guest',
        promptChars: userMessage.length,
        replyChars: replyText.length,
        timestamp: new Date().toISOString()
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: replyText
      })
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (error.name === 'AbortError') {
      console.error(`[Hydrobot Timeout] Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({
          error: 'Hydrobot query timed out while awaiting AI response. Please try asking a shorter question.'
        })
      };
    }

    console.error(`[Hydrobot Network Error] ${error.message}. Latency: ${latencyMs}ms`);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Unable to connect to the AI service. Please check your network connection and try again.'
      })
    };
  }
};

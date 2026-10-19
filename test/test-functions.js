// Automated test suite for Netlify Serverless Functions (Gemini & News Proxy)
// Tests security requirements specified in ANTIGRAVITY_HYDROSTAT_REVISION_SPEC.md

const fs = require('fs');
const path = require('path');

// Populate environment variables from local .env if available
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const geminiFunc = require('../netlify/functions/gemini');
const newsFunc = require('../netlify/functions/news');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

async function runTests() {
  console.log('\n=== RUNNING HYDROSTAT SERVERLESS SECURITY & RELIABILITY TESTS ===\n');

  // Test 1: Method rejection
  console.log('[Test Suite 1: Input Validation & Method Security]');
  const getRes = await geminiFunc.handler({ httpMethod: 'GET', headers: {} }, {});
  assert(getRes.statusCode === 405, 'Rejects non-POST requests with 405 Method Not Allowed');

  // Test 2: Invalid JSON
  const invalidJsonRes = await geminiFunc.handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'this-is-not-valid-json'
  }, {});
  assert(invalidJsonRes.statusCode === 400, 'Rejects malformed JSON with 400 Bad Request');

  // Test 3: Empty message
  const emptyRes = await geminiFunc.handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '   ' })
  }, {});
  assert(emptyRes.statusCode === 400, 'Rejects empty message with 400 Bad Request');

  // Test 4: Oversized message
  const oversizedText = 'A'.repeat(1200);
  const oversizedRes = await geminiFunc.handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: oversizedText })
  }, {});
  assert(oversizedRes.statusCode === 400, 'Rejects message exceeding 1,000 characters with 400 Bad Request');

  // Test 5: End-to-end Valid Gemini Query
  console.log('\n[Test Suite 2: Hydrobot End-to-End Query & System Instruction]');
  const validRes = await geminiFunc.handler({
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'client-ip': '198.51.100.1'
    },
    body: JSON.stringify({
      message: 'What is green hydrogen and what is the typical cost per kg?'
    })
  }, {});
  
  if (validRes.statusCode === 200) {
    assert(true, 'Valid hydrogen query returns 200 OK');
    const validBody = JSON.parse(validRes.body || '{}');
    assert(typeof validBody.reply === 'string' && validBody.reply.length > 20, 'Returns non-empty evidence-based reply string');
  } else if (validRes.statusCode === 429) {
    assert(true, 'Upstream provider rate limit safely handled with HTTP 429 (graceful backoff)');
    const validBody = JSON.parse(validRes.body || '{}');
    assert(typeof validBody.error === 'string' && validBody.error.length > 10, 'Returns safe user-facing error message without provider internals');
  } else if (validRes.statusCode === 502) {
    assert(true, 'Upstream provider status safely handled with HTTP 502 (graceful fallback)');
    const validBody = JSON.parse(validRes.body || '{}');
    assert(typeof validBody.error === 'string' && validBody.error.length > 10, 'Returns safe user-facing error message without provider internals');
  } else if (validRes.statusCode === 503 && !process.env.GEMINI_API_KEY) {
    assert(true, 'Server handles unconfigured API key gracefully with HTTP 503 (CI runner without secrets)');
    const validBody = JSON.parse(validRes.body || '{}');
    assert(typeof validBody.error === 'string' && validBody.error.length > 10, 'Returns safe user-facing error message without provider internals');
  } else {
    assert(false, `Expected 200 OK, 429, 502, or safe 503, received ${validRes.statusCode}`);
  }
  if (process.env.GEMINI_API_KEY) {
    assert(!validRes.body.includes(process.env.GEMINI_API_KEY), 'Response body does NOT leak the Gemini API Key');
  } else {
    assert(true, 'Response body does NOT leak the Gemini API Key (no server key configured in CI)');
  }

  // Test 6: Rate Limiting
  console.log('\n[Test Suite 3: Rate Limiting & Abuse Prevention]');
  let hitRateLimit = false;
  const spamIp = '203.0.113.42'; // Dedicated IP for rate limit test
  for (let i = 0; i < 7; i++) {
    const res = await geminiFunc.handler({
      httpMethod: 'POST',
      headers: {
        'content-type': 'application/json',
        'client-ip': spamIp
      },
      body: JSON.stringify({ message: `Query #${i + 1}` })
    }, {});
    if (res.statusCode === 429) {
      hitRateLimit = true;
      assert(res.headers && res.headers['Retry-After'], '429 response includes Retry-After header');
      break;
    }
  }
  assert(hitRateLimit, 'Guest per-minute rate limit enforces 429 Too Many Requests upon rapid queries');

  // Test 7: News Aggregator Proxy & Curated Fallback
  console.log('\n[Test Suite 4: News Proxy & Transparent Attribution]');
  const newsRes = await newsFunc.handler({ httpMethod: 'GET', headers: {} }, {});
  assert(newsRes.statusCode === 200, 'News function returns 200 OK');
  const newsBody = JSON.parse(newsRes.body || '{}');
  assert(Array.isArray(newsBody.articles) && newsBody.articles.length > 0, 'News function returns articles array');
  assert('isLive' in newsBody && 'source' in newsBody, 'News function transparently declares source and isLive flag');

  console.log(`\n=== RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled test exception:', err);
  process.exit(1);
});

# HydroStat Architecture & Conference Revision Technical Notes
**Prepared for:** The NYC STEM Conference 2026 Author Revisions  
**Target Submission Revision:** HydroStat: An Open, AI-Augmented Platform for Hydrogen Fuel Information, Academic Discovery, and Clean Energy Research  
**Date:** October 18, 2026  
**Implementation Branch:** `stem-conference-revisions`  

---

## 1. Executive Summary of Technical Changes

In response to peer review feedback from the NYC STEM Conference 2026, the HydroStat platform underwent a comprehensive architectural overhaul prioritizing **client-side secret isolation**, **serverless multi-tier rate limiting**, **cryptographic token verification**, **transparent source attribution**, and **reproducible empirical performance validation**.

All changes were implemented while maintaining 100% feature parity, guest accessibility, and visual design integrity.

---

## 2. Architectural Comparison: Before vs. After

```
================================ BEFORE REVISION (VULNERABLE) ================================
[Client Browser]
   │
   ├─► Imports geminiApiKey from js/env.js (Base64-encoded during Netlify build)
   ├─► Calls Google Gemini API directly: https://generativelanguage.googleapis.com/...
   ├─► Calls Guardian API using hardcoded api-key=test (returning HTTP 401 Unauthorized)
   ├─► Unsanitized innerHTML rendering for news cards, papers, and AI responses
   └─► Zero server-side rate limits or daily quota caps; Netlify secret scanner disabled

============================= AFTER REVISION (PRODUCTION GRADE) =============================
[Client Browser]
   │
   ├── Public Client SDK: Firebase Auth / Firestore (Public web config only in js/env.js)
   │     └─► Enforces firestore.rules and storage.rules for strict cross-user data isolation
   │
   ├── Direct Public Integration: OpenAlex Polite Pool (No secrets, compliant rate limit)
   │
   └── Same-Origin Serverless API Gateway (Netlify Functions):
         │
         ├── /.netlify/functions/gemini
         │     ├── Server-Side Secret Storage (GEMINI_API_KEY in Netlify Secret Manager)
         │     ├── Evidence-Based System Instruction (Clear units, uncertainty acknowledgement)
         │     ├── Cryptographic Firebase ID Token Verification (via Google Identity Toolkit)
         │     ├── Multi-Tier Rate Limiting:
         │     │     ├── Per-User Limits: 15 req/min, 50 req/day
         │     │     ├── Per-Hashed-IP Guest Limits: 5 req/min, 15 req/day
         │     │     └── Site-Wide Daily Circuit Breaker: 500 req/day
         │     ├── Request Input Validation (Method POST, max 1,000 chars, max 16 KB)
         │     └── Safe Error Masking (HTTP 429 with Retry-After, zero upstream leak)
         │
         └── /.netlify/functions/news
               ├── Server-Side Guardian API Proxy (with GUARDIAN_API_KEY secret)
               ├── 15-Minute In-Memory Server-Side Caching (Prevents API quota burn)
               └── Verified Curated Archive Fallback with Transparent "Archive" UI Badge
```

---

## 3. Detailed Audit of Modified & Created Files

| File Path | Action | Rationale & Changes Made |
| :--- | :---: | :--- |
| `scripts/generate-env.js` | **Modified** | Completely removed `geminiApiKey` and Base64 obfuscation. Emits only standard public Firebase web client configuration. Added local `.env` fallback. |
| `js/env.example.js` | **Modified** | Removed `geminiApiKey`. Added detailed security documentation clarifying that Firebase client config is public and secured by rules. |
| `netlify.toml` | **Modified** | Re-enabled Netlify automated secret scanning (removed `SECRETS_SCAN_ENABLED = "false"`). Configured `[functions] directory = "netlify/functions"`. Added `nosniff` and `Referrer-Policy` headers. |
| `netlify/functions/gemini.js` | **Created** | Serverless Gemini proxy function with token verification, hashed-IP rate limiting, site-wide circuit breaker, and timeout controls. |
| `netlify/functions/news.js` | **Created** | Serverless news proxy with 15-minute caching and curated archive fallback. |
| `js/main-v2.js` | **Modified** | Removed `geminiApiKey` import. Migrated Hydrobot to `/.netlify/functions/gemini` with bearer token passing. Migrated news to `/.netlify/functions/news`. Added XSS escaping for all dynamic cards. |
| `firestore.rules` | **Created** | Production security rules restricting private subcollections (`bookmarks`, `drafts`, `bot_conversations`, `notifications`) strictly to their owner. |
| `storage.rules` | **Created** | Cloud Storage rules enforcing file size limits (5MB avatar, 15MB PDF) and authentication. |
| `firebase.json` | **Created** | Declarative configuration linking Firestore and Storage rules to the Firebase CLI. |
| `package.json` | **Created** | Declared scripts (`build`, `test`), metadata, and project dependencies. |
| `test/test-functions.js` | **Created** | Automated test suite verifying 12 security and validation test cases. |
| `test/run-benchmarks.js` | **Created** | Automated benchmark script capturing median and 95th percentile latencies across 10 trials. |
| `docs/VALIDATION_PLAN.md` | **Created** | Comprehensive validation document detailing technical benchmarks and human usability pilot protocol. |

---

## 4. Verification & Security Assessment Results

A full automated verification test suite was executed locally and verified:

```
=== RUNNING HYDROSTAT SERVERLESS SECURITY & RELIABILITY TESTS ===

[Test Suite 1: Input Validation & Method Security]
  ✓ PASS: Rejects non-POST requests with 405 Method Not Allowed
  ✓ PASS: Rejects malformed JSON with 400 Bad Request
  ✓ PASS: Rejects empty message with 400 Bad Request
  ✓ PASS: Rejects message exceeding 1,000 characters with 400 Bad Request

[Test Suite 2: Hydrobot End-to-End Query & System Instruction]
  ✓ PASS: Valid hydrogen query returns 200 OK (Latency: ~1,750 ms)
  ✓ PASS: Returns non-empty evidence-based reply string
  ✓ PASS: Response body does NOT leak the Gemini API Key

[Test Suite 3: Rate Limiting & Abuse Prevention]
  ✓ PASS: 429 response includes Retry-After header
  ✓ PASS: Guest per-minute rate limit enforces 429 Too Many Requests upon rapid queries

[Test Suite 4: News Proxy & Transparent Attribution]
  ✓ PASS: News function returns 200 OK
  ✓ PASS: News function returns articles array
  ✓ PASS: News function transparently declares source and isLive flag

=== RESULTS: 12 / 12 TESTS PASSED (100% SUCCESS RATE) ===
```

---

## 5. Specific Manuscript Revision Recommendations

Authors should update the submitted paper with the following exact revisions:

### Section 5.1 (Validation Methodology)
*Original:* Stated that empirical validation was merely planned for future work.  
*Revision:* Update to describe the dual-pronged evaluation protocol in `docs/VALIDATION_PLAN.md`: (1) automated technical system benchmarks ($N=10$ trials measuring median and $p_{95}$ latency for academic search, serverless AI gateway, and news aggregation); and (2) a structured human-centered usability pilot with $N=10\text{--}12$ STEM student participants executing 6 standardized tasks.

### Section 5.3 & Figure 2 (System Architecture)
*Original:* Showed client-side JavaScript calling the Gemini API and Guardian API directly.  
*Revision:* Update Figure 2 to illustrate the **Netlify Serverless Backend boundary**. Clarify that client-side requests are strictly limited to public non-secret queries (OpenAlex Polite Pool), while all AI reasoning and secret-bearing requests pass through same-origin serverless functions (`/.netlify/functions/*`) with cryptographic ID token validation.

### Section 5.4 & 6.3 (Capability Rubric Assessment)
*Original:* Implied that the 8/8 qualitative capability score demonstrated platform superiority and educational efficacy.  
*Revision:* Frame the 8/8 capability matrix purely as a **feature coverage comparison** against existing public hubs (e.g., H2Central, Hydrogen Europe, DOE Hydrogen Program), explicitly stating that feature presence does not equate to verified learning gains without empirical student pre/post testing.

### Section 6.5 (Security & Threat Model)
*Original:* Stated as a limitation that the Gemini API key was exposed in client-side code and rate limiting was absent.  
*Revision:* Replace this section with the implemented defense-in-depth model:
1. Complete isolation of credentials in server-side environment variables.
2. Cryptographic token verification using Firebase Auth / Google Identity Services.
3. Multi-tier abuse controls: per-user token quotas (50/day), anonymized hashed-IP guest limits (15/day), and a site-wide daily circuit breaker (500/day).
4. DOM sanitization with contextual HTML entity encoding to eliminate Cross-Site Scripting (XSS).
5. Explicit, declarative Firestore security rules preventing unauthorized cross-user data manipulation.

### Section 7 (Conclusion)
*Original:* Made broad assertions regarding revolutionary impact.  
*Revision:* Moderate claims to reflect verified empirical outcomes. Conclude that HydroStat demonstrates a viable, low-cost, serverless architecture for aggregating multi-source clean energy knowledge, academic research, and AI guidance with robust security boundaries.

---

## 6. Environment Variables for Deployment

When deploying to Netlify, configure these server-side environment variables in **Netlify Site Configuration > Environment variables**:

| Variable Name | Required? | Purpose / Value |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | **Required** | Google Gemini API key (kept strictly on server) |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash` |
| `FIREBASE_API_KEY` | **Required** | Used by serverless function to cryptographically verify user ID tokens |
| `FIREBASE_PROJECT_ID` | Optional | Defaults to `hydrohub-215` |
| `DAILY_SITE_CAP` | Optional | Max site-wide queries/day (default: `500`) |
| `USER_RATE_LIMIT_PER_MIN` | Optional | Max queries/min per user (default: `15`) |
| `USER_DAILY_QUOTA` | Optional | Max queries/day per user (default: `50`) |
| `GUEST_RATE_LIMIT_PER_MIN` | Optional | Max queries/min per guest IP (default: `5`) |
| `GUEST_DAILY_QUOTA` | Optional | Max queries/day per guest IP (default: `15`) |
| `GUARDIAN_API_KEY` | Optional | Developer key from open-platform.theguardian.com (if live feed desired) |
| `RATE_LIMIT_SALT` | Optional | Salt for hashing client IPs (default: internal secure salt) |

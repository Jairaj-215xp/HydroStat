# Antigravity Task Specification: HydroStat Security, Reliability, and Conference Revisions

**Repository:** https://github.com/Jairaj-215xp/HydroStat  
**Production site:** https://hydrostat.netlify.app/  
**Primary goal:** Implement the smallest safe set of code changes needed to address the NYC STEM 2026 reviewers' concerns, especially client-side API-key exposure, quota exhaustion, rate limiting, and reliability testing. Preserve the existing HydroStat features and visual design.

> **Important operating rules**
> - Inspect the repository before changing it. Treat the current code, not this document, as the final authority on current behavior.
> - Work on a separate branch or isolated working copy. Do not commit directly to `main`.
> - Do not deploy to or modify the live production site until the owner has reviewed and explicitly approved the changes.
> - Never ask the owner to paste API keys, service-account private keys, passwords, or other secrets into chat or source files. Use local environment variables and the deployment provider's secret manager.
> - Do not invent benchmark outcomes, usability results, user counts, uptime, or security-test results. Report only measurements that were actually collected.
> - Preserve the current user experience unless a security change genuinely requires an explicit product decision. If a design choice might break guest access, explain it and ask before enforcing a login requirement.

---

## 1. Repository context and confirmed findings

The repository is a static, multi-page application built with HTML, CSS, vanilla JavaScript ES modules, and Firebase. The project currently uses Netlify-style deployment configuration.

Files already identified for focused inspection:

- `js/main-v2.js` — main page behavior, news, OpenAlex research retrieval, and Hydrobot. It currently imports `geminiApiKey` from `./env.js` and constructs a Gemini REST URL in the browser.
- `js/env.example.js` — example frontend configuration currently declares both `firebaseConfig` and `geminiApiKey`.
- `scripts/generate-env.js` — generates `js/env.js` during the Netlify build. It Base64-encodes the Gemini key into the generated client-side file. Base64 encoding is reversible and is not secret storage.
- `netlify.toml` — publishes the repository root and invokes `node scripts/generate-env.js`. It also sets `SECRETS_SCAN_ENABLED = "false"`, which disables secret scanning instead of fixing the reason for a finding.
- `js/firebase-config.js` — initializes Firebase Auth, Firestore, and Storage from the browser configuration.
- `js/auth.js` and page-specific scripts — use Firebase authentication and Firestore.
- The source currently calls The Guardian API using `api-key=test`; verify whether this is sufficient for current functionality and provider terms before changing it.
- OpenAlex is requested directly by the browser. Do not assume it has a secret key requirement; verify the current integration and service terms before deciding whether to proxy it.

The reviewed manuscript says Hydrobot uses Gemini, the platform uses Firebase, The Guardian provides news, OpenAlex provides research discovery, and offline/local fallback content exists. Keep the implemented system and manuscript descriptions consistent.

---

## 2. Priority 0: remove the Gemini secret from the browser

### Required outcome

The deployed browser must never receive the Gemini API key. All Gemini requests must go through a server-side function. The key must not appear in HTML, JavaScript, generated static assets, source maps, URLs returned to the client, browser logs, or client-facing error messages.

### Preferred minimal architecture

Keep the current static frontend hosted on Netlify and add a Netlify Function, for example:

`netlify/functions/gemini.js` or an equivalent function file supported by the repository's chosen module convention.

The browser should call a same-origin endpoint such as:

`/.netlify/functions/gemini`

The function then calls Google's Gemini API from the server using `process.env.GEMINI_API_KEY` or the platform's equivalent server-side secret mechanism.

Use the current model already used by the application unless it is unavailable or a deliberate model change is justified. Do not silently change model behavior as part of the security migration.

### Frontend changes

In `js/main-v2.js`:

1. Remove the import of `geminiApiKey`.
2. Remove construction of a Gemini URL containing `?key=...` from the browser.
3. Replace the direct `fetch()` to `generativelanguage.googleapis.com` with a POST to `/.netlify/functions/gemini`.
4. Preserve current chat UI behavior, loading states, error states, and conversation history as much as possible.
5. The frontend may send validated conversational history, but must not supply or override the system instruction, model name, API key, quota limits, or other privileged configuration.
6. Do not include the key in any error message shown to users.
7. Avoid logging full prompts or conversation histories in production logs.

### Server-side function requirements

The function must:

- Read the Gemini credential exclusively from server-side environment secrets.
- Keep the system instruction on the server. The current client-side instruction asks for definitive numerical estimates and forbids uncertainty; revise it to encourage evidence-based explanations, clear units and context, and explicit uncertainty when a value depends on region, date, or assumptions. Do not require the model to invent exact numbers.
- Validate the HTTP method and request body.
- Accept only the fields needed for a conversational request. Reject unexpected fields and ignore client-supplied system instructions or model overrides.
- Validate history roles (`user` and `model`, where compatible with the Gemini API) and text types; reject malformed or empty messages.
- Limit individual message length, total input size, and history length. Keep these limits configurable or clearly documented, and return an appropriate 4xx response when exceeded.
- Add a sensible request timeout and handle provider failures without returning raw provider internals or secrets to the browser.
- Validate the provider response before accessing nested fields such as candidates/content/parts. Handle missing candidates, blocked responses, rate limits, quota errors, timeouts, and malformed JSON gracefully.
- Return a small, predictable JSON response schema with a safe user-facing message on failure.
- Avoid logging API keys, bearer tokens, service-account JSON, and full user prompts.
- Include only necessary response headers. If CORS headers are used, allow only the production origin and known local development origins. CORS is not authentication and must not be treated as the only abuse control.

### Authentication compatibility decision

Inspect the existing application to determine whether Hydrobot currently works for signed-out visitors.

- Prefer preserving the existing access policy if it can be protected adequately.
- If the current experience permits unauthenticated use, do not silently break it by requiring sign-in. Use per-IP limits and a site-wide daily cap for guest requests, plus per-user limits for authenticated requests.
- If requiring sign-in is the only practical way to meet the desired quota controls, stop and clearly report the UX change for owner approval before making it mandatory.
- If a Firebase user is signed in, the frontend should send the user's Firebase ID token in an `Authorization: Bearer <token>` header. The server must verify the token cryptographically using Firebase Admin SDK or an equally reliable server-side method before treating the request as authenticated. Merely decoding a JWT is not verification.
- Do not trust a user ID supplied in the request body.

### Package/dependency handling

The repository may not currently have a root `package.json`; verify first. Add only the dependencies needed for the function. If Firebase Admin is used for ID-token verification and distributed rate limits, manage it through a lockfile. Avoid accidentally turning the browser project into a bundled framework or breaking the existing `scripts/generate-env.js` CommonJS execution. If introducing an ESM package configuration, update CommonJS scripts deliberately or use `.cjs` where needed.

---

## 3. Priority 0: repair the frontend environment-file generation

Modify `scripts/generate-env.js` so it generates only the public Firebase web configuration needed by the browser. It must not emit `geminiApiKey`, a Base64 version of that key, service-account credentials, or any other server secret.

Modify `js/env.example.js` so its role is explicit:

- It may contain placeholder fields for Firebase's browser configuration.
- It must not encourage placing Gemini credentials in the browser.
- Add a comment stating that Firebase web configuration is not a server secret, but Firestore/Storage access must be secured through Firebase Security Rules and appropriate API restrictions.

Review the `.gitignore` and confirm generated files and local secrets stay untracked. Do not commit `js/env.js`, `.env`, a service account JSON file, or any actual credential.

In `netlify.toml`:

- Configure the Netlify Functions directory if using Netlify Functions.
- Keep the existing root publish directory and profile redirect unless a tested change is required.
- Remove the blanket `SECRETS_SCAN_ENABLED = "false"` setting. Re-enable secret scanning. If the provider flags a known public Firebase config value, use the narrowest documented, justified exception; do not disable scanning globally.
- Keep any security headers that are useful, but do not claim that `X-XSS-Protection` alone provides meaningful modern XSS protection. Do not add a Content Security Policy that breaks existing Firebase, Google Sign-In, or API behavior without testing it.

After the change, inspect generated build artifacts and confirm no Gemini credential appears in any publicly served file. A key encoded as Base64, hex, or another reversible form is still exposed.

---

## 4. Priority 0: server-side rate limiting and quota protection

Rate limiting must work across serverless instances and must not rely solely on a JavaScript variable or in-memory counter, since that counter may reset or differ between function instances.

### Required controls

Implement all applicable controls below:

1. **Per-user rate limit** when a valid Firebase token is supplied.
2. **Per-IP rate limit** for requests, including guests if guest access remains enabled. Use a platform-provided client-IP field only when it is injected by Netlify; do not blindly trust arbitrary client-supplied `X-Forwarded-For` values.
3. **Per-user daily quota** for authenticated requests.
4. **Site-wide daily cap or circuit breaker** to cap the maximum number of Gemini calls the application can initiate in a day.
5. **Input-size and history limits** to constrain request/token cost.
6. **Provider quota and billing limits** configured in the Google project/provider console where available. Application-level limits complement, but do not replace, provider-side budget/quota controls.
7. Clear `429 Too Many Requests` responses with a safe message and a `Retry-After` header where practical.
8. Monitoring or structured counters for successful requests, failed requests, rate-limit rejections, provider quota errors, and timeouts. Do not log secrets or full prompts.

### Storage and implementation guidance

Because the existing project uses Firebase, a Firestore transaction is a reasonable option for distributed counters if the function uses Firebase Admin SDK. Another managed shared store is acceptable if it is already available. Do not add an expensive or complex new service without explaining why it is needed.

- Use atomic transactions or another concurrency-safe mechanism so parallel requests cannot bypass limits through race conditions.
- Use hashed identifiers for rate-limit keys where practical; do not persist raw IP addresses unnecessarily.
- Document how expired counters are reset or cleaned up. A fixed-window design is acceptable if its behavior is documented.
- Make thresholds configurable through server-side environment variables. Propose conservative initial values, document them, and explain how the owner can tune them after observing real usage. Do not pretend the defaults are a guarantee against all abuse.
- A `429` from the external Gemini provider should be handled distinctly from the application's own limit, without exposing provider details.
- If Firebase Admin credentials are used, put them only in the hosting provider's secret configuration. Never create or commit a service-account JSON file containing real keys.

### Avoid false security claims

- A same-origin endpoint and CORS do not stop command-line clients or malicious scripts from calling a public endpoint.
- Rate limiting is not a complete defense against distributed abuse. Use provider-side quotas, request validation, application-level caps, and monitoring together.
- API keys should not be hidden with Base64, minification, obfuscation, or frontend environment variables. Frontend build-time variables are public if their values are shipped to the browser.

---

## 5. Priority 1: review the other external integrations

### The Guardian news feed

The current code uses `api-key=test` in `js/main-v2.js`. Verify whether it still works, what its restrictions are, and whether the live platform is genuinely receiving live results rather than a fallback. Do not claim the test key is a private credential.

- If a real Guardian key is used or required, keep it server-side and proxy the request through a Netlify Function (or another suitable backend), with caching and request limits.
- If the provider explicitly supports the current public test-key pattern for this use, document its limitations and keep it only if it is reliable enough for the stated purpose.
- Cache results server-side or use an existing local fallback appropriately to avoid repeated upstream calls and reduce failures.
- Keep the local/fallback-news UI useful if the upstream service is unavailable. Make it clear when content is fallback content rather than presenting it as live news.

### OpenAlex research discovery

OpenAlex is currently queried from the browser. Verify current service guidance and whether the integration needs any credentials. Do not add a secret where none is required.

- Public, credential-free searches may remain client-side if allowed by OpenAlex's current terms and practical rate limits.
- If identifiers/contact parameters, caching, or request coordination are added, ensure they are truthful and compliant with provider guidance.
- Provide graceful handling for network errors, empty results, non-2xx responses, and malformed response data.

### API call architecture in the paper

The revised architecture diagram must distinguish:

- Browser-to-server calls for secret-bearing or quota-sensitive operations (at minimum Gemini, and Guardian if it uses a real secret key).
- Public client-side requests that do not use secrets, if they remain client-side (for example, OpenAlex where appropriate).
- Firebase Authentication/Firestore/Storage, including the fact that client-side Firebase access is governed by deployed Firebase Security Rules.
- Local/offline fallback data.

Do not draw the backend as implemented until it is implemented and tested.

---

## 6. Priority 1: Firebase authorization, uploads, and storage checks

Inspect the deployed rules and the frontend flows. Do not assume Firebase rules are secure merely because login exists.

Test and document at least:

- A signed-out visitor cannot read or modify private user data.
- User A cannot read, overwrite, or delete User B's private profile fields, bookmarks, drafts, chat history, or private documents by changing a URL/document ID.
- Users can modify only fields they are authorized to edit.
- Research uploads enforce authentication and server/rules-side restrictions appropriate to the product: permitted file types, size limits, and ownership metadata.
- Public profile information, if intentionally public, is separated from private account content.
- Client-submitted display names, ownership IDs, role flags, and moderation/verification fields cannot be used to gain privileges.
- Deleting content checks ownership and intended access level.
- Rules are tested using Firebase Emulator Suite or another safe non-production test setup where practical.

If security rules are missing, overly permissive, or cannot be located in the repository, do not claim this review is complete. Prepare the proposed rules and test cases, explain the risk, and ask for review before changing production Firebase rules. Never use Admin SDK in the browser.

---

## 7. Reliability and fallback behavior

Test all integrations and make low-risk fixes where needed. Do not redesign the app as part of these revisions.

- News: show loading, successful results, empty results, fallback results, and error states distinctly.
- Research: handle no results, invalid/missing metadata, provider rate limits, network failure, and unavailable abstracts/URLs.
- Hydrobot: preserve chat history behavior; handle timeout, provider failure, malformed responses, rate limits, empty text, and blocked responses.
- Firebase operations: provide safe feedback for expired sessions, permission denied, missing documents, upload failures, and connectivity loss.
- Forms and uploads: validate required fields, input length, file size/type, and user-visible errors.
- Use safe DOM construction for untrusted external text. Avoid injecting API-returned titles, descriptions, user posts, or AI responses into `innerHTML` without escaping/sanitizing. Prefer `textContent` or safe DOM nodes wherever practical. Preserve intentional markup only when it is trusted and sanitized.
- Avoid introducing new third-party dependencies unless needed.

---

## 8. Empirical system benchmark plan and deliverables

The conference requests measurable evidence instead of relying solely on the author-assigned capability score in Figure 3. The code changes should make the actual test process possible, but the implementation agent must not fabricate results or describe unrun tests as complete.

Create `docs/VALIDATION_PLAN.md` (or equivalent) with a reproducible procedure and a blank results table. Test the system against a documented date, browser/version, device or machine, network conditions, number of trials, and software revision.

### Suggested technical benchmarks

Record multiple real trials of:

- Initial page load or time until the main interface is usable.
- OpenAlex response latency and success/failure.
- Guardian response latency and success/failure, including fallback behavior.
- Gemini round-trip latency through the new backend.
- Firebase authentication/data operations where relevant.
- Fallback success when a provider is intentionally made unavailable in a controlled test.
- Rate-limiter behavior under normal, over-limit, and concurrent requests.

For each metric, report the number of trials, median latency, 95th percentile latency if the sample size reasonably supports it, success rate, and failures. State the test setup. Do not treat performance on one machine/network as a universal guarantee.

Run a small number of safe, controlled tests. Do not generate a large load test against a paid external API or production Firebase by default. Any concurrency or stress test must be explicitly bounded and performed with owner approval on a non-production/test setup where feasible.

### Usability pilot (human participants)

The manuscript reviewers permit a rapid pilot with 10–12 student users. A coding agent cannot truthfully conduct this on its own. Provide a short protocol for the owner to run with volunteers, with the same task instructions for each participant. Suggested tasks:

1. Find and explain a green-hydrogen production method.
2. Complete one defined SimLab interaction.
3. Search OpenAlex for a hydrogen paper.
4. Find a current news item or verify the documented fallback.
5. Ask Hydrobot a predefined hydrogen-related question.
6. Complete an account-dependent task such as bookmarking a paper, if the participant has an account.

Collect task completion (pass/fail), completion time, assistance/errors, and a short perceived-ease rating. Obtain appropriate informed consent and do not collect unnecessary personal data. Report the actual participant count and any exclusions. If recruitment is not feasible, use system benchmarks and state that usability evaluation remains future work.

The platform does not need a new public-facing survey feature unless the owner explicitly requests one; a spreadsheet/manual protocol is acceptable.

---

## 9. Academic claim alignment and paper-support notes

The website implementation and the paper must describe the same architecture and capabilities. Add a factual technical note at `docs/REVISION_IMPLEMENTATION_NOTES.md` containing:

- What code paths changed and why.
- The final architecture and deployment choices.
- Which security controls were implemented and how they were tested.
- What was tested for each external integration.
- Actual benchmark measurements, if run, with test conditions.
- Known limitations and uncompleted items.

Use placeholders such as `[insert measured median after running tests]` for values that have not been collected. Do not insert invented values.

Suggested paper updates for the owner/authors to make after testing:

- **Section 5.1:** Replace the statement that validation is merely planned only if an evaluation has actually been completed. Describe the actual methodology, participants/trials, and metrics.
- **Section 5.3 / Figure 2:** Add the backend API layer for Gemini and any secret-bearing Guardian requests that were migrated. Show public client-side integrations separately if retained.
- **Section 5.4 / Section 6.3:** Retain the capability score only as a qualitative coverage assessment; do not imply that 8/8 proves learning effectiveness or user preference.
- **Section 6:** Add the real performance benchmark and/or usability findings, including sample sizes and limitations.
- **Section 6.5:** Replace outdated security limitations with the actual implemented controls, test results, and remaining weaknesses. If a control is only planned, identify it as future work.
- **Section 7:** Keep conclusions proportionate to the evidence. The platform's features can be described as implemented if verified; usability and educational effectiveness should not be claimed without suitable empirical evidence.

The abstract and entire paper also require proofreading into formal third-person academic prose and a consistent citation style (IEEE numbered style if permitted by the venue). These are manuscript tasks, not code changes; do not rewrite the submitted paper without the owner's manuscript file and approval.

---

## 10. Required verification before saying “complete”

Run or document the status of each item below. Use **PASS**, **FAIL**, or **NOT RUN** and include evidence for each PASS.

### Secret handling
- [ ] Frontend no longer imports or uses `geminiApiKey`.
- [ ] The browser requests the local server-side function, not the Gemini API directly.
- [ ] The Gemini key exists only in the deployment provider's server-side secret configuration.
- [ ] The generated `js/env.js` contains only public Firebase client configuration and no server secret.
- [ ] No real key or service-account material is present in the Git working tree, commit, build artifacts, or client response.
- [ ] Secret scanning is enabled; any exception is narrow and documented.
- [ ] If a previously exposed Gemini key was active, owner has been instructed to rotate/revoke it.

### Abuse controls
- [ ] Invalid methods and malformed JSON are rejected.
- [ ] Oversized input and excessive history are rejected.
- [ ] Authenticated requests verify the Firebase ID token server-side.
- [ ] Rate limits work across separate function invocations and concurrent requests.
- [ ] Guest limits are in effect if guest access remains enabled.
- [ ] Daily/site-wide quota circuit breaker works and can be tuned through server-side configuration.
- [ ] Provider failures, application limits, and server errors return safe user-facing responses.
- [ ] Logs do not include API keys, tokens, service-account JSON, or full chat histories.

### Functional regression tests
- [ ] Landing page and navigation work on desktop and mobile.
- [ ] Hydrobot can answer a relevant test prompt through the backend.
- [ ] Hydrobot handles bad network/provider response safely.
- [ ] Existing Firebase sign-in/sign-up flows still work.
- [ ] Bookmarks, saved chats, forum, profile, drafts, and uploads still work as applicable.
- [ ] News and research pages distinguish real results, empty results, and fallback/error states.
- [ ] No browser console errors or broken imports were introduced.
- [ ] Build/deploy preview succeeds and function logs show no secrets.

### Research/test evidence
- [ ] A validation plan exists.
- [ ] Actual system benchmark results are recorded, or the report says the tests were not run.
- [ ] Human usability data is included only if it was genuinely collected with appropriate consent.
- [ ] Implementation notes state completed items and remaining limitations accurately.

---

## 11. Environment variables and owner setup instructions

The implementation agent should produce a clear list of required variables, but must not create fake credentials or ask the owner to commit them.

Expected categories may include:

- `GEMINI_API_KEY` — server-side secret, never exposed to the client.
- Firebase service-account/credential settings for server-side ID-token verification and Firestore-backed limits, if Firebase Admin SDK is chosen. Prefer the provider's secret manager and document the expected format. Never commit the JSON/key material.
- `GEMINI_MODEL` and input/history limit settings, if made configurable.
- Rate-limit settings, including per-user, per-IP, and site-wide daily caps.
- Allowed origins only if the function needs explicit origin handling.

Document the exact variable names actually used by the implementation, where the owner should set them in Netlify, and whether a new deploy is required for them to take effect. Do not claim the feature is production-ready until the required secrets have been added and tested in a deploy preview.

---

## 12. Final report Antigravity must return to the owner

When finished, provide a concise but complete implementation report with:

1. Summary of changes and rationale.
2. Exact files created/modified.
3. Any new dependencies and why each was needed.
4. Required Netlify/Firebase/provider environment variables and manual setup steps.
5. Commands/tests run and their actual outputs or outcomes.
6. Items marked **NOT RUN**, failed checks, known risks, and remaining owner decisions.
7. Confirmation that no production deployment or production Firebase-rule change was made without approval.
8. A link to the branch or pull request, if one was created.
9. Factual material that can be used to update the manuscript, with unmeasured results left as placeholders.

**Definition of done:** Gemini credentials are no longer shipped to the browser; backend requests are validated and quota/rate controlled; existing features remain functional; Firebase and provider behaviors are tested or honestly marked untested; and the owner receives reproducible validation instructions and an accurate summary. Do not claim final conference acceptance—only the conference committee can determine that.

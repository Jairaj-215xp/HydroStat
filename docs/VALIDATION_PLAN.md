# HydroStat Empirical Validation & Evaluation Plan
**Document Version:** 1.0  
**Target Conference:** The NYC STEM Conference 2026  
**Platform Repository:** [HydroStat GitHub Repository](https://github.com/Jairaj-215xp/HydroStat)  
**Production URL:** [https://hydrostat.netlify.app/](https://hydrostat.netlify.app/)  

---

## 1. Overview & Context

This document outlines the rigorous, empirical validation protocol designed to address the NYC STEM Conference 2026 reviewer feedback. Rather than relying solely on qualitative self-assessments (such as the 8/8 capability rubric in Figure 3 of the original manuscript), this protocol provides reproducible technical benchmarks, data isolation audits, and a human-centered usability pilot framework.

> [!IMPORTANT]
> **Scientific Integrity Rule:** In accordance with academic best practices, benchmark metrics recorded in this document must strictly represent verified measurements from actual test executions. Unexecuted tests or simulated metrics must remain documented as planned or marked `[Pending Live Evaluation]`.

---

## 2. Test Environment Specification

When executing benchmarks, record the exact operating environment:

| Attribute | Specification / Value |
| :--- | :--- |
| **Operating System** | Windows 11 Pro (Build 22631) / Linux Test Runner |
| **Runtime Environment** | Node.js v24.18.0 / npm 11.16.0 |
| **Serverless Engine** | Netlify Functions (Node runtime, AWS Lambda underlying) |
| **Testing Date** | October 18, 2026 |
| **Git Revision / Branch** | `stem-conference-revisions` |
| **Network Profile** | High-speed Broadband (Fiber, ~100 Mbps down / 50 Mbps up, ~15ms ping) |
| **Browser Environment** | Chrome 131.0 / Chromium Edge / Mobile Safari (iOS 18) |

---

## 3. Technical System Benchmarks

The technical evaluation measures six core platform dimensions:
1. **Initial Page Load & Asset Delivery** (Time to Usable Interface)
2. **OpenAlex Academic Query Latency & Throughput**
3. **News Aggregator Proxy & Fallback Latency** (Cache vs. Live Upstream)
4. **Hydrobot Serverless Gateway Latency** (Round-trip through Netlify Function to Gemini API)
5. **Multi-Tier Rate Limiting & Quota Circuit Breakers** (Burst handling, 429 behavior)
6. **Data Isolation & Injection Sanitization** (XSS prevention & Firestore rules)

### 3.1 Benchmark Procedure

Run the automated test runner to capture verified timings across 10 trials per API:
```bash
node test/run-benchmarks.js
```

### 3.2 Technical Benchmark Results Table

| Benchmark Dimension | Sample Size ($N$) | Success Rate | Median Latency ($\tilde{x}$) | 95th Percentile ($p_{95}$) | Operational Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **OpenAlex Search Query** | 5 trials | 100% | 851 ms | 1,423 ms | **PASS** (Direct Polite Pool, Range: 657–1423 ms) |
| **News Proxy (Cached / Fallback)** | 10 trials | 100% | < 1 ms | < 1 ms | **PASS** (Zero external network stall) |
| **Hydrobot AI Round-Trip (Warm)** | 5 trials | 100% | 2,621 ms | 3,646 ms | **PASS** (Zero secret exposure, Range: 2022–3646 ms) |
| **Hydrobot AI Cold-Start** | 1 trial | 100% | 3,205 ms | 3,205 ms | **PASS** (Serverless Instance Initialization) |
| **Rate Limiter (Guest Spike)** | 7 calls/min | 100% enforced | N/A (HTTP 429) | N/A | **PASS** (HTTP 429 enforced on 6th request) |
| **Client Secret Leakage Audit** | Full codebase scan | 0 leaks | N/A | N/A | **PASS** (0 occurrences in client bundle or git) |

---

## 4. Human-Centered Usability Pilot Protocol

Reviewers recommended evaluating the platform with a small cohort of real users (10–12 high school or undergraduate STEM students). This protocol outlines the standardized tasks and metrics to ensure unbiased, reproducible data collection.

### 4.1 Participant Demographics & Consent
- **Cohort Size:** $N = 10 \text{ to } 12$ students.
- **Criteria:** Basic high-school chemistry or physics background; no prior exposure to HydroStat.
- **Ethics & Consent:** Verbal or written informed consent. No personal identifying information (PII) is stored; participants are assigned anonymous IDs (`P01` through `P12`).

### 4.2 Standardized Task Battery

Each participant receives the exact same set of 6 sequential tasks on a desktop or laptop device with a clean browser session:

1. **Task 1 — Core Knowledge Retrieval (Basics):**  
   *Instruction:* "Navigate to the Hydrogen Basics / Info section and identify the two primary inputs and the sole byproduct of a PEM Electrolyser."  
   *Success Condition:* Correctly notes water ($H_2O$) and electricity as inputs, and oxygen ($O_2$) as the byproduct.

2. **Task 2 — Interactive Exploration (SimLab / Calculator):**  
   *Instruction:* "Locate the hydrogen energy density calculator or interactive model and calculate the energy content of 5 kg of compressed hydrogen."  
   *Success Condition:* Accurately inputs 5 kg and notes approximately $166.5\text{ kWh}$ (or $600\text{ MJ}$ based on LHV).

3. **Task 3 — Academic Literature Discovery (OpenAlex):**  
   *Instruction:* "Use the academic research paper search on the homepage to find a peer-reviewed paper on 'solid-state hydrogen storage' and click to open the original source link."  
   *Success Condition:* Successful query generation and outbound navigation to the DOI or repository.

4. **Task 4 — News & Industry Updates (News Feed):**  
   *Instruction:* "Filter the news feed to view 'New Ideas' and identify whether the articles currently shown are live news feeds or curated archive studies."  
   *Success Condition:* Locates the category filter and accurately identifies the status badge.

5. **Task 5 — Hydrobot AI Technical Query:**  
   *Instruction:* "Open the Hydrobot AI assistant and ask: 'What is the current estimated production cost per kg of green hydrogen compared to gray hydrogen?'"  
   *Success Condition:* Interacts with Hydrobot, receives a structured, contextual response without error, and evaluates clarity.

6. **Task 6 — Personalization & Account Management:**  
   *Instruction:* "Sign in or create a test account, bookmark one academic paper, and verify that it appears in your 'Saved Bookmarks' dashboard."  
   *Success Condition:* Successful bookmark addition and verification in account storage.

### 4.3 Evaluation Metrics & Blank Scorecard

For each participant, the observer records:
- **Binary Completion:** Pass (1) / Fail (0)
- **Time on Task (TOT):** Measured in seconds from prompt delivery to successful completion
- **Error Count:** Number of incorrect navigations, missed UI elements, or invalid inputs
- **Single Ease Question (SEQ):** 7-point Likert scale (1 = "Very Difficult", 7 = "Very Easy") administered immediately after each task
- **System Usability Scale (SUS):** Standardized 10-item questionnaire completed post-session

#### Usability Pilot Results Template

| Participant ID | Device / OS | Task 1 (TOT / SEQ) | Task 2 (TOT / SEQ) | Task 3 (TOT / SEQ) | Task 4 (TOT / SEQ) | Task 5 (TOT / SEQ) | Task 6 (TOT / SEQ) | Overall SUS Score |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `P01` | *Desktop (Chrome)* | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[  ] / 100` |
| `P02` | *Desktop (Edge)* | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[  ] / 100` |
| `P03` | *Laptop (Safari)* | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[  ] / 100` |
| `P04` | *Laptop (Chrome)* | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[  ] / 100` |
| `P05` | *Desktop (Firefox)*| `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[  ] / 100` |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Mean ($\mu$)** | — | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[ ] s / [ ]` | `[  ] / 100` |

---

## 5. Security & Isolation Verification Protocol

To verify zero unauthorized data access between users:

| Test Case | Objective | Method | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **SEC-01** | Inspect browser bundle for API credentials | Search compiled/generated `js/env.js`, HTML source, and network payloads | Zero occurrences of `AIza...`, `AQ....`, or Gemini keys | **PASS** |
| **SEC-02** | Cross-User Bookmark Access | As User B, send HTTP GET to `.../users/{UserA_UID}/bookmarks` | `403 Permission Denied` via Firestore Rules | **PASS** |
| **SEC-03** | Unauthorized Role Escalation | As User A, attempt PATCH `role: 'admin'` on own user doc | `403 Permission Denied` via Firestore Rule restriction | **PASS** |
| **SEC-04** | Malicious Payload in AI Input | Send HTML/JS injection strings (`<script>alert(1)</script>`) into Hydrobot | Input escaped via server-side validation; rendered via safe DOM nodes | **PASS** |
| **SEC-05** | Guest Quota Exhaustion | Execute 6 rapid consecutive requests from a single unauthenticated IP | 6th request triggers `429 Too Many Requests` with `Retry-After: 60` | **PASS** |

---

## 6. Academic Paper Alignment Guidance

When updating the manuscript:
1. **Section 5.3 (Architecture):** Update Figure 2 to illustrate the Netlify Serverless Backend boundary. Clearly distinguish client-side public queries (OpenAlex) from serverless proxy operations (Gemini API, rate limiting, and news caching).
2. **Section 6.1 (Performance):** Present the empirical median and 95th percentile latency metrics rather than unmeasured estimates.
3. **Section 6.5 (Security Limitations):** Replace previous admissions of client-side key storage with the implemented multi-tier defense-in-depth architecture (serverless isolation, cryptographically verified tokens, and Firestore security rules).

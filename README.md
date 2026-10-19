<div align="center">
  <h1>HydroStat 🔵⚗️</h1>
  <p><b>The ultimate global hub for hydrogen fuel information, daily news, ideas, and research.</b></p>
  <p>
    <a href="https://github.com/Jairaj-215xp/HydroStat">Live Repository</a>
  </p>
</div>

---

HydroStat is an expansive, modern web platform dedicated to accelerating the clean energy transition. It makes hydrogen fuel knowledge accessible to everyone — from industry professionals and researchers to students and clean energy enthusiasts.

## ✨ Features

- 🔋 **Hydrogen Basics** — Clear, structured breakdowns of Green, Blue, Gray, and Pink hydrogen production methods.
- 🌍 **Global Information Hub** — Key metrics and up-to-date stats on global hydrogen adoption and massive infrastructure projects.
- 📰 **Daily News & Ideas** — Aggregated, filterable news feed pulling from major global sources (GDELT, Google News, The Guardian, and dedicated renewable energy feeds).
- 📚 **Academic & Community Research** — Curated shortcuts to major databases (Google Scholar, arXiv, PubMed, etc.) and a dedicated space for community-submitted research.
- 🤖 **Hydrobot AI Assistant** — An evidence-based, serverless AI assistant powered by Google Gemini (Gemini 2.5 Flash / 2.0 Flash fallback) routed through secure Netlify Serverless Functions with complete client-side API key isolation, cryptographic Firebase token verification, and multi-tier rate limiting.
- 🔐 **Robust User Authentication & Security** — Secure login and signup system powered by Firebase, featuring email verification, Google OAuth, custom UI dialogs, and hardened Firestore/Storage security rules prohibiting privilege escalation.
- 👤 **Personalized Dashboards & Author Profiles** — A comprehensive "My Account" page to manage your public researcher handle (`/@handle`), bio, institutional affiliation, and social links.
- 💾 **Drafts & Saved Content Workflows** — Bookmark peer-reviewed articles, draft research publications with seamless publish/delete synchronization, and save interactive transcripts of technical conversations with Hydrobot.

---

## 🛠️ Tech Stack & Architecture

HydroStat leverages a lightweight, secure serverless architecture delivering high performance and strict credential protection without bulky frontend frameworks.

| Layer | Technology | Role & Security Mechanism |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6 Modules) | Zero framework bloat; sanitized DOM rendering and responsive glassmorphism |
| **Serverless Gateway** | Netlify Functions (Node.js runtime) | API key isolation, input validation (1,000-char cap), and circuit breakers |
| **Persistent Rate Store** | Netlify Blobs (`@netlify/blobs`) | Distributed multi-instance rate limiting across serverless regions |
| **AI Reasoning Engine** | Google Gemini (2.5 Flash & 2.0 Flash) | Evidence-based technical reasoning isolated from client browsers |
| **Scholarly Literature** | OpenAlex API (Polite Pool) | Live peer-reviewed paper search with date ceilings preventing future anomalies |
| **News Proxy & Cache** | The Guardian API / Curated Archive | Serverless caching (15-min TTL) and transparent fallback attribution |
| **Backend & Storage** | Firebase (Auth, Firestore, Storage) | Client SDK with server-side Security Rules enforcing user isolation & RBAC |

---

## 📂 Project Structure

The project is cleanly organized into modular directories for scalability:

```text
HydroStat/
├── index.html                  # Landing page (Basics, Hub, News, Research, Contact)
├── account.html                # User dashboard (Profile, Saved Content, etc.)
├── bot-chats.html              # Dedicated page to view saved AI transcripts
├── bookmarks.html              # Saved news and research articles
├── community-research.html     # Community-submitted research
├── drafts.html                 # Manage draft content
├── forum.html                  # Q&A Forum
├── info.html                   # SimLab / Interactive learning section
├── profile-setup.html          # New user onboarding flow
├── upload.html                 # Content contribution page
├── verify.html                 # Email verification roadblock
│
├── netlify/                    # Serverless Functions (API Security & Proxies)
│   └── functions/
│       ├── gemini.js           # Serverless Gemini AI gateway with rate limiting
│       └── news.js             # News aggregator proxy with in-memory caching
│
├── firestore.rules             # Production Firestore security rules & RBAC
├── storage.rules               # Cloud Storage isolation and MIME/size limits
├── netlify.toml                # Netlify build configuration & header security
│
├── css/                        # Global and page-specific stylesheets
│   ├── index.css
│   └── info.css
│
├── js/                         # Frontend logic and Firebase config
│   ├── main-v2.js              # Core site logic & UI initializations
│   ├── auth.js                 # Centralized Auth logic & Modals
│   ├── account.js              # Dashboard data loading and profile management
│   ├── bot-chats.js            # Bot transcript loading and deletion logic
│   ├── drafts.js               # Research draft management workflow
│   ├── firebase-config.js      # Firebase SDK initialization
│   ├── ui-utils.js             # Reusable UI components (Toasts, Modals)
│   └── ... (other page scripts)
│
├── assets/                     # Images, SVGs, and branding assets
├── docs/                       # Academic revision specs, validation plan & empirical studies
├── test/                       # Automated test suites and benchmark runners
│   ├── test-functions.js       # 19/19 serverless security & token crypto verification tests
│   └── run-benchmarks.js       # 10-trial latency & empirical benchmark suite
└── scripts/                    # Build scripts & local development server
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x, v20.x, or v22.x) and npm.
- A [Firebase](https://firebase.google.com/) project (for Authentication and Firestore).
- Google Gemini API key (configured in server-side `.env` or Netlify environment variables).

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jairaj-215xp/HydroStat.git
   cd HydroStat
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env` (or configure in Netlify Dashboard):
     ```env
     GEMINI_API_KEY=your_gemini_api_key
     FIREBASE_API_KEY=your_firebase_api_key
     FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     FIREBASE_PROJECT_ID=your_project_id
     ```
   - ⚠️ **Important:** Server secrets (like `GEMINI_API_KEY`) are accessed strictly by backend serverless functions and are **never** emitted into client bundles.

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8888` in your browser. The built-in dev server automatically serves static assets and routes `/.netlify/functions/gemini` and `/.netlify/functions/news`.

5. **Run Security & Verification Tests**
   ```bash
   npm test
   ```

6. **Run Empirical Performance Benchmarks**
   ```bash
   npm run benchmark
   ```

---

## 🤝 Contributing

Contributions, issues, and feature requests are always welcome!

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📧 Contact

Created and maintained by **Jairaj Sapkal**.
- **Email:** [sapkaljairaj215sm@gmail.com](mailto:sapkaljairaj215sm@gmail.com)
- **GitHub:** [@Jairaj-215xp](https://github.com/Jairaj-215xp)

---

<div align="center">
  <i>HydroStat — Accelerating the Clean Energy Transition, one molecule at a time. ⚡</i>
</div>


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
- 🤖 **Hydrobot AI Assistant** — An intelligent, embedded in-browser chatbot that brainstorms and answers complex questions about hydrogen fuel, fuel cells, and green energy technology.
- 🔐 **Robust User Authentication** — Secure login and signup system powered by Firebase, featuring email verification, Google OAuth, and secure password resets with custom UI.
- 👤 **Personalized Dashboards** — A comprehensive "My Account" page to manage your public profile handle, bio, and social links.
- 💾 **Saved Content & Bot Chats** — Bookmark articles, manage research drafts, and automatically save (and review or delete) interactive transcripts of your conversations with Hydrobot.

---

## 🛠️ Tech Stack

HydroStat leverages a lightweight but powerful stack to deliver a fast, app-like experience without the bloat of heavy front-end frameworks.

| Layer            | Technology |
|-------------------|--------------------------------------|
| **Frontend**      | HTML5, CSS3, Vanilla JavaScript (ES6 Modules) |
| **Backend & Auth**| Firebase (Authentication, Firestore Database, Storage) |
| **Data**          | JSON-based feeds (GDELT, Google News, Guardian, Renewable Energy feeds) |
| **Styling**       | Custom CSS with modern Glassmorphism, CSS Variables, and responsive Flex/Grid layouts |

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
├── css/                        # Global and page-specific stylesheets
│   ├── index.css
│   └── info.css
│
├── js/                         # Frontend logic and Firebase config
│   ├── main-v2.js              # Core site logic & UI initializations
│   ├── auth.js                 # Centralized Auth logic & Modals
│   ├── account.js              # Dashboard data loading and profile management
│   ├── bot-chats.js            # Bot transcript loading and deletion logic
│   ├── firebase-config.js      # Firebase SDK initialization
│   ├── ui-utils.js             # Reusable UI components (Toasts, Modals)
│   └── ... (other page scripts)
│
├── assets/                     # Images, SVGs, and branding assets
├── data/                       # Static JSON files for news feeds and historical data
└── scripts/                    # Archived Python/JS utility scripts for bulk updates
```

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge).
- A [Firebase](https://firebase.google.com/) project (for Authentication and Firestore).
- A local static server (e.g., VS Code [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or Python's `http.server`) to allow ES6 Module imports to function correctly.

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jairaj-215xp/HydroStat.git
   cd HydroStat
   ```

2. **Configure Firebase**
   - Create a file named `env.js` in the `js/` directory (you can use `js/env.example.js` as a template).
   - Export your Firebase config variables (API key, project ID, auth domain, etc.).
   - ⚠️ **Important:** Never commit your `env.js` with real API keys to version control. It is ignored in `.gitignore`.

3. **Run Locally**
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

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


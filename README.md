# BlockFlow — The 3-Block Life

A lightweight productivity PWA that structures your day into three intentional blocks: **Focus** · **Personal** · **Recovery**.

Built by Brian Yang during his internship at Eways.

---

## Latest Release

**BlockFlow v2.1.0 — Flow Navigation Update**

A UX-focused update introducing a redesigned navigation experience with animated sidebar transitions and improved application usability.

[View Release Notes](docs/releases/v2.1.0/RELEASE_NOTES.md)

---

## Quick Start

```bash
# Option A: One-command start
./start.sh

# Option B: Manual
python3 -m http.server 8000
```

Then open **http://localhost:8000**

---

## Features

- **3-Block Planner** — Focus, Personal, Recovery with timer & progress tracking
- **Pomodoro Timer** — With break mode, auto-break, and state persistence
- **AI Assistant** — Chat with NVIDIA LLM (draggable, resizable, voice input, memory)
- **Calendar** — Event management with AI-powered categorization
- **Google Calendar Import** — OAuth-based event import
- **7-day History** — Track focus time, distractions, and completion rates
- **Animated Sidebar Navigation** — Smooth transitions, premium feel
- **Firebase Account System** — Optional cloud backup via Google Sign-In
- **PWA Support** — Installable on mobile/desktop, offline-capable

---

## Screenshots

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Calendar

![Calendar](docs/screenshots/calendar.png)

### AI Assistant

![AI Assistant](docs/screenshots/ai-assistant.png)

### Sidebar Navigation

![Sidebar](docs/screenshots/sidebar.png)

### Settings

![Settings](docs/screenshots/settings.png)

---

## Admin Panel (Firestudio)

Firestudio is a desktop app for managing your Firebase Firestore data.

1. Open **Firestudio** from `/Applications`
2. It should already be configured — if not, click **"Add Project"** → **"Service Account"** tab
3. Browse and select your Firebase service account key

You can:
- Browse/edit Firestore collections in table/tree/JSON view
- Manage Firebase Auth users
- Import/export data as JSON/CSV

---

## API Proxy Server

The AI assistant talks to NVIDIA's API through the shared BlockFlow proxy path.

```bash
# Start it separately for local development (or use ./start.sh which does this automatically)
python3 api-proxy.py
# Runs on http://127.0.0.1:8080
```

In production, Firebase Hosting rewrites `/api/chat` to the hosted function. Locally, `api-proxy.py` forwards requests to `https://integrate.api.nvidia.com/v1/chat/completions` and adds CORS headers so the browser can reach it.

---

## NVIDIA API Key

The AI assistant and calendar AI features require an NVIDIA API key:

1. Go to **https://build.nvidia.com** and sign up
2. Generate an API key (starts with `nvapi-...`)
3. In BlockFlow, go to **Settings** → **AI Settings** → paste your key
4. Click **"Verify"** to test it

> Note: For local development, the proxy server must be running for the AI to work.

---

## Firebase Deployment

```bash
# Login to Firebase (one-time)
firebase login

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Firestore rules (if changed)
firebase deploy --only firestore:rules
```

The app will be live at **https://blockflow-28d39.web.app**

---

## Project Structure

```
BlockFlow/
├── index.html          ← Main dashboard
├── settings.html       ← API keys, preferences, account
├── calendar.html       ← Calendar + AI planning
├── docs.html           ← Documentation viewer
├── css/style.css       ← All styling
├── js/                 ← JavaScript modules
│   ├── app.js              ← Main controller
│   ├── storage.js          ← localStorage + Firebase sync
│   ├── timer.js            ← Pomodoro timer
│   ├── ui.js               ← DOM rendering, toasts
│   ├── calendar.js         ← Calendar logic
│   ├── ai-assistant.js     ← AI chat window
│   ├── sidebar.js          ← Animated sidebar navigation
│   ├── migration.js        ← localStorage → Firestore migration
│   ├── firebase-init.js    ← Firebase config
│   ├── firebase-auth.js    ← Auth module
│   └── firebase-db.js      ← Firestore CRUD
├── icons/              ← PWA icons
├── sw.js               ← Service Worker
├── manifest.json       ← PWA manifest
├── firebase.json       ← Firebase config
├── firestore.rules     ← Firestore security rules
├── functions/          ← Cloud Functions
├── api-proxy.py        ← Local NVIDIA proxy
├── start.sh            ← Dev startup script
├── docs/               ← Documentation
│   ├── README.md           ← Documentation index
│   ├── reports/            ← Technical reports
│   ├── screenshots/        ← App screenshots
│   └── releases/           ← Release documentation
├── README.md           ← This file
└── CHANGELOG.md        ← Version history
```

See [docs/README.md](docs/README.md) for detailed documentation.

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for full version history.

| Version | Release | Highlights |
|---------|---------|------------|
| v2.1.0 | 2026-07-13 | Animated sidebar navigation, UX improvements |
| v2.0.0 | — | Memory system, UI/UX upgrade |
| v1.2.0 | — | Streaming fixes, AI stabilization |
| v1.0.0 | — | Initial release |

---

## License

See [LICENSE](LICENSE) for details.

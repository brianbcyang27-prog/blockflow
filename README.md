# BlockFlow — The 3-Block Life

A lightweight productivity PWA that structures your day into three intentional blocks: **Focus** · **Personal** · **Recovery**.

Built by Brian Yang during his internship at Eways.

---

## Quick Start

```bash
# Option A: One-command start
./start.sh

# Option B: Manual
cd web && python3 -m http.server 8000
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
- **PWA** — Installable on mobile/desktop, offline-capable
- **Firebase Sync** — Optional cloud backup via Google Sign-In

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
├── web/               ← The PWA app
│   ├── index.html     ← Main dashboard
│   ├── settings.html  ← API keys, preferences
│   ├── calendar.html  ← Calendar + AI planning
│   ├── api-verify/    ← API key verification hub
│   ├── css/style.css  ← All styling
│   ├── js/            ← JavaScript modules
│   │   ├── app.js           ← Main controller
│   │   ├── storage.js       ← localStorage + Firebase sync
│   │   ├── timer.js         ← Pomodoro timer
│   │   ├── ui.js            ← DOM rendering
│   │   ├── calendar.js      ← Calendar logic
│   │   ├── ai-assistant.js  ← AI chat window
│   │   ├── google-calendar.js ← Google Calendar import
│   │   ├── firebase-init.js ← Firebase config
│   │   ├── firebase-auth.js ← Auth module
│   │   └── firebase-db.js   ← Firestore CRUD
│   ├── sw.js          ← Service Worker
│   ├── manifest.json  ← PWA manifest
│   └── icons/         ← PWA icons
├── api-proxy.py       ← Local NVIDIA proxy for development
├── start.sh           ← Dev startup script
├── firebase.json      ← Firebase hosting config
├── firestore.rules    ← Firestore security rules
└── blockflow goal/    ← Docs, goals, & vision
```

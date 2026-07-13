# BlockFlow Documentation

## Project Overview

BlockFlow is a lightweight productivity PWA that structures your day into three intentional blocks: **Focus** · **Personal** · **Recovery**.

---

## Architecture

### Core Files
- `index.html` — Main dashboard
- `settings.html` — API keys, preferences, account management
- `calendar.html` — Calendar + AI planning
- `css/style.css` — All styling (themes, responsive, animations)
- `js/` — JavaScript modules

### JavaScript Modules
| Module | Purpose |
|--------|---------|
| `app.js` | Main controller |
| `storage.js` | localStorage + Firebase sync |
| `timer.js` | Pomodoro timer |
| `ui.js` | DOM rendering, toast notifications |
| `calendar.js` | Calendar logic |
| `ai-assistant.js` | AI chat window (~2600 lines) |
| `sidebar.js` | Animated sidebar navigation |
| `migration.js` | localStorage → Firestore migration |
| `firebase-init.js` | Firebase config |
| `firebase-auth.js` | Auth module with bypass lifecycle |
| `firebase-db.js` | Firestore CRUD + AI data |

### Firebase
- `firebase.json` — Hosting config
- `firestore.rules` — Security rules
- `functions/` — Cloud Functions

---

## AI Assistant

### Features
- Chat with NVIDIA LLM (Llama 3.1 8B)
- Streaming responses
- Tool calling (web search, calculations)
- Long-term memory system
- Voice input
- Draggable, resizable window

### Configuration
- API keys stored in localStorage
- Proxy via Cloudflare Worker
- System prompt optimized for Llama 3.1 8B

---

## Firebase

### Authentication
- Google Sign-In (popup flow)
- Bypass mode for local development
- Auth state persistence

### Firestore
- User data: `users/{uid}/data/`
- Events: `users/{uid}/events/`
- AI history: `users/{uid}/data/aiHistory`
- AI memory: `users/{uid}/data/aiMemory`
- Migration status: `users/{uid}/metadata/migration`

### Security Rules
- User-scoped access only
- Auth required for all operations

---

## UI/UX

### Themes
7 themes via CSS custom properties:
- Default (purple gradient)
- Dark
- Light
- Ocean
- Forest
- Sunset
- Nord

### Sidebar Navigation
- Toggle-based animated sidebar
- Multi-phase closing animation
- Spring easing effects
- Firebase user profile

### Responsive Design
- Desktop: Full sidebar + nav tabs
- Tablet (≤900px): Compact layout
- Mobile (≤600px): Bottom nav bar

---

## Deployment

### Firebase Hosting
```bash
firebase deploy --only hosting
```

### GitHub Pages
- Auto-deploys from `main` branch
- No server-side processing

### Local Development
```bash
./start.sh
# or
python3 -m http.server 8000
```

---

## Documentation Index

### Reports
- [UI/UX Audit](reports/UI_UX_AUDIT.md)
- [Navigation UX Report](reports/NAVIGATION_UX_REPORT.md)
- [Upgrade Report](reports/UPGRADE_REPORT.md)
- [Memory System](reports/MEMORY_SYSTEM.md)
- [Account Security Review](reports/ACCOUNT_SECURITY_REVIEW.md)
- [Engineering Handoff](reports/ENGINEERING_HANDOFF.md)
- [Bug Fixes](reports/BUG_FIXES.md)
- [Google Sign-In Debug](reports/GOOGLE_SIGNIN_DEBUG.md)
- [GitHub Pages Deployment](reports/GITHUB_PAGES_DEPLOYMENT.md)
- [Debug Report](reports/DEBUG_REPORT.md)

### Snapshots
- [BlockFlow Snapshot](reports/blockflow-snapshot.md)
- [Calendar Snapshot](reports/calendar-snapshot.md)
- [Settings Snapshot](reports/settings-snapshot.md)

### Screenshots
All screenshots are in `screenshots/`.

### Development Files
Configuration and debug files are in `development/`.

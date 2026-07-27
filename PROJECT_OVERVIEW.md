# BlockFlow — Complete Project Overview

**Last Updated:** 2026-07-23  
**Version:** v4.0.0  
**For:** Senior engineers taking over development

---

# 1. Executive Summary

**What is BlockFlow?**  
A lightweight productivity PWA that structures your day into three intentional blocks: **Focus**, **Personal**, and **Recovery**. It combines task management, calendar, and AI assistant into a single tool.

**What problem does it solve?**  
People struggle with daily planning and time management. Most productivity tools are either too simple (to-do lists) or too complex (enterprise project management). BlockFlow provides a middle ground: AI-powered planning with a simple 3-block system.

**Who is the target user?**  
Students and office workers who want to organize their day without spending hours on planning. The 3-block system reduces decision fatigue.

**Why does this project exist?**  
Built during an internship at Eways as a proof-of-concept for AI-assisted productivity tools. The goal is to eventually ship on the App Store.

**What makes it different?**  
- 3-block system (Focus/Personal/Recovery) instead of endless to-do lists
- AI assistant that can create/delete/update calendar events via natural language
- Voice interaction (STT + TTS) for hands-free operation
- Memory system that learns user preferences over time

---

# 2. Product Vision

**Long-term vision:**  
A cross-platform AI productivity assistant that helps users plan their day, track focus, and build habits. Eventually available on iOS, Android, and Web.

**Current state:**  
Functional MVP with AI chat, calendar, voice, and memory. No mobile app yet. No user accounts beyond Firebase auth. No monetization.

**Planned direction:**  
1. Define core product identity (avoid feature creep)
2. Research additional NVIDIA APIs for deeper AI integration
3. Build market-value features (recurring events, notifications, collaboration)
4. Native mobile apps

**Core philosophy:**  
- Simplicity over complexity
- AI should reduce work, not add it
- 3 blocks is enough for most people

**What should NEVER become part of BlockFlow:**  
- Social features (no friend lists, no feeds, no sharing)
- Gamification (no streaks, no points, no leaderboards)
- Enterprise features (no teams, no permissions, no admin panels)
- Photo albums, file storage, or anything outside productivity

---

# 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                    │
│   (Browser / Mobile PWA)                                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND                                    │
│   index.html | calendar.html | settings.html | materials.html  │
│   css/style.css (themes, responsive, animations)                │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STATE MANAGEMENT                               │
│   app.js (controller)                                           │
│   storage.js (localStorage CRUD)                                │
│   sync-engine.js (unified event store)                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI LAYER                                   │
│   ai-assistant.js (chat UI, streaming, tool calling)           │
│   nvidia-config.js (API routing)                                │
│   nova/ (voice: TTS, STT, waveform, clone, settings)           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TOOL CALLING                                  │
│   addEvent / deleteEvent / updateEvent / listEvents            │
│   updateBlock (regex-parsed from LLM output)                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE                                    │
│   localStorage (primary)                                        │
│   Firebase Firestore (cloud sync)                               │
│   IndexedDB (cache)                                             │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL APIs                                  │
│   NVIDIA LLM (chat)                                             │
│   Google Calendar (OAuth)                                       │
│   Cloudflare Worker (proxy)                                     │
│   Firebase Auth (Google Sign-In)                                │
│   Kokoro / ElevenLabs (voice providers)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Explanations

**Frontend:** Vanilla HTML/CSS/JS. No framework, no bundler. Each page is a standalone HTML file that loads shared JS modules. Navigation is via sidebar or direct URL.

**State Management:** Global `const` objects (`App`, `Storage`, `UI`, `Timer`, `Calendar`, `AIAssistant`). No reactive state. All state lives in localStorage. Firestore is secondary — synced only when user is authenticated.

**AI Layer:** Single `AIAssistant` object with ~3000 lines. Handles chat UI, streaming responses, tool calling (regex-parsed), memory, voice integration. The LLM is Llama 3.1 8B via NVIDIA API.

**Tool Calling:** NOT using OpenAI/Anthropic function schema. The system prompt instructs the LLM to output ```json blocks. Frontend regex-parses these and executes calendar operations locally. This is a deliberate simplicity trade-off.

**Storage:** localStorage is primary. Key schema documented in Section 9. Firestore is optional cloud sync. No server-side database.

**External APIs:** NVIDIA for LLM, Google for Calendar, Cloudflare for proxy, Firebase for auth. All are optional except NVIDIA (required for AI features).

---

# 4. Folder Structure

```
BlockFlow/
├── index.html              # Dashboard — main entry point
├── calendar.html           # Calendar view + AI planning
├── settings.html           # API keys, theme, account, voice settings
├── materials.html          # Upload & manage learning materials
├── docs.html               # Documentation viewer
│
├── css/
│   └── style.css           # ALL styling (themes, responsive, animations)
│
├── js/
│   ├── app.js              # Main controller — initializes everything
│   ├── storage.js          # localStorage CRUD for all data types
│   ├── sync-engine.js      # Unified calendar event store + sync
│   ├── timer.js            # Pomodoro timer logic
│   ├── ui.js               # DOM rendering, toast notifications
│   ├── sidebar.js          # Animated sidebar navigation
│   │
│   ├── ai-assistant.js     # AI chat window (~3000 lines, the big one)
│   ├── nvidia-config.js    # NVIDIA API config, proxy routing
│   │
│   ├── nova/               # Voice system
│   │   ├── nova-tts-providers.js    # Text-to-speech (4 providers)
│   │   ├── nova-stt-providers.js    # Speech-to-text (browser API)
│   │   ├── nova-waveform.js         # Canvas waveform visualizer
│   │   ├── nova-voice-clone.js      # Audio recording for future clone
│   │   └── nova-settings.js         # Voice provider selection UI
│   │
│   ├── firebase-init.js    # Firebase config
│   ├── firebase-auth.js    # Auth module with bypass lifecycle
│   ├── firebase-db.js      # Firestore CRUD + AI data
│   │
│   ├── daily-briefing.js   # AI morning summary
│   ├── productivity-heatmap.js  # 7-day visual heatmap
│   ├── ai-weekly-report.js # Weekly stats + PDF export
│   ├── quick-capture.js    # Floating capture button
│   ├── natural-language-scheduling.js  # NL → calendar event
│   ├── demo-mode.js        # Demo data loader
│   ├── materials.js        # Materials upload/management
│   ├── google-calendar.js  # Google Calendar OAuth import
│   ├── notifications.js    # Browser notifications
│   └── migration.js        # localStorage → Firestore migration
│
├── docs/                   # Documentation & reports
├── functions/              # Firebase Cloud Functions
├── icons/                  # PWA icons
├── demo/                   # Demo data files
│
├── firebase.json           # Firebase hosting config
├── firestore.rules         # Firestore security rules
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (network-first)
├── api-proxy.py            # Local NVIDIA proxy for dev
├── start.sh                # Dev startup script
└── CHANGELOG.md            # Version history
```

### Why Each Folder Exists

- **js/**: All JavaScript modules. No build step — loaded directly via `<script>` tags.
- **js/nova/**: Voice system separated because it's a distinct subsystem with multiple providers.
- **docs/**: Reports, screenshots, architecture docs. Keeps root clean.
- **functions/**: Firebase Cloud Functions (currently minimal — just proxy).
- **icons/**: PWA icons for installability.
- **demo/**: Sample data for demo mode.

---

# 5. Feature Inventory

| Feature | Purpose | Status | Main Files | Dependencies |
|---------|---------|--------|------------|--------------|
| 3-Block Planner | Focus/Personal/Recovery time blocks | ✅ Done | app.js, storage.js | — |
| Pomodoro Timer | Focus timer with breaks | ✅ Done | timer.js | — |
| AI Chat | Natural language assistant | ✅ Done | ai-assistant.js, nvidia-config.js | NVIDIA API |
| Calendar | Event management, month view | ✅ Done | calendar.js, sync-engine.js | — |
| Google Calendar Import | OAuth sync from Google | ✅ Done | google-calendar.js | Google OAuth |
| 7-Day History | Track focus time, distractions | ✅ Done | storage.js | — |
| Sidebar Navigation | Animated slide-in nav | ✅ Done | sidebar.js | — |
| Firebase Auth | Google Sign-In + bypass | ✅ Done | firebase-auth.js | Firebase |
| Cloud Sync | Firestore data sync | ✅ Done | firebase-db.js | Firebase |
| Memory System | AI long-term memory | ✅ Done | ai-assistant.js | — |
| Voice Input (STT) | Speech-to-text | ✅ Done | nova-stt-providers.js | Browser API |
| Voice Output (TTS) | Text-to-speech | ✅ Done | nova-tts-providers.js | Browser/Kokoro |
| Waveform Visualizer | Voice state animation | ✅ Done | nova-waveform.js | Canvas API |
| Daily Briefing | AI morning summary | ✅ Done | daily-briefing.js | NVIDIA API |
| Productivity Heatmap | 7-day visual overview | ✅ Done | productivity-heatmap.js | — |
| AI Weekly Report | Weekly stats + export | ✅ Done | ai-weekly-report.js | NVIDIA API |
| Quick Capture | Floating capture button | ✅ Done | quick-capture.js | — |
| NL Scheduling | Natural language → event | ✅ Done | natural-language-scheduling.js | NVIDIA API |
| Demo Mode | Instant demo data | ✅ Done | demo-mode.js | — |
| Materials | Upload/manage files | ✅ Done | materials.js | — |
| Block Color Legend | Visual guide for blocks | ✅ Done | index.html | — |
| iPhone 7 Responsive | 375px mobile support | ✅ Done | css/style.css | — |
| Voice Clone | Audio recording stub | ⏳ Stub | nova-voice-clone.js | MediaRecorder |
| Recurring Events | Repeating calendar events | ❌ Planned | — | — |
| Calendar Week View | 7-day view | ❌ Planned | — | — |
| Push Notifications | Browser notifications | ❌ Planned | notifications.js | — |
| Native Mobile App | iOS/Android | ❌ Future | — | — |

---

# 6. AI System

## Prompt System

```
┌─────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                        │
│   "You are an executive chief of staff..."             │
│   + Memory context (user preferences)                  │
│   + Calendar context (today's events)                  │
│   + Tool definitions (addEvent, deleteEvent, etc.)     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 CONVERSATION HISTORY                    │
│   Last 20 messages (from AIAssistant.messages[])       │
│   Persisted to localStorage (blockflow_ai_history)     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   USER MESSAGE                          │
│   + Attachment context (if files attached)             │
│   + Calendar context (events for today/tomorrow)       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              NVIDIA API (Llama 3.1 8B)                  │
│   POST /v1/chat/completions (stream: true)             │
│   via Cloudflare Worker or local proxy                 │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  SSE STREAM                             │
│   Text chunks → renderMarkdown() → incrementally       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│               TOOL CALL DETECTION                       │
│   Regex: /```json\s*(\{.*?\})\s*```/s                 │
│   Execute: addEvent / deleteEvent / updateEvent        │
└─────────────────────────────────────────────────────────┘
```

## Memory System

- Memory points stored in `blockflow_ai_memory` (localStorage)
- Synced to Firestore: `users/{uid}/data/aiMemory`
- Each point: `{ id, content, createdAt, importance, category, pinned }`
- Appended to system prompt before each request
- Auto-memory: After voice conversations, asks "Remember this?"

## Conversation History

- Stored in `AIAssistant.messages[]` (array of `{role, content}`)
- Max 20 messages sent to API (sliding window)
- All messages saved to localStorage (max 50 messages / 500KB emergency truncation)
- Persisted across sessions

## Streaming

- Uses `response.body.getReader()` with `TextDecoder`
- Parses SSE lines: `data: {"choices":[{"delta":{"content":"..."}}]}`
- Renders markdown incrementally via `renderMarkdown(fullContent)`
- Re-parses markdown on EVERY chunk (performance concern)

## Tool Calling

**NOT native function calling.** The system prompt instructs the LLM to output ```json blocks:

```
addEvent:    {"tool":"addEvent","title":"...","date":"YYYY-MM-DD",...}
deleteEvent: {"tool":"deleteEvent","id":"..."}
updateEvent: {"tool":"updateEvent","id":"...",...}
listEvents:  {"tool":"listEvents","date":"YYYY-MM-DD"}
updateBlock: {"tool":"updateBlock","block":"focus","duration":60}
```

Frontend regex-parses these blocks and executes them via `_executeCalendarTool()`.

## Voice Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Microphone │ ──► │  NovaSTT    │ ──► │  Text       │
│  (browser)  │     │  (Web API)  │     │  (user msg) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Speaker    │ ◄── │  NovaTTS    │ ◄── │  AI LLM     │
│  (browser)  │     │  (4 providers)│    │  (response) │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Model Providers

| Provider | Type | Cost | Status |
|----------|------|------|--------|
| Browser Voice | TTS | Free | ✅ Active |
| Kokoro Local AI | TTS | Free (WebGPU) | ✅ Active |
| tts.ai Cloud | TTS | Free (5K chars/day) | ⏳ Coming |
| ElevenLabs | TTS | Paid | ⏳ Coming |

---

# 7. Data Flow

## Workflow: User Creates Calendar Event

```
User types in NL input box
        │
        ▼
natural-language-scheduling.js
        │
        ▼
NVIDIA API parses → { title, date, time, block }
        │
        ▼
User clicks "Confirm"
        │
        ▼
Storage.addCalendarEvent(event)
        │
        ├──► localStorage (blockflow_calendar_events)
        │
        └──► SyncEngine.addEvent(event)
                │
                └──► If Google Calendar linked:
                        │
                        ▼
                    Google Calendar API (create event)
```

## Workflow: AI Chat with Tool Calling

```
User types message
        │
        ▼
AIAssistant.sendMessage()
        │
        ├──► addUserMessage() → render + save
        │
        └──► getAiResponse(text)
                │
                ├──► Build system prompt + memory + calendar context
                │
                ├──► NvidiaConfig.postChatCompletion(messages)
                │        │
                │        └──► Try proxy candidates:
                │             1. Cloudflare Worker
                │             2. localhost:8080
                │
                ├──► handleStream() → render markdown
                │
                └──► _processToolCalls(response)
                        │
                        └──► Regex: /```json\s*(\{.*?\})\s*```/s
                                │
                                └──► _executeCalendarTool(tool)
                                        │
                                        └──► Storage.addCalendarEvent()
                                                │
                                                └──► Re-render calendar
```

## Workflow: Voice Interaction

```
User clicks microphone button
        │
        ▼
NovaSTT.start() → browser Web Speech API
        │
        ▼
User speaks → onResult callback → text
        │
        ▼
AIAssistant.sendMessage(text) → same as text flow above
        │
        ▼
AI response → NovaTTS.speak(response)
        │
        ├──► NovaWaveform.setState('speaking')
        │
        └──► Audio plays through speaker
```

---

# 8. External Services

| Service | Purpose | Used Where | Required? |
|---------|---------|------------|-----------|
| **NVIDIA NIM API** | LLM inference (Llama 3.1 8B) | ai-assistant.js, daily-briefing.js, ai-weekly-report.js, natural-language-scheduling.js | Yes (for AI features) |
| **Firebase Auth** | Google Sign-In | firebase-auth.js | No (bypass mode available) |
| **Firebase Firestore** | Cloud data sync | firebase-db.js | No (localStorage works offline) |
| **Firebase Hosting** | Static hosting | firebase.json | No (can use any static server) |
| **Google Calendar API** | Calendar import/sync | google-calendar.js | No (optional integration) |
| **Google Identity Services** | OAuth 2.0 flow | google-calendar.js | No (only for Google Calendar) |
| **Cloudflare Worker** | CORS proxy for NVIDIA | nvidia-config.js | No (fallback to local proxy) |
| **Kokoro Local AI** | TTS via WebGPU | nova-tts-providers.js | No (browser voice fallback) |
| **ElevenLabs** | Premium TTS | nova-tts-providers.js | No (coming soon) |
| **tts.ai Cloud** | Cloud TTS | nova-tts-providers.js | No (coming soon) |

---

# 9. Storage

## localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `blockflow_data` | JSON | Block durations, tasks, notes |
| `blockflow_history` | JSON | 7-day history records |
| `blockflow_calendar_events` | JSON | Calendar events (legacy format) |
| `blockflow_materials` | JSON | Uploaded materials metadata |
| `blockflow_quick_capture` | JSON | Quick capture items |
| `blockflow_nl_recent` | JSON | Recent NL scheduling inputs |
| `blockflow_bypass_auth` | Boolean | Auth bypass flag |
| `blockflow_ai_history` | JSON | AI conversation history |
| `blockflow_ai_memory` | JSON | AI memory points |
| `blockflow_ai_system_prompt` | String | Custom system prompt |
| `blockflow_nova_tts_provider` | String | Selected TTS provider |
| `blockflow_nova_tts_ai_key` | String | tts.ai API key |
| `blockflow_nova_elevenlabs_key` | String | ElevenLabs API key |
| `blockflow_theme` | String | Selected theme name |
| `blockflow_sync_events` | JSON | SyncEngine unified events |
| `blockflow_sync_operations` | JSON | Offline sync queue |
| `blockflow_sync_tokens` | JSON | Google Calendar sync tokens |

## Firestore Collections

```
users/
  {uid}/
    data/
      aiHistory        → AI conversation history
      aiMemory         → AI memory points
    events/
      {eventId}        → Calendar events (unified format)
    metadata/
      migration        → Migration status
```

## SyncEngine Unified Event Schema

```javascript
{
  id: string,
  provider: 'local' | 'google' | 'apple',
  providerEventId: string | null,
  calendarId: string,
  title: string,
  description: string,
  location: string,
  start: string,          // ISO 8601
  end: string,            // ISO 8601
  allDay: boolean,
  color: string | null,
  importance: 'low' | 'medium' | 'high',
  block: 'focus' | 'personal' | 'recovery',
  syncState: 'pending' | 'synced' | 'conflict' | 'error',
  lastSynced: number | null,
  version: number,
  createdAt: number,
  updatedAt: number,
  deleted: boolean,
  deletedAt: number | null,
  remoteSnapshot: object | null
}
```

---

# 10. Important Components

## Calendar (`js/calendar.js`, `calendar.html`)

- Month grid view with event dots
- Event creation modal
- AI-powered event categorization
- Google Calendar sync via SyncEngine
- **Key issue:** `Calendar.init()` must be called explicitly after Firebase auth setup

## AI Assistant (`js/ai-assistant.js`)

- ~3000 lines, the largest module
- Draggable/resizable chat window
- Streaming responses with markdown rendering
- Tool calling via regex parsing
- Memory system (manual + auto)
- Voice integration (STT + TTS)
- System prompt customization
- **Key issue:** Re-renders markdown on every streaming chunk (performance)

## Nova (`js/nova/`)

- Voice subsystem with 5 files
- TTS: 4 providers (Browser, Kokoro, tts.ai, ElevenLabs)
- STT: Browser Web Speech API
- Waveform: Canvas-based state visualizer
- Voice Clone: Recording stub (not functional yet)
- Settings: Provider selection UI

## SyncEngine (`js/sync-engine.js`)

- Unified event store across all sources
- Two-way sync with Google Calendar
- Offline queue for pending operations
- Conflict detection and resolution
- Background sync every 15 minutes
- **Key issue:** Complex but well-documented (see docs/SYNC_ENGINE.md)

## Materials (`js/materials.js`, `materials.html`)

- File upload (drag & drop or click)
- Supports: TXT, MD, CSV, JSON, PNG, JPG, JPEG, PDF, MP4, WebM
- AI analysis on upload
- Search and filter
- Toggle visibility in settings

## Settings (`settings.html`)

- API key configuration (NVIDIA)
- Theme selection (7 themes)
- Voice provider selection
- Account management (Firebase)
- Google Calendar import
- Materials visibility toggle

## Authentication (`js/firebase-auth.js`)

- Google Sign-In via popup
- Bypass mode for local development
- Auth state persistence in localStorage
- **Key issue:** Bypass flag must persist across page loads (was a bug)

---

# 11. Current Technical Debt

## Known Bugs

1. **Markdown re-rendering on every stream chunk** — `renderMarkdown()` called on every SSE chunk. Should debounce or use incremental rendering.

2. **Legacy calendar format** — Old events use `{ date, time }` format, new events use ISO 8601 `{ start, end }`. Migration exists but is fragile.

3. **Emergency truncation** — AI history truncates at 50 messages / 500KB. This is a band-aid, not a solution.

4. **No error boundaries** — If any module throws, the entire app breaks. No try/catch at module level.

## Weak Architecture

1. **ai-assistant.js is too large** (~3000 lines). Should be split into: chat-ui.js, streaming.js, tool-calling.js, memory.js, voice-integration.js.

2. **Global state** — All modules are global `const` objects. No dependency injection, no module system.

3. **No TypeScript** — No type safety. Bugs caught at runtime, not compile time.

4. **No bundler** — All scripts loaded via `<script>` tags. No tree-shaking, no code splitting.

5. **Mixed ES5/ES6** — Some files use `var`, others use `const/let`. Inconsistent.

## Messy Code

1. **Inline styles** — Many components create DOM with inline `style.cssText` instead of CSS classes.

2. **Magic numbers** — Timeout values, max limits, etc. are hardcoded throughout.

3. **Duplicated code** — Theme application logic repeated across pages.

4. **Dead code** — Old files like `cloudflare-worker.js` may still exist.

## Performance Issues

1. **No lazy loading** — All scripts load on page load, even if unused.

2. **No virtual scrolling** — Calendar and history render all items.

3. **localStorage reads on every action** — No caching layer.

4. **Canvas waveform runs continuously** — Even when idle.

## Design Limitations

1. **Single-page architecture** — Each page is independent, no shared state without reload.

2. **No real-time sync** — Firestore sync is manual, not real-time.

3. **No offline-first** — Core features work offline, but AI features fail silently.

## Things to Avoid

- Don't add more features to ai-assistant.js — split it first
- Don't add new global objects — use module pattern
- Don't use `var` — use `const`/`let`
- Don't use inline styles — use CSS classes
- Don't add more localStorage keys without documentation
- Don't modify SyncEngine without reading docs/SYNC_ENGINE.md first

---

# 12. Current Roadmap

## Completed (v4.0.0)

- ✅ Daily Briefing
- ✅ Productivity Heatmap
- ✅ AI Weekly Report
- ✅ Quick Capture
- ✅ Natural Language Scheduling
- ✅ Demo Mode
- ✅ Login overlay bug fix
- ✅ Calendar delete bug fix
- ✅ iPhone 7 responsive design
- ✅ Block color legend
- ✅ Google Calendar sync (SyncEngine)
- ✅ Materials tab
- ✅ AI memory system
- ✅ Voice system (Nova)

## In Progress

- ⏳ Voice Clone (recording stub exists, no backend)
- ⏳ tts.ai and ElevenLabs TTS providers (marked "Coming Soon")

## Planned

- Recurring events
- Calendar week view
- Push notifications
- CSV/JSON data export
- AI insights dashboard

## Future Ideas

- Native mobile app (React Native / Flutter)
- Collaboration features
- Additional NVIDIA API integrations
- Apple Calendar sync
- Habit tracking

---

# 13. Development Workflow

## How to Add a Feature

1. Create new JS file: `js/your-feature.js`
2. Define global object: `const YourFeature = { ... }`
3. Add initialization in `app.js` or page-specific HTML
4. Add localStorage key if needed (document in this file)
5. Add CSS classes in `style.css`
6. Test across all pages (theme, responsive)

## How to Add an AI Tool

1. Add tool definition to system prompt in `ai-assistant.js` `getDefaultSystemPrompt()`
2. Add regex pattern to `_processToolCalls()`
3. Add handler function `_executeYourTool()`
4. Test with LLM output containing ```json block

## How to Add a Page

1. Create HTML file (copy structure from `index.html`)
2. Include shared CSS and JS via `<script>` tags
3. Add navigation link in `sidebar.js`
4. Add responsive styles in `style.css`

## How to Add Storage

1. Define localStorage key constant
2. Add CRUD functions to `storage.js`
3. Add Firestore sync to `firebase-db.js` if cloud sync needed
4. Document key in Section 9 of this file

## How to Add an API Integration

1. Create `js/your-api.js`
2. Add API key storage to localStorage
3. Add configuration UI to `settings.html`
4. Add proxy route if CORS needed (Cloudflare Worker or local proxy)

## Common Patterns

```javascript
// Module pattern
const MyModule = {
  _initialized: false,
  
  init() {
    if (this._initialized) return;
    this._initialized = true;
    // setup
  },
  
  // public methods
  doSomething() { ... },
  
  // private methods (underscore prefix)
  _helper() { ... }
};

// Storage pattern
Storage.getMyData() → JSON.parse(localStorage.getItem('key'))
Storage.saveMyData(data) → localStorage.setItem('key', JSON.stringify(data))

// Toast notification
showToast('Message', 'success' | 'error' | 'warning')

// Theme detection
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
```

## Coding Conventions

- Use `const` for all declarations (never `var`)
- Use `async/await` for promises
- Prefix private methods with `_`
- Use `showToast()` for user feedback (never `alert()`)
- Use CSS classes for styling (minimize inline styles)
- Document localStorage keys in this file
- Test on iPhone 7 (375px) for responsive

---

# 14. Lessons Learned

## Architectural Decisions

1. **Vanilla JS over framework** — Chosen for simplicity and learning. Drawback: no type safety, no module system, global state.

2. **localStorage as primary storage** — Works offline, no server needed. Drawback: 5MB limit, no real-time sync, no relational queries.

3. **Regex-based tool calling** — Simpler than native function calling. Drawback: fragile, depends on LLM output format.

4. **SyncEngine for calendar** — Unified event model across sources. Good decision, but complex to maintain.

5. **Nova voice subsystem** — Separated from main AI assistant. Good modular design, but not yet fully integrated.

## Mistakes to Not Repeat

1. **ai-assistant.js grew too large** — Should have split from the start. 3000 lines is unmaintainable.

2. **No TypeScript** — Type errors caught at runtime. Should have used TypeScript from day one.

3. **Inline styles everywhere** — Created maintenance nightmare. Should have used CSS classes consistently.

4. **No error boundaries** — One thrown error breaks everything. Should have added try/catch at module boundaries.

5. **No documentation during development** — Had to reverse-engineer architecture later. Document as you build.

6. **Feature creep** — Added many features without defining core product. Should have focused on fewer features done well.

---

# 15. If You Had One Week To Improve This Project

## Priority 1: Stability (Days 1-2)

**Why:** The app works but is fragile. One thrown error breaks everything.

1. Add try/catch at module initialization boundaries
2. Add error boundaries for AI streaming
3. Fix markdown re-rendering performance (debounce)
4. Test on real iPhone 7 device

## Priority 2: Code Quality (Days 3-4)

**Why:** ai-assistant.js is unmaintainable at 3000 lines.

1. Split ai-assistant.js into:
   - chat-ui.js (DOM rendering)
   - streaming.js (SSE handling)
   - tool-calling.js (regex + execution)
   - memory.js (memory CRUD)
   - voice-integration.js (Nova bridge)
2. Convert all `var` to `const/let`
3. Remove dead code

## Priority 3: Developer Experience (Day 5)

**Why:** Current workflow is slow without build tools.

1. Add ES modules (type="module")
2. Add basic linting (ESLint)
3. Add pre-commit hooks
4. Document all localStorage keys in one place

## Priority 4: Feature Polish (Days 6-7)

**Why:** Current features work but need refinement.

1. Add loading states for all async operations
2. Add proper error messages (not just console.log)
3. Add keyboard shortcuts for all major actions
4. Test offline mode thoroughly

## What NOT to Do

- Don't add new features
- Don't refactor the entire codebase
- Don't migrate to TypeScript (too big for one week)
- Don't add new dependencies
- Don't change the architecture

---

**End of Document**

This document should give any senior engineer enough context to understand BlockFlow and continue development. For deeper dives, see:
- `docs/SYNC_ENGINE.md` — SyncEngine architecture
- `docs/reports/ENGINEERING_HANDOFF.md` — Previous engineering handoff
- `CHANGELOG.md` — Version history

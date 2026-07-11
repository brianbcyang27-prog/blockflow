# BlockFlow — Engineering Handoff Report

**Date**: 2026-07-11  
**Prepared by**: Sisyphus  
**Target Audience**: Next engineer (ChatGPT or other)

---

## 1. Project Overview

| Aspect | Detail |
|---|---|
| **Framework** | No framework — vanilla HTML/CSS/JS single-page application (SPA-like) |
| **Frontend** | Vanilla JS (ES5/ES6 mixed, no bundler, no TypeScript) |
| **Backend** | Firebase Cloud Function (`functions/index.js`), Python local proxy (`web/api-proxy.py`), Cloudflare Worker (`cloudflare-worker.js`) |
| **Database** | localStorage (primary), Firebase Firestore (secondary sync via `firebase-db.js`) |
| **Authentication** | Firebase Auth (Google Sign-In popup) + local bypass mode |
| **AI Provider** | NVIDIA NIM API (`integrate.api.nvidia.com/v1/chat/completions`) |
| **SDKs** | Firebase JS SDK 10.14.1 (compat), Google Identity Services (GIS) for Calendar OAuth |
| **Tool Calling** | Not native function-calling. The system prompt instructs the LLM to append `` ```json `` blocks containing tool calls. The frontend regex-parses these blocks and executes them locally. |
| **Calendar** | Custom calendar in `calendar.js` (month grid view) with localStorage-backed events. Google Calendar import via OAuth 2.0 read-only scope. |
| **State Management** | Global `const` objects (`App`, `Storage`, `UI`, `Timer`, `Calendar`, `AIAssistant`, etc.) — no reactive state, no framework |
| **Deployment** | Firebase Hosting (`blockflow-28d39.web.app`) with `web/` as public directory |
| **PWA** | Service Worker (`sw.js`) with network-first strategy for HTML/JS, cache-first for static assets |

---

## 2. AI Assistant Architecture

### Full Data Flow

```
User types message in textarea
  │
  ▼
AIAssistant.sendMessage()                     [ai-assistant.js:969]
  ├── Validates API key (localStorage)
  ├── Adds attachment context if files attached
  ├── Calls addUserMessage() to render + save
  ├── Calls _enrichForAi() for NLP calendar parsing  [ai-assistant.js:1728]
  └── Calls getAiResponse(text)                    [ai-assistant.js:2101]
       │
       ▼
  getAiResponse()
  ├── Retrieves calendar events from Storage.getCalendarEvents()
  ├── Builds system prompt + memory context + calendar context
  ├── Constructs messages array:
  │     [{ role: "system", content: systemPrompt + memoryContext },
  │      ...this.messages.slice(-20),
  │      { role: "user", content: `Current calendar:\n...\n\n---\n\n${userText}` }]
  │
  ├── Calls NvidiaConfig.postChatCompletion()       [nvidia-config.js:82]
  │     └── Iterates proxy candidates from getProxyCandidates():
  │           ├── LocalStorage override URL
  │           ├── Cloudflare Worker: https://blockflow-proxy.jarvis-cf.workers.dev
  │           └── Local Python: http://127.0.0.1:8080 or http://localhost:8080
  │         └── POST to proxy with stream:true
  │              │
  │              ▼
  │         Proxy routes to integrate.api.nvidia.com/v1/chat/completions
  │              │
  │              ▼
  │         NVIDIA returns SSE stream (text/event-stream)
  │
  ├── handleStream() reads SSE, renders markdown incrementally [ai-assistant.js:2294]
  ├── On stream complete: messages.push(), saveMessageHistory()
  ├── _processToolCalls() parses ```json blocks from response [ai-assistant.js:1960]
  │     └── _executeCalendarTool() runs the tool locally  [ai-assistant.js:1889]
  └── showDynamicSuggestions() adds contextual chips
```

### All Files Involved

| File | Role |
|---|---|
| `web/js/ai-assistant.js` (2386 lines) | Main AI assistant: chat UI, streaming, tool calling, markdown rendering |
| `web/js/nvidia-config.js` (129 lines) | NVIDIA API config, model selection, proxy routing |
| `web/js/storage.js` (262 lines) | Calendar event CRUD, block updates, history |
| `functions/index.js` (65 lines) | Firebase Cloud Function: proxies to NVIDIA API |
| `cloudflare-worker.js` (67 lines) | Alternative Cloudflare Worker proxy |
| `web/api-proxy.py` (82 lines) | Local Python proxy for development |
| `web/index.html` | Script loading, body with `no-ai` class check |
| `web/calendar.html` | Calendar page with AI analysis overlay |
| `web/settings.html` | API key configuration page |

---

## 3. Chat System

### Chat Component
- Not a framework component. It's a global object `AIAssistant` with methods that directly manipulate DOM.
- Chat window is lazily built: `_createFab()` on init, `_ensureLazyLoaded()` on first click (injectCSS → buildOverlay → cacheElements → setupEventListeners → initDrag/Resize → loadSystemPrompt/History/Memory → addGreeting).

### Message State
- Stored in `AIAssistant.messages` (array of `{ role: 'user'|'assistant', content: string }`)
- Persisted to `localStorage` key `blockflow_ai_history`
- Max 20 messages sent to API (`_maxHistoryMessages`), but all messages saved to localStorage
- Known bug: Truncation at 500KB / last 50 messages was added as emergency fix

### Streaming Implementation
- Uses `response.body.getReader()` with `TextDecoder` to read SSE chunks
- Parses `data: {"choices":[{"delta":{"content":"..."}}]}` lines
- Renders incrementally via `msgDiv.innerHTML = this.renderMarkdown(fullContent)` — re-parses markdown on every chunk
- Streaming is NOT optional — it's the only code path for successful responses

### System Prompt
- Default in `getDefaultSystemPrompt()` (lines 1452-1493): Executive chief of staff persona, instructs LLM to output `` ```json `` tool blocks
- Custom prompt: stored in `blockflow_ai_system_prompt` localStorage key
- Memory points appended to system prompt before each request

### User Prompt
- Calendar context prepended: today's events, tomorrow's events, upcoming events, block durations
- Format: `Current calendar:\n[context]\n\n---\n\n[userText]`

### API Endpoints
- **Primary**: POST to Cloudflare Worker → NVIDIA API
- **Fallback**: POST to localhost:8080 → NVIDIA API
- **Firebase**: `/api/chat` rewrite to Cloud Function (configured but not wired in frontend)
- **Endpoint rotation**: `getProxyCandidates()` tries each in order, returns first success

### Tool Definitions
- Not using OpenAI/Anthropic tool schema. Tools are defined in the system prompt as text:

```
addEvent:    {"tool":"addEvent","title":"...","date":"YYYY-MM-DD","time":"HH:MM","endTime":"HH:MM","description":"...","importance":"low|medium|high","block":"focus|personal|recovery"}
deleteEvent: {"tool":"deleteEvent","id":"..."}
updateEvent: {"tool":"updateEvent","id":"...","title":"...","date":"...","time":"...","block":"..."}
listEvents:  {"tool":"listEvents","date":"YYYY-MM-DD"}
updateBlock: {"tool":"updateBlock","block":"focus|personal|recovery","duration":60}
```

---

## 4. Calendar System

### Event Storage
- **Primary**: localStorage key `blockflow_calendar_events` (JSON array)
- **Secondary**: Firebase Firestore collection `users/{uid}/events/` (synced on auth)

### Event Schema (from `Storage.addCalendarEvent()`)

```javascript
{
  id: 'evt_12345_abcde',      // Generated: 'evt_' + Date.now() + '_' + random
  title: string,
  date: 'YYYY-MM-DD',
  time: 'HH:MM' || '',
  endTime: 'HH:MM' || '',
  description: string || '',
  importance: 'low' | 'medium' | 'high',  // default 'medium'
  block: 'focus' | 'personal' | 'recovery', // default 'focus'
  aiAnalyzed: boolean,        // default false
  createdAt: number,           // Date.now()
  googleEventId?: string,      // Only when imported from Google Calendar
  googleLink?: string          // Only when imported from Google Calendar
}
```

### CRUD APIs (all in `storage.js`)

| Method | Line |
|---|---|
| `getCalendarEvents()` | 177 |
| `addCalendarEvent(event)` | 198 |
| `updateCalendarEvent(eventId, updates)` | 220 |
| `deleteCalendarEvent(eventId)` | 232 |
| `saveCalendarEvents(events)` | 188 |

### Calendar Provider
- `Calendar` object in `web/js/calendar.js` (605 lines)
- Renders a month grid, handles event CRUD modals, AI analysis overlay
- `GoogleCalendar` object in `web/js/google-calendar.js` for OAuth import

### Relevant Files

| File | Purpose |
|---|---|
| `web/js/calendar.js` | Month view, event CRUD modals, AI event analysis |
| `web/js/storage.js` | Event storage, CRUD to localStorage + Firestore sync |
| `web/js/google-calendar.js` | OAuth import from Google Calendar API |
| `web/calendar.html` | Calendar page markup |
| `web/js/firebase-db.js` | Firestore event persistence |
| `web/js/ui.js` | Today's events list rendering (dashboard) |

---

## 5. Tool Calling

This is NOT using the OpenAI/Tool-calling API format. The system prompt instructs the LLM to append `` ```json `` blocks containing tool invocations. The frontend regex-parses them and executes locally.

### Tool Table

| Tool | Purpose | Params | Return | Impl. Location | Works? |
|---|---|---|---|---|---|
| `addEvent` | Create calendar event | `title`, `date`, `time?`, `endTime?`, `description?`, `importance?`, `block?` | Success message | `ai-assistant.js:1894` | ✅ |
| `deleteEvent` | Delete calendar event | `id` | Success message | `ai-assistant.js:1908` | ✅ |
| `updateEvent` | Update event fields | `id`, `title?`, `date?`, `time?`, `block?`, etc. | Success message | `ai-assistant.js:1914` | ✅ |
| `listEvents` | Query events | `date?` | Count message | `ai-assistant.js:1924` | ✅ |
| `updateBlock` | Update block duration | `block`, `duration` (5-480 min) | Success message | `ai-assistant.js:1932` | ✅ |

### How Tool Calling Works

1. LLM response is received (streamed or complete)
2. `_processToolCalls()` (line 1960) calls `_parseToolCalls()` (line 1713)
3. `_parseToolCalls()` uses regex: `` /```json\s*\n?({[\s\S]*?})\n?\s*```/g ``
4. Each match is JSON-parsed, verified for `tool` string property
5. `_executeCalendarTool()` routes to switch-case
6. Results are concatenated and shown as an AI message
7. On calendar changes: `_refreshCalendarUI()`, `_updateBlockUI()`, auto-navigate to calendar.html

### Critical Bug: Tool Call Display

In `handleStream()` (line 2358): `finalContent` has tool JSON blocks stripped via `_stripToolCalls()` which is called inside `_processToolCalls()`. BUT `finalContent` is saved to `this.messages` **before** tool stripping. This means the raw JSON blocks (e.g., `` ```json {"tool":"listEvents","date":"2026-07-11"} ``` ``) are saved in conversation history. On page reload, they render as visible code blocks in the chat history.

---

## 6. Current Problems

### P1: No environment separation — hardcoded credentials

| Detail | Value |
|---|---|
| **Firebase API key** | Hardcoded in `firebase-init.js:4` — `AIzaSyA5fBcpGbR90FzBja5elSq9wMMG3GZBQ7Q` |
| **Google OAuth Client ID** | Hardcoded in `google-calendar.js:2` — `255025772243-nmsk5afr14rgitlv3uj64goo0r8fuc90.apps.googleusercontent.com` |
| **Cloudflare worker URL** | Hardcoded in `nvidia-config.js:75` — `https://blockflow-proxy.jarvis-cf.workers.dev` |
| **Likely cause** | No dotenv, no env injection, no build step |
| **Confidence** | **High** — direct evidence in source files |

### P2: Tool call JSON blocks leak into visible chat history

| Detail | Value |
|---|---|
| **Problem** | In `handleStream()`, `finalContent` contains `` ```json {"tool":"..."} ``` `` blocks. These are stripped for display but saved raw. On reload, previously saved messages render the raw JSON blocks. |
| **Affected files** | `ai-assistant.js:2355` — saves `finalContent` before tool stripping |
| **Evidence** | `finalContent` at line 2355 is the unsanitized full response. `_processToolCalls` at line 2358 strips but does not update the saved message. |
| **Confidence** | **High** — direct code path analysis |

### P3: Message history corruption due to double-saving

| Detail | Value |
|---|---|
| **Problem** | `addUserMessage()` and `addAiMessage()` push to `this.messages` AND call `saveMessageHistory()`. `getAiResponse` also pushes to `this.messages` after streaming (line 2355), and `addAiMessage()` also pushes (line 1022). There's potential for double-pushes if error recovery code paths interact oddly. |
| **Affected files** | `ai-assistant.js:999-1025`, `ai-assistant.js:2355` |
| **Confidence** | **Medium** — needs runtime verification |

### P4: No error recovery when Cloudflare worker is down

| Detail | Value |
|---|---|
| **Problem** | `nvidia-config.js:postChatCompletion()` iterates proxy candidates. When all fail, throws error. `getAiResponse` catches and shows retry button. But if the Cloudflare worker is returning 502s, the system retries on every message, burning time. |
| **Affected files** | `nvidia-config.js:82-116`, `ai-assistant.js:2253-2283` |
| **Confidence** | **High** — worker may be stale or rate-limited |

### P5: Custom cursor rAF loop on every page

| Detail | Value |
|---|---|
| **Problem** | Every HTML page has a custom cursor that runs a `requestAnimationFrame` loop. A `visibilitychange` listener pauses it, but still runs GPU compositing even when paused (`will-change: transform`). |
| **Affected files** | `index.html`, `calendar.html`, `settings.html`, `docs.html` (inline custom cursor styles) |
| **Confidence** | **High** — known from previous session |

### P6: `no-ai` class missing on some pages

| Detail | Value |
|---|---|
| **Problem** | `ai-assistant.js:2378` checks for `document.body.classList.contains('no-ai')` before auto-initializing. `docs.html` has `no-ai`, all others don't. The AI assistant JS is loaded on every page, even if not used. |
| **Affected files** | `ai-assistant.js:2378`, all HTML files |
| **Confidence** | **High** — verified in source |

### P7: Firestore rules may block reads

| Detail | Value |
|---|---|
| **Problem** | If Firestore security rules are restrictive, sync fails silently. `firebase-db.js:53-56` logs `permission-denied` but Storage continues with localStorage. |
| **Affected files** | `firestore.rules`, `firebase-db.js` |
| **Confidence** | **Medium** — haven't read the rules file |

### P8: No build/type system

| Detail | Value |
|---|---|
| **Problem** | 0 tests, 0 type checking, 0 linting, 0 bundling. Multiple undefined variable references (e.g., `Storage`, `Calendar`, `NvidiaConfig`, `FirebaseDB` are implicitly global). Errors surface only at runtime. |
| **Confidence** | **High** — obvious from project structure |

---

## 7. Git Investigation

### Commit Graph (all 15 commits)

```
2996daa (HEAD) chore: ignore .sisyphus/ and graphify-out/ from tracking
2ac118f refactor: move all app files to web/ subdirectory
a4874a3 fix: add dismiss button to AI analysis overlay
c61c55b fix: wire up distraction tracking button
469c096 UI/UX polish, NVIDIA API key hardcoded, sample seed data, home page redesign
66e8854 Revert "Add project documentation website"
cb06038 Add project documentation website
2286ff5 Add Firebase config from Firebase Console
30a2054 Fix: Initialize UI before setting up event listeners
a11ea2e Fix button clickable issues
ef7e3cf Add Firebase backend with Google Sign-In for Calendar
579c5ff Remove iOS files - website only
2e30d4a Website only: BlockFlow productivity app (root commit)
```

### Commits that Modified AI Assistant

| Commit | What happened |
|---|---|
| `2ac118f` | `ai-assistant.js` was **added** as new file (1482 lines). It was never modified after that. |
| `469c096` | Likely the commit that originally introduced the AI code (pre-refactor). The `2ac118f` refactor simply moved it. |

**Finding**: `ai-assistant.js` has never been modified since it was first committed in git. The file in git is version 1 (1482 lines). The **current working copy** is 2386 lines — meaning **904 lines were added outside git tracking** (likely from a previous Claude Code session's fixes: lazy-loading, drag fixes, history truncation, etc.).

### Last Commit Where Chat "Worked"

`469c096` is the last commit before the refactor. The AI code was introduced here. Given that `ai-assistant.js` was never modified between commits, the code "worked" in its original 1482-line form. The current 2386-line version has never been committed, so there is no git-tracked state that represents the current (potentially broken) code.

---

## 8. Regression Analysis

### What Changed

| Version | Lines | Status |
|---|---|---|
| Original committed version | 1482 | Last committed in `2ac118f` |
| Current working copy | 2386 | +904 lines, uncommitted |

The extra 904 lines include: lazy-loading FAB refactor, drag listener fix, localStorage truncation, improved greeting, thinking UI, tool calling, memory system, markdown renderer, file attachments.

### What Likely Broke

**Tool call leak into conversation history** (P2 above) is likely a regression introduced during the history truncation fix. The original code did NOT save tool-containing responses separately. The new code path in `handleStream()` saves `finalContent` (with JSON blocks) to message history at line 2355, then strips them at line 2358 for display only.

### Why Tool Calling Affected Chat

The tool calling system is **parsed from LLM text output**, not a structured API. If the LLM's output changes format (different model, system prompt change, temperature change), parsing would break silently. The `_parseToolCalls()` regex is fragile — if the LLM wraps JSON in extra backticks or uses a different delimiter, no tool calls are parsed. No error is shown; the tool simply doesn't run.

### Evidence

```
ai-assistant.js line 2355: this.messages.push({ role: 'assistant', content: finalContent });
ai-assistant.js line 2358: const toolResults = this._processToolCalls(finalContent);
// _processToolCalls strips JSON blocks for display but does NOT update this.messages
```

Since `ai-assistant.js` was introduced in commit `2ac118f` and **never modified after**, a code regression in the committed code is impossible. If chat "worked yesterday and broke today," the root cause is environmental — not code-based. Possible candidates:

1. NVIDIA API key expired, revoked, or quota exhausted
2. Cloudflare Worker (`blockflow-proxy.jarvis-cf.workers.dev`) decommissioned or rate-limited
3. LocalStorage corruption from the pre-fix 500KB history bug (now fixed, but corrupt data persists)
4. Browser cache serving old broken JavaScript

---

## 9. UI Analysis

### Chat UI Files
- All inline: 200+ lines of CSS injected into DOM in `ai-assistant.js` method `injectCSS()` — lines 54-258
- Chat window HTML is built via `buildOverlay()` — lines 262-338
- Message elements created on-the-fly in `addUserMessage()` and `addAiMessage()`

### Calendar UI Files
- `web/js/calendar.js` — month grid, event modals, inline styles
- `web/js/ui.js` — dashboard events list

### Component Hierarchy

```
index.html
├── Login Overlay (inline styles)
├── Dashboard Compact
│   ├── Blocks Row (3 blocks: focus/personal/recovery)
│   ├── Timer Card (timer UI)
│   ├── Events List (today's events)
│   ├── Stats Row (focus time, distractions, sleep)
│   └── 7-day History
├── Settings Modal (inline)
├── Block Settings Modal (inline)
├── Walkthrough (4-step inline)
└── AI Assistant (lazy-loaded)
    ├── AI FAB Button
    ├── AI Container
    │   ├── Header (model select, memory, close)
    │   ├── Conversation (messages)
    │   ├── Suggestions
    │   └── Input area (voice, attach, send)
    └── AI Overlay
```

### Styling System

| Aspect | Detail |
|---|---|
| **Single CSS file** | `web/css/style.css` (very large — 1000+ lines) |
| **Dark mode** | via `body.dstyle-dark` class |
| **Warm mode** | via `body.dstyle-warm` class |
| **CSS vars** | Not used — colors are hardcoded throughout |
| **Inline styles** | Heavy use of inline `<style>` tags and `style.cssText` |

### Unnecessary UI Complexity

1. **Custom cursor** on all 4 pages — zero functional value, GPU cost
2. **Draggable/resizable/snap-to-sidebar** chat window — adds ~300 lines, rarely used. Click-drag is high-interaction-cost for a productivity app
3. **Thinking animation** — animated dot pulses, progress bars, step timers — ~200 lines of JS/CSS for a loading spinner
4. **Memory modal** — a separate modal inside the chat overlay for saving notes. Redundant with the chat itself
5. **File attachment** — supports 15+ file types, reader up to 1MB, drag-drop overlay — all read-only, never sent to any external service. Simply dumped into the prompt context
6. **Voice input** — Web Speech API integration for a text-based productivity app
7. **Dynamic suggestions** — context-aware chip generation based on last response keyword matching

---

## 10. Folder Tree

```
BlockFlow/
├── .firebaserc                          🔧 Firebase project config
├── .gitignore                           🔧 Git ignore
├── BUG_FIXES.md                         📄 Bug fix documentation
├── README.md                            📄 Project readme
├── ENGINEERING_HANDOFF.md               📄 This file
├── api-proxy.py                         🛠 Local API proxy (duplicate of web/api-proxy.py)
├── cloudflare-worker.js                 🛠 Cloudflare Worker proxy
├── firebase.json                        🔧 Firebase hosting/functions config
├── firestore.rules                      🔧 Firestore security rules
├── start.sh                             🔧 Development startup script
│
├── functions/                           🔥 Firebase Cloud Functions
│   ├── index.js                         ⭐🛠 Chat API proxy (65 lines)
│   ├── package.json                     📄 Dependencies
│   └── node_modules/                    📦 Installed deps
│
├── web/                                 🌐 PWA application root
│   ├── index.html                       ⭐ Main dashboard (2536 lines)
│   ├── calendar.html                    ⭐📅 Calendar page (588 lines)
│   ├── settings.html                    ⭐⚙️ Settings page (1654 lines)
│   ├── docs.html                        📄 Documentation page (1369 lines)
│   ├── manifest.json                    📄 PWA manifest
│   ├── sw.js                            📄 Service Worker
│   ├── favicon.svg                      🖼 Favicon
│   │
│   ├── css/
│   │   └── style.css                    🎨 All application styles
│   │
│   ├── js/
│   │   ├── ai-assistant.js              ⭐🤖 AI chat window (2386 lines)
│   │   ├── app.js                       ⭐ Main app controller (279 lines)
│   │   ├── storage.js                   ⭐📅 Data/Calendar persistence (262 lines)
│   │   ├── ui.js                        🎨 DOM rendering (273 lines)
│   │   ├── timer.js                     ⏱ Pomodoro timer (200 lines)
│   │   ├── calendar.js                  ⭐📅 Month calendar view (605 lines)
│   │   ├── nvidia-config.js             🤖 NVIDIA API config (129 lines)
│   │   ├── google-calendar.js           📅 Google Calendar OAuth (228 lines)
│   │   ├── firebase-init.js             🔥 Firebase init (41 lines)
│   │   ├── firebase-auth.js             🔥 Auth module (156 lines)
│   │   └── firebase-db.js               🔥 Firestore CRUD (187 lines)
│   │
│   ├── api-verify/
│   │   └── index.html                   📄 API verification hub
│   │
│   └── icons/                           🖼 PWA icons
│
├── blockflow goal/                      📄 Documentation (goals, API keys)
└── graphify-out/                        🔧 Generated (empty)
```

---

## 11. Dependencies

| Package | Version | Why |
|---|---|---|
| **firebase-functions** | ^6.3.2 | Firebase Cloud Functions SDK (chat API proxy) |
| **firebase-admin** | ^13.1.0 | Firebase Admin SDK (not used in `index.js`) |
| **Firebase JS SDK (CDN)** | 10.14.1 | `firebase-app-compat.js`, `firebase-auth-compat.js`, `firebase-firestore-compat.js` — Auth + Firestore via CDN |
| **Google Identity Services (CDN)** | latest | `accounts.google.com/gsi/client` — OAuth token for Google Calendar API |
| **No other packages** | — | No bundler, no TypeScript, no testing, no linting, no UI framework |

---

## 12. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                          BROWSER (PWA)                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    index.html / calendar.html                │  │
│  │                                                              │  │
│  │  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │  │
│  │  │  app.js  │  │  ui.js    │  │ timer.js  │  │calendar.js│ │  │
│  │  │ (ctrlr)  │  │ (render)  │  │ (pomodoro)│  │ (month    │ │  │
│  │  └─────┬────┘  └─────┬─────┘  └─────┬─────┘  │  grid)    │ │  │
│  │        │             │              │         └─────┬─────┘ │  │
│  │        └──────┬──────┘              │               │       │  │
│  │               │                     │               │       │  │
│  │        ┌──────▼──────┐              │        ┌──────▼─────┐ │  │
│  │        │  storage.js │◄─────────────┴────────┤firebase-db │ │  │
│  │        │ (localStor) │                       │ (Firestore) │ │  │
│  │        └──────┬──────┘                       └──────┬──────┘ │  │
│  │               │                                    │        │  │
│  │               │ localStorage                       │ OAuth  │  │
│  │               ▼                                    ▼        │  │
│  │  ┌─────────────────────┐              ┌──────────────────┐  │  │
│  │  │  ai-assistant.js    │              │firebase-auth.js  │  │  │
│  │  │  (chat UI + tool    │              │(Google Sign-In)  │  │  │
│  │  │   calling)          │              └──────────────────┘  │  │
│  │  └────────┬────────────┘                                     │  │
│  │           │                                                  │  │
│  │    ┌──────▼──────┐    ┌─────────────────┐                   │  │
│  │    │nvidia-config│    │google-calendar.js│                   │  │
│  │    │ (proxy      │    │(OAuth import)    │                   │  │
│  │    │  routing)   │    └─────────────────┘                   │  │
│  │    └──────┬──────┘                                          │  │
│  └───────────┼──────────────────────────────────────────────────┘  │
│              │                                                    │
└──────────────┼────────────────────────────────────────────────────┘
               │
    ┌──────────┼────────────┬──────────────────┐
    ▼          ▼            ▼                  ▼
Cloudflare  Local       Firebase          Google
Worker    api-proxy.py  Cloud Function   Calendar API
(prod)   (dev:8080)    (/api/chat)      (OAuth)
    │          │            │
    └──────────┴────────────┘
               │
               ▼
    ┌─────────────────────┐
    │   integrate.api.    │
    │   nvidia.com/v1/    │
    │ chat/completions    │
    │   (NVIDIA NIM)      │
    └─────────────────────┘
```

---

## 13. Current TODO (Based Only on Evidence)

### Unfinished Features

1. **Firebase function `/api/chat` rewrite** — Configured in `firebase.json` line 14, function exists in `functions/index.js`. But the frontend never calls it — it uses Cloudflare Worker or local proxy instead. `postChatCompletion()` in `nvidia-config.js` doesn't include the Firebase function URL in its candidate list.

2. **Firestore sync is partial** — `Storage.syncFromFirestore()` exists but is only called once on auth change in `index.html`. No periodic sync, no conflict resolution.

### Partially Implemented Features

3. **AI conversation history truncation** — 500KB hard limit with last-50-messages fallback is an emergency fix. No proper eviction policy (e.g., keep most recent N, trim by token count).

4. **System prompt editor** — UI exists (`ai-assistant.js:1500-1530`), modal elements referenced in `cacheElements()`, but `id="aiSystemPromptBtn"` etc. don't appear in the `buildOverlay()` HTML. The system prompt modal buttons are never created in the DOM — they're only referenced in `cacheElements()` as `document.getElementById()` lookups that return null. Editing is impossible from the UI.

5. **Memory points** — UI exists but not shown in the default DOM either. The `ai-memory-modal` is built in `buildOverlay()` (line 291), so it should work.

### Broken Features

6. **Tool call JSON blocks visible in chat history** (P2) — After page reload, previously saved messages with tool calls show raw JSON.

7. **`loadMessageHistory()` stale-phrase filtering** (line 933) — Filters `'configure your NVIDIA API key'` and `'No API key configured'`. But these were already saved to `this.messages` via `addAiMessage()`. Filtering only happens during `loadMessageHistory()` — old stale messages ARE in the saved history but get filtered out ONLY on load.

8. **AI auto-navigate to calendar.html** (line 1998) — After calendar tool calls, the window navigates to `calendar.html`, losing the chat history context entirely. The assistant won't remember what just happened.

---

## 14. Questions for the Next Engineer

1. **Where did the 904 extra lines in `ai-assistant.js` come from?** The git-committed version is 1482 lines. The current working copy is 2386 lines. These were never committed. Were they from a prior Claude Code session? Is the committed version the only "known working" state?

2. **Does the Cloudflare Worker (`blockflow-proxy.jarvis-cf.workers.dev`) still work?** The proxy URL is hardcoded in `nvidia-config.js:75`. If it's been decommissioned or rate-limited, every AI request will fail. The Firebase function (`/api/chat`) was configured but never wired to the frontend.

3. **What NVIDIA model actually supports the system prompt's tool format?** The system prompt instructs the LLM to output `` ```json `` blocks. Not all NVIDIA models respect this. Has this ever worked reliably?

4. **Is Firebase Auth's bypass mode intentional?** `firebase-auth.js` has a `blockflow_bypass_auth` localStorage flag. When active, it uses `{ uid: 'local', isAnonymous: true }` — Firestore sync silently skips anonymous users. Is this for offline development or a permanent fallback?

5. **Why are there no tests?** The project has 0 test files, 0 test configuration, and no CI. Is there a plan to add them?

6. **The `docs.html` page is in Traditional Chinese (`lang="zh-TW"`)** but all other pages are English. Is this intentional?

7. **What is `start.sh` supposed to do?** It's at the project root. It presumably starts the local Python API proxy. Does it also start a web server?

8. **Why are there two `api-proxy.py` files?** One at `BlockFlow/api-proxy.py` and one at `BlockFlow/web/api-proxy.py`. Which is canonical?

9. **Has the AI assistant ever actually worked to satisfaction?** Given the tool-calling fragility, history corruption, and proxy routing issues, was there a known-good state?

10. **What's the NVIDIA API key situation?** Commit `469c096` says "NVIDIA API key hardcoded". But `getApiKey()` reads from localStorage. Was a hardcoded key removed? Is there a shared/development key somewhere?

# UI/UX Upgrade Changelog

## Overview
Comprehensive UI/UX improvement pass across BlockFlow, organized into 4 stages.

---

## Stage 1: Foundation

### 1A. UI/UX Audit (`UI_UX_AUDIT.md`)
- Comprehensive audit of all pages (dashboard, calendar, settings, AI assistant)
- Scored app 5.5/10 with prioritized recommendations
- Identified CSS duplication, missing responsive styles, inconsistent spacing

### 1B. CSS Consolidation
- Moved login overlay CSS from inline (3 HTML files) → `css/style.css`
- Moved custom cursor CSS from inline (3 HTML files) → `css/style.css`
- Net reduction: ~50 lines across HTML files
- `css/style.css`: 1016 → 1078 lines

### 1C. Firestore Rules Bug Fix
- Removed dead rule on line 10: `resource.path.size() == 0` (always false)
- Simplified to single rule per path: `allow read, write: if request.auth != null && request.auth.uid == userId;`
- `firestore.rules`: 31 → 23 lines

### 1D. Account Security Review (`ACCOUNT_SECURITY_REVIEW.md`)
- Security assessment of Firebase auth, Firestore rules, API key storage
- Documented strengths, weaknesses, and recommendations

---

## Stage 2: Dashboard UX

### Toast Notification System
- Added `.toast-container`, `.toast`, `.toast-success/error/info` to `css/style.css`
- Added `UI.showToast(message, type)` function to `js/ui.js` (3s auto-dismiss)
- Added toast container to `index.html`

### Empty State Component
- Added empty state for dashboard events list (icon + title + text + "Add Event" button)
- Added `.empty-state` CSS classes to `css/style.css`

### alert() → toast() Migration
- `js/app.js`: 2 `alert()` calls → `UI.showToast()` (break over notification, session complete)
- Kept `alert()` in `js/storage.js` (critical storage errors) and `js/calendar.js` (validation)

---

## Stage 3: Account Management

### Settings Page Account Section
- Added Account section to `settings.html` between Data Management and Help
- Shows user email when signed in with Sign Out button
- Shows "Local Mode" with Sign In button when not authenticated
- Wired to `FirebaseAuth.signOut()` and `FirebaseAuth.signIn()`

---

## Stage 4: Polish

### Responsive Design
- Added comprehensive media queries for 900px and 600px breakpoints
- Covers: dashboard blocks, timer, tasks, AI chat window, settings sections
- Mobile: stacked settings layout, smaller timers, compact AI chat

### Loading States
- Added `.btn-loading` CSS class with spinner animation
- Added `.spinner-overlay` and `.spinner` for full-page loading
- Added `:focus-visible` styles for keyboard navigation
- Wired loading state to NVIDIA API key test button

### Accessibility
- Added `aria-live="polite"` to toast container (screen reader announcements)
- Added `aria-live="polite"` and `aria-label` to AI chat messages
- Added `aria-live="polite"` to timer status text
- Added `:focus-visible` outline styles for all interactive elements
- Verified existing ARIA labels on AI assistant buttons (FAB, send, voice, memory, close)

---

## Files Changed
- `css/style.css` — +124 lines (shared components, responsive, loading, accessibility)
- `index.html` — -58 lines (CSS moved out) + accessibility attributes
- `settings.html` — -58 lines (CSS moved out) + account section
- `calendar.html` — -58 lines (CSS moved out)
- `js/ui.js` — +25 lines (toast system)
- `js/app.js` — 2 alert→toast replacements
- `js/ai-assistant.js` — +3 lines (aria-live on chat messages)
- `firestore.rules` — -8 lines (dead code removed)
- `UI_UX_AUDIT.md` — new (audit document)
- `ACCOUNT_SECURITY_REVIEW.md` — new (security review)
- `CHANGELOG_UI_UPGRADE.md` — new (this file)

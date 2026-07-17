# Changelog

All notable changes to BlockFlow are documented here.

---

## [4.0.0] - 2026-07-17

### Added
- **Daily Briefing** — AI-powered morning summary with energy planning and key tasks
- **Productivity Heatmap** — Visual 7-day heatmap showing focus, personal, and recovery time
- **AI Weekly Report** — One-click weekly summary with stats, insights, and CSV export
- **Quick Capture** — Floating button (⚡) to instantly save ideas without leaving the page (Cmd/Ctrl+K)
- **Natural Language Scheduling** — Type "Team standup tomorrow at 9am" and AI parses it into a calendar event
- **Demo Mode** — Instant demo data loader with 7-day history, 30 events, and 3 sample materials
- **Block Color Legend** — Visual guide showing Focus (blue), Personal (green), Recovery (amber)
- **iPhone 7 Responsive Design** — Full mobile support at 375px width across all pages

### Fixed
- **Login overlay persistence** — "Continue without signing in" now persists across all tab switches
- **Calendar delete functionality** — Event deletion now works correctly (Calendar.init() was never called)

### Changed
- Quick Capture positioned above Nova FAB for better mobile access
- All dashboard cards adapted for small screens with reduced padding
- Navigation tabs scroll horizontally on mobile devices

---

## [2.3.0] - 2026-07-15

### Added
- Universal Calendar Sync Engine with unified event model
- Two-way sync between BlockFlow and Google Calendar
- Incremental sync using Google sync tokens for efficiency
- Offline queue for pending changes when offline
- Conflict detection and resolution UI
- Sync status indicator showing connection state
- Multiple Google calendar selection and sync
- Background sync every 15 minutes
- Event caching with TTL for performance
- Automatic migration from legacy event format
- AI assistant integration with unified event store
- Pagination support for large calendars (5000+ events)

### Changed
- Calendar events now stored in unified format across all sources
- AI assistant reads from unified event store instead of legacy storage
- Google Calendar import now supports multiple calendars
- Sync status displayed in settings page

### Fixed
- Google Calendar events now persist correctly across sessions
- Offline changes are properly queued and replayed
- Conflict detection prevents data loss during concurrent edits

---

## [2.1.0] - 2026-07-13

### Added
- Animated sidebar navigation with toggle button (hamburger → X morph)
- Multi-phase closing animation with spring easing
- AI Assistant and Analytics actions in sidebar
- User profile section with Firebase auth integration
- localStorage → Firestore migration system
- Escape key and overlay click to close sidebar
- Staggered animation delays for premium feel

### Changed
- Updated navigation layout from horizontal tabs to animated sidebar
- Improved user interface flow and transitions
- Enhanced sidebar interaction with state management
- Header padding adjusted for toggle button clearance

### Fixed
- Sidebar navigation links (Home, Calendar, Settings) now respond correctly
- Click handlers prevent default, close sidebar, then navigate after animation
- Current page links close sidebar without unnecessary navigation
- Animation state conflicts resolved
- Overlay pointer events handled correctly
- Rapid toggle prevention during transitions

---

## [3.1.0] - Sidebar Navigation Fix + Project Cleanup

### Fixed
- Sidebar navigation links (Home, Calendar, Settings) now navigate correctly with closing animation
- Added click handlers to regular links that prevent default, close sidebar, then navigate after animation

### Changed
- Reorganized project root: moved reports, screenshots, and development files to `docs/`
- Created `docs/README.md` as documentation index
- Updated `README.md` with new project structure

---

## [3.0.0] - Sidebar Shell + Account Management

### Added
- Animated sidebar navigation with toggle button (hamburger → X morph)
- Multi-phase closing animation with spring easing
- AI Assistant and Analytics actions in sidebar
- User profile section with Firebase auth integration
- localStorage → Firestore migration system
- Account management section in Settings

### Changed
- Sidebar slides in from left, nav-tabs morph out
- Header padding for toggle button clearance

---

## [2.x] - Memory System + UI/UX Upgrade

### Added
- Intelligent long-term memory system for AI assistant
- Toast notification system
- Empty state components
- Account section in Settings
- Responsive design (900px, 600px breakpoints)
- Loading states and accessibility improvements

### Fixed
- Firestore security rules (removed dead code)
- Google Sign-In lifecycle (bypass mode)

### Changed
- CSS consolidation (moved inline styles to style.css)
- alert() → toast() migration

---

## [1.0.0] - Initial Release

### Added
- 3-Block Planner (Focus, Personal, Recovery)
- Pomodoro Timer with break mode
- AI Assistant (NVIDIA LLM integration)
- Calendar with event management
- Google Calendar Import
- 7-day History tracking
- PWA support
- Firebase Auth + Firestore sync

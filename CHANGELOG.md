# Changelog

All notable changes to BlockFlow are documented here.

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

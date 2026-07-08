# BlockFlow - 3 Block Day Productivity App

A lightweight productivity web app that helps users reduce scrolling addiction, improve focus, and balance their daily life using the "3 Block Day" system.

## Features

- **Daily Planner**: Three blocks (Focus, Personal, Recovery) with duration settings and completion tracking
- **Focus Timer**: Pomodoro-style timer to track focused work sessions
- **Anti-Scroll System**: Track distractions and monitor focus time vs distraction time
- **Sleep Tracker**: Log sleep and wake times to track sleep duration
- **Daily Reset**: Automatic reset at midnight with 7-day history
- **Offline Support**: PWA with service worker for offline functionality

## Quick Start (Web App)

```bash
# Serve the web/ directory
cd web && python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

> Note: Service worker features require serving via HTTP(S), not direct file open.

## Project Structure

```
BlockFlow/
├── web/                    # PWA web app
│   ├── index.html          # Main HTML file
│   ├── calendar.html       # Calendar page
│   ├── settings.html       # Settings page
│   ├── css/
│   │   └── style.css       # All styles
│   ├── js/                 # JavaScript modules
│   │   ├── app.js          # Main application logic
│   │   ├── storage.js      # localStorage management
│   │   ├── timer.js        # Focus timer logic
│   │   ├── ui.js           # UI rendering
│   │   └── ...             # Firebase, AI, calendar helpers
│   ├── icons/              # PWA icons
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── firebase.json           # Firebase Hosting config (public: "web")
├── firestore.rules         # Firestore security rules
└── README.md
```

## Tech Stack

- **Web**: Pure HTML, CSS, Vanilla JavaScript — no frameworks or build tools
- **Persistence**: localStorage (web), Firestore (cloud sync)

## Browser Support

- iOS Safari (iOS 15+)
- Chrome, Firefox, Safari, Edge (modern versions)

## Usage

1. **Set Block Times**: Click "Set Time" on each block to set duration
2. **Mark Complete**: Click "Mark Done" when you finish a block
3. **Focus Timer**: Use the 25-minute Pomodoro timer
4. **Track Distractions**: Tap "I got distracted" when you catch yourself scrolling
5. **Sleep Tracking**: Set your sleep and wake times

## Data Storage

All data is stored locally (localStorage):
- Current day's blocks, distractions, focus time
- Sleep times
- 7-day history

Data resets automatically at midnight or can be manually reset. Firebase sync is available when configured.

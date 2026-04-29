# BlockFlow - 3 Block Day Productivity App

A lightweight productivity web app that helps users reduce scrolling addiction, improve focus, and balance their daily life using the "3 Block Day" system.

## Features

- **Daily Planner**: Three blocks (Focus, Personal, Recovery) with duration settings and completion tracking
- **Focus Timer**: Pomodoro-style timer to track focused work sessions
- **Anti-Scroll System**: Track distractions and monitor focus time vs distraction time
- **Sleep Tracker**: Log sleep and wake times to track sleep duration
- **Daily Reset**: Automatic reset at midnight with 7-day history
- **Offline Support**: PWA with service worker for offline functionality

## Quick Start

### Option 1: Simple HTTP Server

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if installed)
npx serve .
```

Then open http://localhost:8000 in your browser.

### Option 2: Direct File Open

Simply open `index.html` directly in your browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Note: Some features (like service worker) may not work when opening files directly due to browser security restrictions.

## File Structure

```
BlockFlow/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # All styles
├── js/
│   ├── app.js          # Main application logic
│   ├── storage.js      # localStorage management
│   ├── timer.js        # Focus timer logic
│   └── ui.js           # UI rendering
├── icons/
│   └── icon-192.svg    # App icon
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
└── README.md           # This file
```

## Tech Stack

- Pure HTML, CSS, Vanilla JavaScript
- localStorage for data persistence
- No frameworks or build tools required

## Browser Support

- iOS Safari (iOS 15+)
- Chrome, Firefox, Safari, Edge (modern versions)
- Works on low-end devices (iPhone 7 tested)

## Usage

1. **Set Block Times**: Click "Set Time" on each block to set duration
2. **Mark Complete**: Click "Mark Done" when you finish a block
3. **Focus Timer**: Use the 25-minute Pomodoro timer
4. **Track Distractions**: Tap "I got distracted" when you catch yourself scrolling
5. **Sleep Tracking**: Set your sleep and wake times

## Data Storage

All data is stored in browser localStorage:
- Current day's blocks, distractions, focus time
- Sleep times
- 7-day history

Data resets automatically at midnight or can be manually reset.
# BlockFlow v2.3.0 — Universal Calendar Sync

**Release Date:** July 15, 2026

---

## What's New

### Universal Calendar Sync Engine
BlockFlow now supports two-way synchronization with Google Calendar. Your events stay in sync across devices and apps.

### Key Features

- **Two-Way Sync** — Create events in BlockFlow or Google Calendar, and they sync automatically
- **Incremental Sync** — Only changed events are transferred, saving bandwidth and time
- **Offline Support** — Make changes offline; they sync when you reconnect
- **Conflict Resolution** — When the same event is edited in both places, choose which version to keep
- **Multiple Calendars** — Select which Google calendars to sync
- **Background Sync** — Automatic sync every 15 minutes
- **AI Integration** — Nova can see events from all your synced calendars

---

## How to Use

### First Time Setup
1. Go to **Settings** → **Google Calendar**
2. Click **Import from Google Calendar**
3. Sign in with your Google account
4. Grant calendar permissions
5. Select which calendars to sync
6. Click **Save Selection**

### Everyday Use
- Events you create in BlockFlow appear in Google Calendar
- Events you create in Google Calendar appear in BlockFlow
- Edit events anywhere — changes sync automatically
- See the sync status indicator in Settings

### Offline Mode
- Create, edit, and delete events while offline
- Changes are queued automatically
- When you reconnect, changes sync in the background
- Status shows "Offline" until reconnected

---

## What Changed

### Added
- Universal Calendar Sync Engine with unified event model
- Two-way sync between BlockFlow and Google Calendar
- Incremental sync using Google sync tokens
- Offline queue for pending changes
- Conflict detection and resolution UI
- Sync status indicator
- Multiple Google calendar selection
- Background sync every 15 minutes
- Event caching with TTL
- Automatic migration from legacy format
- Pagination for large calendars (5000+ events)
- AI assistant integration with unified event store

### Fixed
- Google Calendar events now persist correctly across sessions
- Offline changes are properly queued and replayed
- Conflict detection prevents data loss during concurrent edits

---

## Technical Details

### New Files
- `js/sync-engine.js` — Core sync infrastructure
- `docs/SYNC_ENGINE.md` — Architecture documentation
- `docs/MIGRATION_GUIDE.md` — User-facing migration guide

### Updated Files
- `js/google-calendar.js` — Two-way sync, multiple calendars
- `js/ai-assistant.js` — Unified event store integration
- `css/style.css` — Sync status and calendar selector styles
- `settings.html` — Calendar selector UI

---

## Known Issues

- Apple Calendar sync is not yet available (planned for future release)
- Some Google Calendar API quotas may apply for heavy usage

---

## Support

- Check the [Migration Guide](../../MIGRATION_GUIDE.md) for help upgrading
- See [Sync Engine Architecture](../../SYNC_ENGINE.md) for technical details
- Report issues on GitHub

---

**Full Changelog:** https://github.com/brianbcyang27-prog/blockflow/commit/49183af

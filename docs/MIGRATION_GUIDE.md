# Calendar Sync Migration Guide

## What Changed

BlockFlow v2.3.0 introduces a new Universal Calendar Sync Engine that provides:
- Two-way sync with Google Calendar
- Offline support with automatic sync
- Conflict resolution when events are edited in multiple places
- Support for multiple Google calendars

## Automatic Migration

Your existing calendar events will be automatically migrated to the new format when you first load BlockFlow after updating. No action is required.

**What happens during migration:**
1. Your existing events are converted to the new unified format
2. All data is preserved - nothing is deleted
3. A migration marker is stored so this only happens once

## Using Google Calendar Sync

### Initial Setup

1. Go to **Settings** → **Google Calendar**
2. Click **Import from Google Calendar**
3. Sign in with your Google account
4. Grant calendar permissions

### Selecting Calendars

1. After signing in, you'll see a list of your Google calendars
2. Check the calendars you want to sync
3. Click **Save Selection**
4. Click **Sync with Google** to start syncing

### Sync Status

The sync status indicator shows:
- **Synced** - All changes are up to date
- **Syncing** - Changes are being uploaded/downloaded
- **Conflict** - Edits detected in both BlockFlow and Google Calendar
- **Offline** - No internet connection (changes will sync when reconnected)

### Conflict Resolution

When the same event is edited in both BlockFlow and Google Calendar:
1. A conflict notification appears
2. Click to resolve
3. Choose: **Keep Local**, **Keep Remote**, or **Keep Both**

## Offline Support

When you're offline:
- Create, edit, and delete events normally
- Changes are queued locally
- When you reconnect, changes sync automatically
- Status shows "Offline" until reconnected

## Multiple Calendars

You can sync multiple Google calendars:
1. Each calendar syncs independently
2. Events from different calendars are distinguished by source
3. AI assistant can see events from all synced calendars

## Troubleshooting

### "Access denied" error
- Make sure you granted calendar permissions
- Try signing out and signing in again

### Events not syncing
- Check the sync status indicator
- Try clicking "Sync with Google" manually
- If offline, wait for reconnection

### Conflicts not resolving
- Refresh the page and try again
- Check that you have internet connection

### Performance issues
- Large calendars (5000+ events) use pagination
- Background sync runs every 15 minutes
- Event caching reduces API calls

## Need Help?

- Check the [Sync Engine Architecture](SYNC_ENGINE.md) for technical details
- Report issues on GitHub

# SyncEngine Architecture

## Overview

SyncEngine is a unified calendar synchronization module for BlockFlow that provides:
- Two-way sync between BlockFlow and external calendar providers (Google Calendar, Apple Calendar)
- Conflict detection and resolution
- Offline queue for pending changes
- Background sync with caching
- Migration from legacy event format

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BlockFlow App                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard   │  │  Calendar   │  │  AI Chat    │        │
│  │  (index.html)│  │(calendar.html)│ │(nova)      │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    ┌─────▼─────┐                           │
│                    │ SyncEngine │                           │
│                    └─────┬─────┘                           │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐       │
│  │   Storage   │  │   Google    │  │   Apple     │       │
│  │  (localStorage)│ │  Calendar  │  │  Calendar   │       │
│  └─────────────┘  │   (API)     │  │  (EventKit) │       │
│                    └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Unified Event Model

All calendar events are stored in a unified format:

```javascript
{
  id: string,                    // Unique identifier
  provider: 'local' | 'google' | 'apple',
  providerEventId: string | null, // ID from external provider
  calendarId: string,            // Provider-specific calendar ID
  title: string,
  description: string,
  location: string,
  start: string,                 // ISO 8601 datetime
  end: string,                   // ISO 8601 datetime
  allDay: boolean,
  color: string | null,
  importance: 'low' | 'medium' | 'high',
  block: 'focus' | 'personal' | 'recovery',
  syncState: 'pending' | 'synced' | 'conflict' | 'error',
  lastSynced: number | null,     // Timestamp
  version: number,               // For conflict detection
  createdAt: number,
  updatedAt: number,
  deleted: boolean,
  deletedAt: number | null,
  remoteSnapshot: object | null   // For conflict resolution
}
```

## Core Functions

### Event Management

- `createEvent(event)` - Create a new unified event
- `addEvent(event)` - Add event to store and notify listeners
- `updateEvent(id, changes)` - Update event with changes
- `deleteEvent(id)` - Soft-delete event
- `hardDeleteEvent(id)` - Permanently remove event
- `getEvents(filter)` - Get events with optional filtering
- `getEvent(id)` - Get single event by ID

### Sync Management

- `getSyncToken(provider, calendarId)` - Get sync token for incremental sync
- `saveSyncToken(provider, calendarId, token)` - Save sync token
- `queueOperation(op)` - Queue offline operation
- `getPendingOperations(provider)` - Get pending operations
- `completeOperation(id)` - Mark operation complete
- `failOperation(id)` - Mark operation failed

### Conflict Resolution

- `detectConflict(local, remote)` - Detect if conflict exists
- `resolveConflict(id, resolution)` - Resolve conflict
- `getConflicts()` - Get all conflicts

### Performance

- `getEventsCached(filter)` - Get events with caching
- `getEventsPaginated(filter, page, pageSize)` - Get paginated events
- `invalidateCache()` - Clear event cache

## Google Calendar Integration

### Authentication

Google Calendar uses OAuth 2.0 with the following flow:

1. User clicks "Import from Google Calendar"
2. Google Identity Services loads token client
3. User grants calendar permissions
4. Access token is obtained and stored
5. Token is refreshed automatically before expiry

### Sync Flow

1. **Initial Sync**: Fetch all events from Google Calendar
2. **Incremental Sync**: Use sync tokens to fetch only changes
3. **Push Changes**: Upload local changes to Google Calendar
4. **Conflict Detection**: Compare timestamps to detect conflicts

### Sync Tokens

Google Calendar API uses sync tokens for efficient incremental sync:

- After initial sync, a `nextSyncToken` is returned
- Store this token for subsequent syncs
- If token expires (HTTP 410), perform full resync
- Each calendar has its own sync token

### Multiple Calendars

Users can select which Google calendars to sync:

1. Fetch calendar list from Google
2. Display selection UI
3. Store selected calendars in localStorage
4. Sync each selected calendar independently

## Offline Queue

When offline, changes are queued and replayed when connection is restored:

1. Create offline operation with event changes
2. Store in SyncEngine's operation queue
3. On reconnect, replay queue in order
4. Mark operations as complete or failed

## Conflict Resolution

When conflicts are detected (both local and remote changed):

1. Show conflict resolution UI
2. User chooses: Keep Local, Keep Remote, or Keep Both
3. Apply resolution and sync to provider

## Background Sync

SyncEngine runs background sync every 15 minutes:

1. Check if Google Calendar is authenticated
2. Sync all selected calendars
3. Update sync status UI
4. Refresh calendar view

## Migration

Legacy events from localStorage are automatically migrated:

1. Check if migration needed (no migration marker)
2. Convert legacy event format to unified model
3. Preserve all existing data
4. Mark migration complete

## API Reference

See individual function documentation in `js/sync-engine.js`.

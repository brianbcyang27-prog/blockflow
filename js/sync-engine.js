var SyncEngine = (function() {
  'use strict';

  var STORAGE_KEY = 'blockflow_sync_events';
  var SYNC_TOKENS_KEY = 'blockflow_sync_tokens';
  var SYNC_QUEUE_KEY = 'blockflow_sync_queue';
  var SYNC_STATUS_KEY = 'blockflow_sync_status';
  var MIGRATION_VERSION = '2.3.0';
  var MIGRATION_KEY = 'blockflow_sync_migration';

  var eventStore = {};
  var syncTokens = {};
  var syncQueue = [];
  var syncStatus = {};
  var listeners = [];

  function generateId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  function createEvent(data) {
    var now = Date.now();
    return {
      id: data.id || generateId(),
      provider: data.provider || 'local',
      providerEventId: data.providerEventId || null,
      calendarId: data.calendarId || 'local',
      title: data.title || 'Untitled',
      description: data.description || '',
      location: data.location || '',
      start: data.start || new Date().toISOString(),
      end: data.end || data.start || new Date().toISOString(),
      allDay: data.allDay || false,
      color: data.color || null,
      importance: data.importance || 'medium',
      block: data.block || 'focus',
      syncState: data.syncState || 'synced',
      lastSynced: data.lastSynced || now,
      syncToken: data.syncToken || null,
      version: data.version || 1,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      deleted: data.deleted || false,
      deletedAt: data.deletedAt || null
    };
  }

  function validateEvent(event) {
    var errors = [];
    if (!event || typeof event !== 'object') return { valid: false, errors: ['Event must be an object'] };
    if (!event.id || typeof event.id !== 'string') errors.push('id required');
    if (!event.provider || typeof event.provider !== 'string') errors.push('provider required');
    if (!event.title || typeof event.title !== 'string') errors.push('title required');
    if (!event.start || typeof event.start !== 'string') errors.push('start required');
    if (!event.end || typeof event.end !== 'string') errors.push('end required');
    if (['local', 'google', 'apple', 'outlook'].indexOf(event.provider) === -1) errors.push('invalid provider');
    if (['synced', 'pending', 'conflict', 'error'].indexOf(event.syncState) === -1) errors.push('invalid syncState');
    if (['high', 'medium', 'low'].indexOf(event.importance) === -1) errors.push('invalid importance');
    if (['focus', 'personal', 'recovery'].indexOf(event.block) === -1) errors.push('invalid block');
    if (typeof event.allDay !== 'boolean') errors.push('allDay must be boolean');
    if (typeof event.version !== 'number') errors.push('version must be number');
    if (typeof event.deleted !== 'boolean') errors.push('deleted must be boolean');
    if (event.start && isNaN(Date.parse(event.start))) errors.push('invalid start date');
    if (event.end && isNaN(Date.parse(event.end))) errors.push('invalid end date');
    return { valid: errors.length === 0, errors: errors };
  }

  function getEvents(filter) {
    var events = Object.values(eventStore);
    if (!filter) return events;
    return events.filter(function(e) {
      if (filter.provider && e.provider !== filter.provider) return false;
      if (filter.calendarId && e.calendarId !== filter.calendarId) return false;
      if (filter.syncState && e.syncState !== filter.syncState) return false;
      if (filter.deleted !== undefined && e.deleted !== filter.deleted) return false;
      if (filter.startAfter && new Date(e.start) < new Date(filter.startAfter)) return false;
      if (filter.startBefore && new Date(e.start) > new Date(filter.startBefore)) return false;
      return true;
    });
  }

  function getEvent(eventId) {
    return eventStore[eventId] || null;
  }

  function addEvent(event) {
    var validation = validateEvent(event);
    if (!validation.valid) throw new Error('Invalid event: ' + validation.errors.join(', '));
    eventStore[event.id] = event;
    saveToStorage();
    notifyListeners('add', event);
    return event;
  }

  function updateEvent(eventId, updates) {
    var event = eventStore[eventId];
    if (!event) throw new Error('Event not found: ' + eventId);
    var updated = Object.assign({}, event, updates, {
      updatedAt: Date.now(),
      version: event.version + 1
    });
    var validation = validateEvent(updated);
    if (!validation.valid) throw new Error('Invalid update: ' + validation.errors.join(', '));
    eventStore[eventId] = updated;
    saveToStorage();
    notifyListeners('update', updated);
    return updated;
  }

  function deleteEvent(eventId) {
    var event = eventStore[eventId];
    if (!event) throw new Error('Event not found: ' + eventId);
    var deleted = Object.assign({}, event, {
      deleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      version: event.version + 1,
      syncState: 'pending'
    });
    eventStore[eventId] = deleted;
    saveToStorage();
    notifyListeners('delete', deleted);
    return deleted;
  }

  function hardDeleteEvent(eventId) {
    delete eventStore[eventId];
    saveToStorage();
    notifyListeners('hardDelete', { id: eventId });
  }

  function loadFromStorage() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (data) eventStore = JSON.parse(data);
    } catch (e) { eventStore = {}; }
    try {
      var t = localStorage.getItem(SYNC_TOKENS_KEY);
      if (t) syncTokens = JSON.parse(t);
    } catch (e) { syncTokens = {}; }
    try {
      var q = localStorage.getItem(SYNC_QUEUE_KEY);
      if (q) syncQueue = JSON.parse(q);
    } catch (e) { syncQueue = []; }
    try {
      var s = localStorage.getItem(SYNC_STATUS_KEY);
      if (s) syncStatus = JSON.parse(s);
    } catch (e) { syncStatus = {}; }
  }

  function saveToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(eventStore)); } catch (e) {}
  }

  function saveSyncTokens() {
    try { localStorage.setItem(SYNC_TOKENS_KEY, JSON.stringify(syncTokens)); } catch (e) {}
  }

  function saveSyncQueue() {
    try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue)); } catch (e) {}
  }

  function saveSyncStatus() {
    try { localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus)); } catch (e) {}
  }

  function getSyncToken(providerId, calendarId) {
    return syncTokens[providerId + ':' + calendarId] || null;
  }

  function saveSyncToken(providerId, calendarId, token) {
    syncTokens[providerId + ':' + calendarId] = token;
    saveSyncTokens();
  }

  function queueOperation(operation) {
    var op = {
      id: generateId(),
      type: operation.type,
      eventId: operation.eventId,
      data: operation.data,
      providerId: operation.providerId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
      status: 'pending'
    };
    syncQueue.push(op);
    saveSyncQueue();
    return op;
  }

  function getPendingOperations(providerId) {
    return syncQueue.filter(function(op) {
      if (op.status !== 'pending') return false;
      if (providerId && op.providerId !== providerId) return false;
      return true;
    });
  }

  function completeOperation(operationId) {
    syncQueue = syncQueue.filter(function(op) { return op.id !== operationId; });
    saveSyncQueue();
  }

  function failOperation(operationId) {
    for (var i = 0; i < syncQueue.length; i++) {
      if (syncQueue[i].id === operationId) {
        syncQueue[i].retryCount++;
        syncQueue[i].status = syncQueue[i].retryCount >= syncQueue[i].maxRetries ? 'failed' : 'pending';
        saveSyncQueue();
        return syncQueue[i].status === 'pending';
      }
    }
    return false;
  }

  function getSyncStatus(providerId) {
    return syncStatus[providerId] || { status: 'disconnected', lastSynced: null, error: null };
  }

  function updateSyncStatus(providerId, status) {
    syncStatus[providerId] = Object.assign({}, syncStatus[providerId] || {}, status);
    saveSyncStatus();
    notifyListeners('statusChange', { providerId: providerId, status: syncStatus[providerId] });
  }

  function onChanges(callback) {
    listeners.push(callback);
    return function() {
      listeners = listeners.filter(function(l) { return l !== callback; });
    };
  }

  function notifyListeners(eventType, data) {
    listeners.forEach(function(cb) {
      try { cb(eventType, data); } catch (e) {}
    });
  }

  function detectConflict(localEvent, remoteEvent) {
    if (!localEvent || !remoteEvent) return false;
    if (localEvent.version > 1 && remoteEvent.updatedAt > localEvent.lastSynced) {
      return true;
    }
    return false;
  }

  function resolveConflict(eventId, resolution) {
    var event = eventStore[eventId];
    if (!event) throw new Error('Event not found: ' + eventId);

    if (resolution === 'local') {
      return updateEvent(eventId, { syncState: 'pending' });
    } else if (resolution === 'remote' && event.remoteSnapshot) {
      return updateEvent(eventId, Object.assign({}, event.remoteSnapshot, {
        syncState: 'synced',
        lastSynced: Date.now()
      }));
    } else if (resolution === 'merge' && event.remoteSnapshot) {
      var merged = Object.assign({}, event.remoteSnapshot, {
        title: event.title,
        description: event.description,
        location: event.location,
        importance: event.importance,
        block: event.block
      });
      return updateEvent(eventId, Object.assign({}, merged, {
        syncState: 'synced',
        lastSynced: Date.now()
      }));
    }
    throw new Error('Invalid resolution: ' + resolution);
  }

  function getConflicts() {
    return getEvents({ syncState: 'conflict' });
  }

  function needsMigration() {
    try { return !localStorage.getItem(MIGRATION_KEY); } catch (e) { return true; }
  }

  function convertLegacyEvent(legacy) {
    var provider = 'local';
    var providerEventId = null;
    var calendarId = 'local';
    if (legacy.googleEventId) {
      provider = 'google';
      providerEventId = legacy.googleEventId;
      calendarId = 'primary';
    }
    var dateStr = legacy.date || new Date().toISOString().split('T')[0];
    var start = legacy.time ? dateStr + 'T' + legacy.time + ':00' : dateStr + 'T00:00:00';
    var end;
    if (legacy.endTime) {
      end = dateStr + 'T' + legacy.endTime + ':00';
    } else if (legacy.time) {
      var d = new Date(start);
      d.setHours(d.getHours() + 1);
      end = d.toISOString();
    } else {
      end = dateStr + 'T23:59:59';
    }
    return createEvent({
      id: legacy.id,
      provider: provider,
      providerEventId: providerEventId,
      calendarId: calendarId,
      title: legacy.title || 'Untitled',
      description: legacy.description || '',
      location: legacy.location || '',
      start: start,
      end: end,
      allDay: !legacy.time,
      color: legacy.color || null,
      importance: legacy.importance || 'medium',
      block: legacy.block || 'focus',
      syncState: 'synced',
      lastSynced: legacy.createdAt || Date.now(),
      version: 1,
      createdAt: legacy.createdAt || Date.now(),
      updatedAt: legacy.updatedAt || legacy.createdAt || Date.now(),
      deleted: false,
      deletedAt: null
    });
  }

  function migrateLegacyEvents() {
    var result = { migrated: 0, errors: [] };
    try {
      var legacyData = localStorage.getItem('blockflow_calendar_events');
      if (legacyData) {
        var legacyEvents = JSON.parse(legacyData);
        if (Array.isArray(legacyEvents)) {
          legacyEvents.forEach(function(legacy) {
            try {
              var unified = convertLegacyEvent(legacy);
              if (!eventStore[unified.id]) { addEvent(unified); result.migrated++; }
            } catch (e) { result.errors.push({ eventId: legacy.id, error: e.message }); }
          });
        }
      }
      var aiData = localStorage.getItem('blockflow_ai_calendar_events');
      if (aiData) {
        var aiEvents = JSON.parse(aiData);
        if (Array.isArray(aiEvents)) {
          aiEvents.forEach(function(legacy) {
            try {
              var unified = convertLegacyEvent(legacy);
              if (!eventStore[unified.id]) { addEvent(unified); result.migrated++; }
            } catch (e) { result.errors.push({ eventId: legacy.id, error: e.message }); }
          });
        }
      }
      markMigrationComplete();
    } catch (e) { result.errors.push({ error: 'Migration failed: ' + e.message }); }
    return result;
  }

  function markMigrationComplete() {
    try {
      localStorage.setItem(MIGRATION_KEY, JSON.stringify({
        completed: true, version: MIGRATION_VERSION, completedAt: new Date().toISOString()
      }));
    } catch (e) {}
  }

  function init(options) {
    options = options || {};
    loadFromStorage();
    if (options.autoMigrate !== false && needsMigration()) {
      var result = migrateLegacyEvents();
      console.log('SyncEngine: Migration complete', result);
    }
    if (options.backgroundSync !== false) {
      startBackgroundSync();
    }
    return true;
  }

  var backgroundSyncInterval = null;

  function startBackgroundSync() {
    if (backgroundSyncInterval) return;
    backgroundSyncInterval = setInterval(function() {
      if (typeof GoogleCalendar !== 'undefined' && GoogleCalendar.isTokenValid()) {
        GoogleCalendar.syncAllCalendars();
      }
    }, 15 * 60 * 1000);
  }

  function stopBackgroundSync() {
    if (backgroundSyncInterval) {
      clearInterval(backgroundSyncInterval);
      backgroundSyncInterval = null;
    }
  }

  var eventCache = {};
  var cacheTTL = 5 * 60 * 1000;

  function getEventsCached(filter) {
    var cacheKey = JSON.stringify(filter || {});
    var cached = eventCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      return cached.events;
    }
    var events = getEvents(filter);
    eventCache[cacheKey] = { events: events, timestamp: Date.now() };
    return events;
  }

  function invalidateCache() {
    eventCache = {};
  }

  function getEventsPaginated(filter, page, pageSize) {
    page = page || 0;
    pageSize = pageSize || 100;
    var events = getEvents(filter);
    var start = page * pageSize;
    var end = start + pageSize;
    return {
      events: events.slice(start, end),
      total: events.length,
      page: page,
      pageSize: pageSize,
      hasMore: end < events.length
    };
  }

  return {
    createEvent: createEvent,
    validateEvent: validateEvent,
    getEvents: getEvents,
    getEventsCached: getEventsCached,
    getEventsPaginated: getEventsPaginated,
    invalidateCache: invalidateCache,
    getEvent: getEvent,
    addEvent: addEvent,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    hardDeleteEvent: hardDeleteEvent,
    getSyncToken: getSyncToken,
    saveSyncToken: saveSyncToken,
    queueOperation: queueOperation,
    getPendingOperations: getPendingOperations,
    completeOperation: completeOperation,
    failOperation: failOperation,
    getSyncStatus: getSyncStatus,
    updateSyncStatus: updateSyncStatus,
    onChanges: onChanges,
    detectConflict: detectConflict,
    resolveConflict: resolveConflict,
    getConflicts: getConflicts,
    needsMigration: needsMigration,
    migrateLegacyEvents: migrateLegacyEvents,
    init: init,
    generateId: generateId,
    startBackgroundSync: startBackgroundSync,
    stopBackgroundSync: stopBackgroundSync
  };
})();

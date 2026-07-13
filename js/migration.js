(function () {
  'use strict';

  var MIGRATION_VERSION = 1;
  var STORAGE_KEYS = {
    history: 'blockflow_ai_history',
    memory: 'blockflow_ai_memory',
    events: 'blockflow_calendar_events',
    historyRecords: 'blockflow_history'
  };

  function getLocal(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function hasLocalData() {
    return !!(getLocal(STORAGE_KEYS.history) || getLocal(STORAGE_KEYS.memory) ||
              getLocal(STORAGE_KEYS.events) || getLocal(STORAGE_KEYS.historyRecords));
  }

  async function migrateToFirestore() {
    if (typeof FirebaseAuth === 'undefined' || typeof FirebaseDB === 'undefined') return;
    if (!FirebaseAuth.isSignedIn() || FirebaseAuth.isBypassMode()) return;

    var status = await FirebaseDB.getMigrationStatus();
    if (status && status.completed && status.version >= MIGRATION_VERSION) {
      console.log('[Migration] Already completed (v' + status.version + ')');
      return;
    }

    if (!hasLocalData()) {
      console.log('[Migration] No local data to migrate');
      await FirebaseDB.setMigrationComplete(MIGRATION_VERSION);
      return;
    }

    console.log('[Migration] Starting localStorage → Firestore migration');

    var aiHistory = getLocal(STORAGE_KEYS.history);
    if (aiHistory && Array.isArray(aiHistory) && aiHistory.length > 0) {
      var existing = await FirebaseDB.getAiHistory();
      if (!existing || existing.length === 0) {
        await FirebaseDB.saveAiHistory(aiHistory);
        console.log('[Migration] Migrated ' + aiHistory.length + ' AI history messages');
      }
    }

    var aiMemory = getLocal(STORAGE_KEYS.memory);
    if (aiMemory && Array.isArray(aiMemory) && aiMemory.length > 0) {
      var existingMem = await FirebaseDB.getAiMemory();
      if (!existingMem || existingMem.length === 0) {
        await FirebaseDB.saveAiMemory(aiMemory);
        console.log('[Migration] Migrated ' + aiMemory.length + ' AI memory points');
      }
    }

    var events = getLocal(STORAGE_KEYS.events);
    if (events && Array.isArray(events) && events.length > 0) {
      var existingEvents = await FirebaseDB.getEvents();
      if (!existingEvents || existingEvents.length === 0) {
        for (var i = 0; i < events.length; i++) {
          await FirebaseDB.saveEvent(events[i]);
        }
        console.log('[Migration] Migrated ' + events.length + ' calendar events');
      }
    }

    var historyRecords = getLocal(STORAGE_KEYS.historyRecords);
    if (historyRecords && Array.isArray(historyRecords) && historyRecords.length > 0) {
      var existingHistory = await FirebaseDB.getHistory();
      if (!existingHistory || existingHistory.length === 0) {
        await FirebaseDB.saveHistory(historyRecords);
        console.log('[Migration] Migrated ' + historyRecords.length + ' history records');
      }
    }

    await FirebaseDB.setMigrationComplete(MIGRATION_VERSION);
    console.log('[Migration] Migration complete');
  }

  async function syncFromFirestoreToLocalStorage() {
    if (typeof FirebaseAuth === 'undefined' || typeof FirebaseDB === 'undefined') return;
    if (!FirebaseAuth.isSignedIn() || FirebaseAuth.isBypassMode()) return;

    try {
      var firestoreHistory = await FirebaseDB.getAiHistory();
      if (firestoreHistory && firestoreHistory.length > 0) {
        var localHistory = getLocal(STORAGE_KEYS.history);
        if (!localHistory || localHistory.length === 0) {
          localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(firestoreHistory));
          console.log('[Sync] Loaded AI history from Firestore');
        }
      }

      var firestoreMemory = await FirebaseDB.getAiMemory();
      if (firestoreMemory && firestoreMemory.length > 0) {
        var localMemory = getLocal(STORAGE_KEYS.memory);
        if (!localMemory || localMemory.length === 0) {
          localStorage.setItem(STORAGE_KEYS.memory, JSON.stringify(firestoreMemory));
          console.log('[Sync] Loaded AI memory from Firestore');
        }
      }
    } catch (e) {
      console.warn('[Sync] Error syncing from Firestore:', e);
    }
  }

  var BlockflowMigration = {
    migrate: migrateToFirestore,
    syncDown: syncFromFirestoreToLocalStorage,
    run: async function() {
      await migrateToFirestore();
      await syncFromFirestoreToLocalStorage();
    }
  };

  window.BlockflowMigration = BlockflowMigration;

  if (typeof FirebaseAuth !== 'undefined') {
    FirebaseAuth.onAuthChange(function (user) {
      if (user && !user.isAnonymous) {
        setTimeout(function () { BlockflowMigration.run(); }, 1500);
      }
    });
  }
})();

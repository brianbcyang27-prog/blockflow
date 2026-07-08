const Storage = {
    STORAGE_KEY: 'blockflow_data',
    HISTORY_KEY: 'blockflow_history',
    CALENDAR_KEY: 'blockflow_calendar_events',
    SETTINGS_KEY: 'blockflow_app_settings',
    MAX_HISTORY_DAYS: 7,

    isLocalStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('localStorage read error:', e);
            return null;
        }
    },

    safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error('localStorage write error:', e);
            alert('Storage error: Unable to save data. Please clear some browser storage and try again.');
            return false;
        }
    },

    getData() {
        if (!this.isLocalStorageAvailable()) {
            alert('localStorage is not available. Your data will not be saved.');
            return this.getDefaultData();
        }
        const data = this.safeGetItem(this.STORAGE_KEY);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('Failed to parse stored data:', e);
                return this.getDefaultData();
            }
        }
        return this.getDefaultData();
    },

    getDefaultData() {
        return {
            date: this.getTodayDate(),
            blocks: {
                focus: { duration: 25, completed: false, timeSpent: 0 },
                personal: { duration: 60, completed: false, timeSpent: 0 },
                recovery: { duration: 60, completed: false, timeSpent: 0 }
            },
            distractions: 0,
            focusTime: 0,
            sleep: { sleepTime: '22:00', wakeTime: '07:00' }
        };
    },

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    },

    saveData(data) {
        return this.safeSetItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    checkAndResetDay() {
        const data = this.getData();
        const today = this.getTodayDate();
        
        if (data.date !== today) {
            this.saveToHistory(data);
            const newData = this.getDefaultData();
            newData.sleep = data.sleep;
            this.saveData(newData);
            return true;
        }
        return false;
    },

    saveToHistory(data) {
        let history = this.getHistory();
        history.push({
            date: data.date,
            blocks: data.blocks,
            distractions: data.distractions,
            focusTime: data.focusTime,
            sleep: data.sleep
        });

        if (history.length > this.MAX_HISTORY_DAYS) {
            history = history.slice(-this.MAX_HISTORY_DAYS);
        }

        this.safeSetItem(this.HISTORY_KEY, JSON.stringify(history));
        if (FirebaseDB && FirebaseDB.isReady()) {
            FirebaseDB.saveHistory(history);
        }
    },

    getHistory() {
        const history = this.safeGetItem(this.HISTORY_KEY);
        if (!history) return [];
        try {
            return JSON.parse(history);
        } catch (e) {
            console.error('Failed to parse history:', e);
            return [];
        }
    },

    updateBlock(blockId, updates) {
        const data = this.getData();
        if (data.blocks[blockId]) {
            data.blocks[blockId] = { ...data.blocks[blockId], ...updates };
            this.saveData(data);
        }
        return data;
    },

    incrementDistraction() {
        const data = this.getData();
        data.distractions += 1;
        this.saveData(data);
        return data;
    },

    addFocusTime(minutes) {
        const data = this.getData();
        data.focusTime += minutes;
        this.saveData(data);
        return data;
    },

    saveSleep(sleepTime, wakeTime) {
        const data = this.getData();
        data.sleep = { sleepTime, wakeTime };
        this.saveData(data);
        return data;
    },

    calculateSleepDuration(sleepTime, wakeTime) {
        const [sleepH, sleepM] = sleepTime.split(':').map(Number);
        const [wakeH, wakeM] = wakeTime.split(':').map(Number);
        
        let sleepMinutes = sleepH * 60 + sleepM;
        let wakeMinutes = wakeH * 60 + wakeM;
        
        if (wakeMinutes < sleepMinutes) {
            wakeMinutes += 24 * 60;
        }
        
        const durationMinutes = wakeMinutes - sleepMinutes;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        return { hours, minutes };
    },

    manualReset() {
        const data = this.getDefaultData();
        this.saveData(data);
        return data;
    },

    getCalendarEvents() {
        const data = this.safeGetItem(this.CALENDAR_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse calendar events:', e);
            return [];
        }
    },

    saveCalendarEvents(events) {
        const ok = this.safeSetItem(this.CALENDAR_KEY, JSON.stringify(events));
        if (FirebaseDB && FirebaseDB.isReady()) {
            events.forEach(function(evt) {
                FirebaseDB.saveEvent(evt);
            });
        }
        return ok;
    },

    addCalendarEvent(event) {
        const events = this.getCalendarEvents();
        const newEvent = {
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            title: event.title || 'Untitled',
            date: event.date || '',
            time: event.time || '',
            endTime: event.endTime || '',
            description: event.description || '',
            importance: event.importance || 'medium',
            block: event.block || 'focus',
            aiAnalyzed: event.aiAnalyzed || false,
            createdAt: Date.now()
        };
        events.push(newEvent);
        this.saveCalendarEvents(events);
        if (FirebaseDB && FirebaseDB.isReady()) {
            FirebaseDB.saveEvent(newEvent);
        }
        return newEvent;
    },

    updateCalendarEvent(eventId, updates) {
        const events = this.getCalendarEvents();
        const index = events.findIndex(function(e) { return e.id === eventId; });
        if (index === -1) return null;
        events[index] = Object.assign({}, events[index], updates);
        this.saveCalendarEvents(events);
        if (FirebaseDB && FirebaseDB.isReady()) {
            FirebaseDB.saveEvent(events[index]);
        }
        return events[index];
    },

    deleteCalendarEvent(eventId) {
        const events = this.getCalendarEvents();
        const filtered = events.filter(function(e) { return e.id !== eventId; });
        this.saveCalendarEvents(filtered);
        if (FirebaseDB && FirebaseDB.isReady()) {
            FirebaseDB.deleteEvent(eventId);
        }
        return filtered;
    },

    syncFromFirestore: async function() {
        if (!FirebaseDB || !FirebaseDB.isReady()) return;
        const events = await FirebaseDB.getEvents();
        if (events && events.length > 0) {
            this.safeSetItem(this.CALENDAR_KEY, JSON.stringify(events));
        }
        const history = await FirebaseDB.getHistory();
        if (history && history.length > 0) {
            this.safeSetItem(this.HISTORY_KEY, JSON.stringify(history));
        }
        const settings = await FirebaseDB.getSettings();
        if (settings) {
            this.safeSetItem(this.SETTINGS_KEY, JSON.stringify(settings));
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}

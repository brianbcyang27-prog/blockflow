const Storage = {
    STORAGE_KEY: 'blockflow_data',
    HISTORY_KEY: 'blockflow_history',
    MAX_HISTORY_DAYS: 7,

    getData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return this.getDefaultData();
    },

    getDefaultData() {
        return {
            date: this.getTodayDate(),
            blocks: {
                focus: { duration: 60, completed: false, timeSpent: 0 },
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
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
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

        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    },

    getHistory() {
        const history = localStorage.getItem(this.HISTORY_KEY);
        return history ? JSON.parse(history) : [];
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
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
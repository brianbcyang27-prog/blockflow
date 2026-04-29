const App = {
    currentData: null,
    currentBlockId: null,

    init() {
        Storage.checkAndResetDay();
        this.loadData();
        this.setupEventListeners();
        this.setupTimer();
        UI.init();
        this.render();
    },

    loadData() {
        this.currentData = Storage.getData();
    },

    render() {
        UI.renderBlocks(this.currentData.blocks);
        UI.updateDistractionCount(this.currentData.distractions);
        UI.updateFocusTime(this.currentData.focusTime);
        
        const sleepDuration = Storage.calculateSleepDuration(
            this.currentData.sleep.sleepTime,
            this.currentData.sleep.wakeTime
        );
        UI.updateSleepDuration(sleepDuration.hours, sleepDuration.minutes);
        
        UI.elements.sleepTime.value = this.currentData.sleep.sleepTime;
        UI.elements.wakeTime.value = this.currentData.sleep.wakeTime;
    },

    setupEventListeners() {
        UI.elements.logDistraction.addEventListener('click', () => {
            this.currentData = Storage.incrementDistraction();
            UI.updateDistractionCount(this.currentData.distractions);
            UI.animateDistraction();
        });

        UI.elements.saveSleep.addEventListener('click', () => {
            const sleepTime = UI.elements.sleepTime.value;
            const wakeTime = UI.elements.wakeTime.value;
            this.currentData = Storage.saveSleep(sleepTime, wakeTime);
            
            const duration = Storage.calculateSleepDuration(sleepTime, wakeTime);
            UI.updateSleepDuration(duration.hours, duration.minutes);
        });

        UI.elements.dailyReset.addEventListener('click', () => {
            if (confirm('Reset all data for today?')) {
                this.currentData = Storage.manualReset();
                this.render();
                Timer.reset();
            }
        });

        UI.elements.saveBlockSettings.addEventListener('click', () => {
            const blockId = UI.getBlockSettingsBlockId();
            const duration = UI.getBlockSettingsDuration();
            this.currentData = Storage.updateBlock(blockId, { duration });
            UI.hideBlockSettingsModal();
            this.render();
        });

        UI.elements.cancelBlockSettings.addEventListener('click', () => {
            UI.hideBlockSettingsModal();
        });

        UI.elements.blockSettingsModal.addEventListener('click', (e) => {
            if (e.target === UI.elements.blockSettingsModal) {
                UI.hideBlockSettingsModal();
            }
        });
    },

    setupTimer() {
        Timer.init(
            (time) => {
                UI.updateTimerDisplay(time);
            },
            () => {
                UI.updateTimerStatus('Focus session complete!');
                UI.updateTimerButtons(false);
                UI.toggleFocusMode(false);
                
                const minutes = Timer.getElapsedMinutes();
                this.currentData = Storage.addFocusTime(minutes);
                UI.updateFocusTime(this.currentData.focusTime);
                
                alert('Great job! Focus session complete.');
            }
        );

        UI.elements.startTimer.addEventListener('click', () => {
            Timer.start();
            UI.updateTimerButtons(true);
            UI.updateTimerStatus('Focusing...');
            UI.toggleFocusMode(true);
        });

        UI.elements.pauseTimer.addEventListener('click', () => {
            Timer.pause();
            UI.updateTimerButtons(false);
            UI.updateTimerStatus('Paused');
            UI.toggleFocusMode(false);
            
            const minutes = Timer.getElapsedMinutes();
            if (minutes > 0) {
                this.currentData = Storage.addFocusTime(minutes);
                UI.updateFocusTime(this.currentData.focusTime);
            }
        });

        UI.elements.resetTimer.addEventListener('click', () => {
            Timer.reset();
            UI.updateTimerButtons(false);
            UI.updateTimerStatus('Ready to focus');
            UI.toggleFocusMode(false);
        });
    },

    openBlockSettings(blockId) {
        this.currentBlockId = blockId;
        const currentDuration = this.currentData.blocks[blockId].duration;
        UI.showBlockSettingsModal(blockId, currentDuration);
    },

    toggleBlockComplete(blockId) {
        const block = this.currentData.blocks[blockId];
        const newCompleted = !block.completed;
        this.currentData = Storage.updateBlock(blockId, { 
            completed: newCompleted,
            timeSpent: newCompleted ? block.duration : 0
        });
        this.render();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
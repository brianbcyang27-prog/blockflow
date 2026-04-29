const UI = {
    elements: {},

    init() {
        this.cacheElements();
        this.setCurrentDate();
    },

    cacheElements() {
        this.elements = {
            currentDate: document.getElementById('currentDate'),
            blocksContainer: document.getElementById('blocksContainer'),
            timerTime: document.getElementById('timerTime'),
            startTimer: document.getElementById('startTimer'),
            pauseTimer: document.getElementById('pauseTimer'),
            resetTimer: document.getElementById('resetTimer'),
            timerStatus: document.getElementById('timerStatus'),
            logDistraction: document.getElementById('logDistraction'),
            distractionCount: document.getElementById('distractionCount'),
            focusTime: document.getElementById('focusTime'),
            sleepTime: document.getElementById('sleepTime'),
            wakeTime: document.getElementById('wakeTime'),
            saveSleep: document.getElementById('saveSleep'),
            sleepDuration: document.getElementById('sleepDuration'),
            dailyReset: document.getElementById('dailyReset'),
            blockSettingsModal: document.getElementById('blockSettingsModal'),
            blockDuration: document.getElementById('blockDuration'),
            saveBlockSettings: document.getElementById('saveBlockSettings'),
            cancelBlockSettings: document.getElementById('cancelBlockSettings')
        };
    },

    setCurrentDate() {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.elements.currentDate.textContent = `Today: ${today.toLocaleDateString('en-US', options)}`;
    },

    renderBlocks(blocks) {
const blockTypes = [
{ id: 'focus', title: '🎯 Focus Block', subtitle: 'School/Work' },
{ id: 'personal', title: '📚 Personal Block', subtitle: 'Hobbies/Projects' },
{ id: 'recovery', title: '🧘 Recovery Block', subtitle: 'Rest/Social' }
];

        this.elements.blocksContainer.innerHTML = blockTypes.map(block => {
            const data = blocks[block.id];
            const progress = data.duration > 0 ? (data.timeSpent / data.duration) * 100 : 0;
            const isCompleted = data.completed;
            
            return `
                <div class="block block-${block.id} ${isCompleted ? 'block-completed' : ''}" data-block-id="${block.id}">
                    <div class="block-header">
                        <div>
                            <div class="block-title">${block.title}</div>
                            <small style="color: #6c757d;">${block.subtitle}</small>
                        </div>
                        <span class="block-duration">${data.duration} min</span>
                    </div>
                    <div class="block-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                    </div>
                    <div class="block-actions">
                        <button class="btn btn-primary" onclick="App.openBlockSettings('${block.id}')">Set Time</button>
                        <button class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}" onclick="App.toggleBlockComplete('${block.id}')">
                            ${isCompleted ? 'Completed' : 'Mark Done'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    updateTimerDisplay(time) {
        this.elements.timerTime.textContent = time;
    },

    updateTimerButtons(isRunning) {
        this.elements.startTimer.disabled = isRunning;
        this.elements.startTimer.textContent = isRunning ? 'Focusing...' : 'Start Focus';
        this.elements.pauseTimer.disabled = !isRunning;
    },

    updateTimerStatus(status) {
        this.elements.timerStatus.textContent = status;
    },

    updateDistractionCount(count) {
        this.elements.distractionCount.textContent = count;
    },

    updateFocusTime(minutes) {
        this.elements.focusTime.textContent = `${minutes} min`;
    },

    updateSleepDuration(hours, minutes) {
        this.elements.sleepDuration.textContent = `${hours}h ${minutes}m`;
    },

    showBlockSettingsModal(blockId, currentDuration) {
        this.elements.blockSettingsModal.style.display = 'flex';
        this.elements.blockDuration.value = currentDuration;
        this.elements.blockSettingsModal.dataset.blockId = blockId;
    },

    hideBlockSettingsModal() {
        this.elements.blockSettingsModal.style.display = 'none';
    },

    getBlockSettingsDuration() {
        return parseInt(this.elements.blockDuration.value) || 60;
    },

    getBlockSettingsBlockId() {
        return this.elements.blockSettingsModal.dataset.blockId;
    },

    animateDistraction() {
        this.elements.logDistraction.classList.add('distraction-logged');
        setTimeout(() => {
            this.elements.logDistraction.classList.remove('distraction-logged');
        }, 300);
    },

    toggleFocusMode(enable) {
        document.body.classList.toggle('focus-mode', enable);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
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
            skipBreak: document.getElementById('skipBreak'),
            timerStatus: document.getElementById('timerStatus'),
            logDistraction: document.getElementById('logDistraction'),
            distractionCount: document.getElementById('distractionCount'),
            focusTime: document.getElementById('focusTime'),
            sleepTime: document.getElementById('sleepTime'),
            wakeTime: document.getElementById('wakeTime'),
            saveSleep: document.getElementById('saveSleep'),
            sleepDuration: document.getElementById('sleepDuration'),
            sleepStat: document.getElementById('sleepStat'),
            sleepPopover: document.getElementById('sleepPopover'),
            dailyReset: document.getElementById('dailyReset'),
            blockSettingsModal: document.getElementById('blockSettingsModal'),
            blockDuration: document.getElementById('blockDuration'),
            saveBlockSettings: document.getElementById('saveBlockSettings'),
            cancelBlockSettings: document.getElementById('cancelBlockSettings'),
            historyContainer: document.getElementById('historyContainer'),
            timerCard: document.getElementById('timerCard')
        };
    },

    setCurrentDate() {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.elements.currentDate.textContent = 'Today: ' + today.toLocaleDateString('en-US', options);
    },

    renderBlocks(blocks) {
        const blockTypes = [
            { id: 'focus', icon: '🎯', title: 'Focus Block', sub: 'Work / Study' },
            { id: 'personal', icon: '📚', title: 'Personal Block', sub: 'Hobbies / Projects' },
            { id: 'recovery', icon: '🧘', title: 'Recovery Block', sub: 'Rest / Social' }
        ];

        this.elements.blocksContainer.innerHTML = blockTypes.map(b => {
            const data = blocks[b.id];
            const completed = data.completed;
            return `
                <div class="block-row block-row-${b.id} ${completed ? 'block-completed-row' : ''}">
                    <div class="block-row-icon">${b.icon}</div>
                    <div class="block-row-info">
                        <div class="block-row-name">${b.title}</div>
                        <div class="block-row-sub">${b.sub}</div>
                    </div>
                    <div class="block-row-meta">
                        <span class="block-row-dur">${data.duration} min</span>
                        <button class="btn btn-outline" onclick="App.openBlockSettings('${b.id}')">Set</button>
                        <button class="btn ${completed ? 'btn-outline' : 'btn-primary'}" onclick="App.toggleBlockComplete('${b.id}')">
                            ${completed ? 'Done' : 'Mark'}
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

    updateTimerMode(isBreak) {
        const card = this.elements.timerCard;
        if (isBreak) {
            card.classList.add('timer-break');
            this.elements.skipBreak.style.display = 'inline-block';
        } else {
            card.classList.remove('timer-break');
            this.elements.skipBreak.style.display = 'none';
        }
    },

    updateTimerStatus(status) {
        this.elements.timerStatus.textContent = status;
    },

    updateDistractionCount(count) {
        this.elements.distractionCount.textContent = count;
    },

    updateFocusTime(minutes) {
        this.elements.focusTime.textContent = minutes;
    },

    updateSleepDuration(hours, minutes) {
        this.elements.sleepDuration.textContent = hours + 'h';
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
    },

    toggleSleepPopover(show) {
        this.elements.sleepPopover.classList.toggle('open', show);
    },

    renderHistory() {
        if (!this.elements.historyContainer) return;

        const history = Storage.getHistory();
        if (!history || history.length === 0) {
            this.elements.historyContainer.innerHTML = '<div class="history-empty">No history yet. Start using BlockFlow to see your progress!</div>';
            return;
        }

        const sorted = [...history].reverse();

        let html = '';
        sorted.forEach((day, index) => {
            const date = new Date(day.date + 'T12:00:00');
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const isToday = index === 0;

            const focusIcon = day.blocks.focus.completed ? '✅' : '⬜';
            const personalIcon = day.blocks.personal.completed ? '✅' : '⬜';
            const recoveryIcon = day.blocks.recovery.completed ? '✅' : '⬜';

            html += `
                <div class="history-day-row ${isToday ? 'today-row' : ''}">
                    <div class="history-day-date">${dateStr}</div>
                    <div class="history-day-stats">
                        <span>🎯 ${day.focusTime || 0}min</span>
                        <span>🚫 ${day.distractions || 0}</span>
                    </div>
                    <div class="history-day-blocks">
                        <span title="Focus">${focusIcon}</span>
                        <span title="Personal">${personalIcon}</span>
                        <span title="Recovery">${recoveryIcon}</span>
                    </div>
                </div>
            `;
        });

        this.elements.historyContainer.innerHTML = html;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}

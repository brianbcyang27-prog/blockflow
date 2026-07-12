const App = {
    currentData: null,
    currentBlockId: null,

    init() {
        Storage.checkAndResetDay();
        this.loadData();
        UI.init();
        this.setupEventListeners();
        this.setupTimer();
        this.render();
    },

    loadData() {
        this.currentData = Storage.getData();
    },

  render() {
    UI.renderBlocks(this.currentData.blocks);
    UI.renderTodayEvents();
    UI.updateFocusTime(this.currentData.focusTime);
    if (UI.elements.distractionCount) {
      UI.elements.distractionCount.textContent = this.currentData.distractions;
    }

    const sleepDuration = Storage.calculateSleepDuration(
      this.currentData.sleep.sleepTime,
      this.currentData.sleep.wakeTime
    );
    UI.updateSleepDuration(sleepDuration.hours, sleepDuration.minutes);

    if (UI.elements.sleepTime) UI.elements.sleepTime.value = this.currentData.sleep.sleepTime;
    if (UI.elements.wakeTime) UI.elements.wakeTime.value = this.currentData.sleep.wakeTime;

    UI.renderHistory();
  },

    setupEventListeners() {
        if (UI.elements.saveSleep) {
            UI.elements.saveSleep.addEventListener('click', () => {
                const sleepTime = UI.elements.sleepTime.value;
                const wakeTime = UI.elements.wakeTime.value;
                this.currentData = Storage.saveSleep(sleepTime, wakeTime);
                const duration = Storage.calculateSleepDuration(sleepTime, wakeTime);
                UI.updateSleepDuration(duration.hours, duration.minutes);
                UI.toggleSleepPopover(false);
            });
        }

        if (UI.elements.sleepStat) {
            UI.elements.sleepStat.addEventListener('click', () => {
                UI.toggleSleepPopover(UI.elements.sleepPopover.classList.contains('open') ? false : true);
            });
        }

        if (UI.elements.dailyReset) {
            UI.elements.dailyReset.addEventListener('click', () => {
                if (confirm('Reset all data for today?')) {
                    this.currentData = Storage.manualReset();
                    this.render();
                    Timer.reset();
                }
            });
        }

        if (UI.elements.saveBlockSettings) {
            UI.elements.saveBlockSettings.addEventListener('click', () => {
                const blockId = UI.getBlockSettingsBlockId();
                const duration = UI.getBlockSettingsDuration();
                this.currentData = Storage.updateBlock(blockId, { duration });
                UI.hideBlockSettingsModal();
                this.render();
                if (blockId === 'focus') {
                    Timer.setDuration(duration);
                }
            });
        }

        if (UI.elements.cancelBlockSettings) {
            UI.elements.cancelBlockSettings.addEventListener('click', () => {
                UI.hideBlockSettingsModal();
            });
        }

        if (UI.elements.blockSettingsModal) {
            UI.elements.blockSettingsModal.addEventListener('click', (e) => {
                if (e.target === UI.elements.blockSettingsModal) {
                    UI.hideBlockSettingsModal();
                }
            });
        }

        if (UI.elements.skipBreak) {
            UI.elements.skipBreak.addEventListener('click', () => {
                Timer.skipBreak();
                UI.updateTimerButtons(false);
                UI.updateTimerStatus('Break skipped');
                UI.updateTimerMode(false);
            });
        }

        if (UI.elements.logDistraction) {
            UI.elements.logDistraction.addEventListener('click', () => {
                this.currentData = Storage.incrementDistraction();
                UI.updateFocusTime(this.currentData.focusTime);
                if (UI.elements.distractionCount) {
                    UI.elements.distractionCount.textContent = this.currentData.distractions;
                }
            });
        }
    },

    setupTimer() {
        const savedSettings = localStorage.getItem('blockflow_app_settings');
        let defaultDuration = 25;

        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                defaultDuration = parseInt(parsed.focusDuration) || 25;
            } catch (e) {
                console.error('Failed to load timer settings:', e);
            }
        }

        const focusBlockDuration = this.currentData.blocks.focus.duration;
        if (focusBlockDuration > 0) {
            defaultDuration = focusBlockDuration;
        }

        Timer.setDuration(defaultDuration);

        Timer.init(
            (time) => {
                UI.updateTimerDisplay(time);
            },
            (isBreakComplete) => {
                if (isBreakComplete) {
                    UI.updateTimerStatus('Break complete! Ready to focus.');
                    UI.updateTimerButtons(false);
                    UI.updateTimerMode(false);
                    const appSettings = localStorage.getItem('blockflow_app_settings');
                    let soundEnabled = true;
                    if (appSettings) {
                        try {
                            soundEnabled = JSON.parse(appSettings).soundNotifications !== false;
                        } catch (e) { console.warn('[App] parse settings (break):', e); }
                    }
                    if (soundEnabled) {
                        this.playNotificationSound();
                    }
                    alert('Break is over! Time to focus.');
                } else {
                    UI.updateTimerStatus('Focus session complete!');
                    UI.updateTimerButtons(false);
                    UI.updateTimerMode(false);

                    const minutes = Timer.getElapsedMinutes();
                    this.currentData = Storage.addFocusTime(minutes);
                    UI.updateFocusTime(this.currentData.focusTime);

                    const appSettings = localStorage.getItem('blockflow_app_settings');
                    let soundEnabled = true;
                    let autoBreak = false;
                    if (appSettings) {
                        try {
                            const parsed = JSON.parse(appSettings);
                            soundEnabled = parsed.soundNotifications !== false;
                            autoBreak = parsed.autoBreak === true;
                        } catch (e) { console.warn('[App] parse settings (focus):', e); }
                    }
                    if (soundEnabled) {
                        this.playNotificationSound();
                    }

                    if (autoBreak) {
                        Timer.startBreak();
                        UI.updateTimerStatus('Break time! Take 5.');
                        UI.updateTimerMode(true);
                        UI.updateTimerButtons(true);
                    } else {
                        alert('Great job! Focus session complete.');
                    }
                }
            },
            (isBreak) => {
                UI.updateTimerMode(isBreak);
                if (isBreak) {
                    UI.updateTimerStatus('Break time!');
                }
            }
        );

        if (Timer.isBreakMode()) {
            UI.updateTimerMode(true);
            UI.updateTimerStatus('Break time!');
            UI.updateTimerButtons(Timer.isActive());
        } else if (Timer.isActive()) {
            UI.updateTimerStatus('Focusing...');
            UI.updateTimerButtons(true);
            UI.toggleFocusMode(true);
        }

        if (UI.elements.startTimer) {
            UI.elements.startTimer.addEventListener('click', () => {
                if (Timer.isBreakMode()) return;
                Timer.start();
                UI.updateTimerButtons(true);
                UI.updateTimerStatus('Focusing...');
                UI.toggleFocusMode(true);
            });
        }

        if (UI.elements.pauseTimer) {
            UI.elements.pauseTimer.addEventListener('click', () => {
                Timer.pause();
                UI.updateTimerButtons(false);
                UI.updateTimerStatus(Timer.isBreakMode() ? 'Break paused' : 'Paused');
                UI.toggleFocusMode(false);

                if (!Timer.isBreakMode()) {
                    const minutes = Timer.getElapsedMinutes();
                    if (minutes > 0) {
                        this.currentData = Storage.addFocusTime(minutes);
                        UI.updateFocusTime(this.currentData.focusTime);
                    }
                }
            });
        }

        if (UI.elements.resetTimer) {
            UI.elements.resetTimer.addEventListener('click', () => {
                Timer.reset();
                UI.updateTimerButtons(false);
                UI.updateTimerMode(false);
                UI.updateTimerStatus('Ready to focus');
                UI.toggleFocusMode(false);
            });
        }
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
    },

    playNotificationSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}

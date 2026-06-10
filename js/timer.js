const Timer = {
    DEFAULT_DURATION: 25 * 60,
    BREAK_DURATION: 5 * 60,
    TIMER_STATE_KEY: 'blockflow_timer_state',

    timeRemaining: 25 * 60,
    isRunning: false,
    isBreak: false,
    intervalId: null,
    onTick: null,
    onComplete: null,
    onBreakComplete: null,
    savedDuration: 25 * 60,

    init(onTick, onComplete, onBreakComplete) {
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.onBreakComplete = onBreakComplete;
        this.restoreState();
    },

    restoreState() {
        const stored = localStorage.getItem(this.TIMER_STATE_KEY);
        if (stored) {
            try {
                const state = JSON.parse(stored);
                if (state.expiresAt && Date.now() < state.expiresAt) {
                    this.timeRemaining = state.timeRemaining;
                    this.isBreak = state.isBreak || false;
                    this.savedDuration = state.savedDuration || this.DEFAULT_DURATION;
                    if (this.onTick) {
                        this.onTick(this.formatTime());
                    }
                    if (this.onBreakComplete) {
                        this.onBreakComplete(this.isBreak);
                    }
                } else {
                    localStorage.removeItem(this.TIMER_STATE_KEY);
                    this.reset();
                }
            } catch (e) {
                localStorage.removeItem(this.TIMER_STATE_KEY);
                this.reset();
            }
        } else {
            this.reset();
        }
    },

    saveState() {
        const state = {
            timeRemaining: this.timeRemaining,
            isBreak: this.isBreak,
            savedDuration: this.savedDuration,
            expiresAt: Date.now() + this.timeRemaining * 1000 + 60000
        };
        try {
            localStorage.setItem(this.TIMER_STATE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save timer state:', e);
        }
    },

    clearState() {
        localStorage.removeItem(this.TIMER_STATE_KEY);
    },

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
        this.saveState();
    },

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.saveState();
    },

    reset() {
        this.pause();
        this.isBreak = false;
        this.timeRemaining = this.savedDuration;
        this.clearState();
        if (this.onTick) {
            this.onTick(this.formatTime());
        }
    },

    skipBreak() {
        this.pause();
        this.isBreak = false;
        this.timeRemaining = this.savedDuration;
        this.clearState();
        if (this.onTick) {
            this.onTick(this.formatTime());
        }
        if (this.onBreakComplete) {
            this.onBreakComplete(false);
        }
    },

    startBreak() {
        this.pause();
        this.isBreak = true;
        this.timeRemaining = this.BREAK_DURATION;
        if (this.onTick) {
            this.onTick(this.formatTime());
        }
        if (this.onBreakComplete) {
            this.onBreakComplete(true);
        }
        this.start();
    },

    tick() {
        if (this.timeRemaining > 0) {
            this.timeRemaining--;
            if (this.onTick) {
                this.onTick(this.formatTime());
            }
            if (this.timeRemaining % 5 === 0 || this.timeRemaining <= 10) {
                this.saveState();
            }
        } else {
            this.complete();
        }
    },

    complete() {
        this.pause();
        this.clearState();
        if (this.isBreak) {
            this.isBreak = false;
            this.timeRemaining = this.savedDuration;
            if (this.onTick) {
                this.onTick(this.formatTime());
            }
            if (this.onBreakComplete) {
                this.onBreakComplete(false);
            }
            if (this.onComplete) {
                this.onComplete(true);
            }
        } else {
            if (this.onComplete) {
                this.onComplete(false);
            }
        }
    },

    formatTime() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    setDuration(minutes) {
        this.savedDuration = minutes * 60;
        if (!this.isBreak) {
            this.timeRemaining = this.savedDuration;
        }
        if (this.onTick && !this.isRunning) {
            this.onTick(this.formatTime());
        }
    },

    getTimeRemaining() {
        return this.timeRemaining;
    },

    getElapsedMinutes() {
        return Math.floor((this.savedDuration - this.timeRemaining) / 60);
    },

    isActive() {
        return this.isRunning;
    },

    isBreakMode() {
        return this.isBreak;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timer;
}

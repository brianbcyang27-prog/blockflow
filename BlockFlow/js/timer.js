const Timer = {
    DEFAULT_DURATION: 25 * 60,
    timeRemaining: 25 * 60,
    isRunning: false,
    intervalId: null,
    onTick: null,
    onComplete: null,

    init(onTick, onComplete) {
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.reset();
    },

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    },

    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.intervalId);
        this.intervalId = null;
    },

    reset() {
        this.pause();
        this.timeRemaining = this.DEFAULT_DURATION;
        if (this.onTick) {
            this.onTick(this.formatTime());
        }
    },

    tick() {
        if (this.timeRemaining > 0) {
            this.timeRemaining--;
            if (this.onTick) {
                this.onTick(this.formatTime());
            }
        } else {
            this.complete();
        }
    },

    complete() {
        this.pause();
        if (this.onComplete) {
            this.onComplete();
        }
    },

    formatTime() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    setDuration(minutes) {
        this.DEFAULT_DURATION = minutes * 60;
        this.reset();
    },

    getTimeRemaining() {
        return this.timeRemaining;
    },

    getElapsedMinutes() {
        return Math.floor((this.DEFAULT_DURATION - this.timeRemaining) / 60);
    },

    isActive() {
        return this.isRunning;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timer;
}
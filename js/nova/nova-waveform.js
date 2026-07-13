/**
 * Nova Waveform — Canvas-based voice state visualizer
 *
 * Renders animated waveform during speaking, breathing pulse during idle,
 * and ripple during listening. All animations use requestAnimationFrame
 * and are GPU-accelerated via transform/opacity.
 *
 * @module NovaWaveform
 * @version 2.2.0
 */

const NovaWaveform = {
  _canvas: null,
  _ctx: null,
  _animFrame: null,
  _state: 'idle',
  _analyser: null,
  _dataArray: null,
  _startTime: 0,
  _rafActive: false,

  STATES: { IDLE: 'idle', LISTENING: 'listening', THINKING: 'thinking', SPEAKING: 'speaking' },

  init(canvas) {
    if (!canvas) return;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    if (!this._canvas) return;
    const rect = this._canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);
  },

  attachAnalyser(analyser) {
    this._analyser = analyser;
    if (analyser) {
      this._dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
  },

  setState(newState) {
    if (this._state === newState) return;
    this._state = newState;
    this._startTime = performance.now();
    if (!this._rafActive) this._startLoop();
  },

  _startLoop() {
    this._rafActive = true;
    const loop = () => {
      if (!this._rafActive) return;
      this._draw();
      this._animFrame = requestAnimationFrame(loop);
    };
    loop();
  },

  stop() {
    this._rafActive = false;
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
    this._clear();
  },

  _clear() {
    if (!this._ctx || !this._canvas) return;
    const rect = this._canvas.getBoundingClientRect();
    this._ctx.clearRect(0, 0, rect.width, rect.height);
  },

  _draw() {
    this._clear();
    switch (this._state) {
      case this.STATES.IDLE: this._drawIdle(); break;
      case this.STATES.LISTENING: this._drawListening(); break;
      case this.STATES.THINKING: this._drawThinking(); break;
      case this.STATES.SPEAKING: this._drawSpeaking(); break;
    }
  },

  _drawIdle() {
    const { width, height } = this._canvas.getBoundingClientRect();
    const t = (performance.now() - this._startTime) / 1000;
    const opacity = 0.15 + 0.1 * Math.sin(t * 1.5);
    const radius = 20 + 4 * Math.sin(t * 1.2);

    this._ctx.beginPath();
    this._ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    this._ctx.fillStyle = `rgba(102, 126, 234, ${opacity})`;
    this._ctx.fill();
  },

  _drawListening() {
    const { width, height } = this._canvas.getBoundingClientRect();
    const t = (performance.now() - this._startTime) / 1000;
    const bars = 5;
    const barWidth = 3;
    const gap = 6;
    const totalWidth = bars * barWidth + (bars - 1) * gap;
    const startX = (width - totalWidth) / 2;

    this._ctx.fillStyle = '#ef4444';
    for (let i = 0; i < bars; i++) {
      const phase = t * 4 + i * 0.6;
      const h = 6 + 14 * Math.abs(Math.sin(phase));
      const x = startX + i * (barWidth + gap);
      const y = (height - h) / 2;
      this._ctx.beginPath();
      this._ctx.roundRect(x, y, barWidth, h, 1.5);
      this._ctx.fill();
    }
  },

  _drawThinking() {
    const { width, height } = this._canvas.getBoundingClientRect();
    const t = (performance.now() - this._startTime) / 1000;
    const dots = 3;
    const dotRadius = 3.5;
    const gap = 14;
    const totalWidth = dots * dotRadius * 2 + (dots - 1) * (gap - dotRadius * 2);
    const startX = (width - totalWidth) / 2;

    for (let i = 0; i < dots; i++) {
      const phase = t * 3 + i * 0.8;
      const scale = 0.6 + 0.6 * Math.abs(Math.sin(phase));
      const opacity = 0.4 + 0.6 * Math.abs(Math.sin(phase));
      const x = startX + i * gap;
      const y = height / 2;

      this._ctx.beginPath();
      this._ctx.arc(x, y, dotRadius * scale, 0, Math.PI * 2);
      this._ctx.fillStyle = `rgba(102, 126, 234, ${opacity})`;
      this._ctx.fill();
    }
  },

  _drawSpeaking() {
    const { width, height } = this._canvas.getBoundingClientRect();

    if (this._analyser && this._dataArray) {
      this._analyser.getByteFrequencyData(this._dataArray);
      const bars = 24;
      const barWidth = Math.max(2, (width - bars * 2) / bars);
      const step = Math.floor(this._dataArray.length / bars);

      for (let i = 0; i < bars; i++) {
        const val = this._dataArray[i * step] / 255;
        const h = Math.max(2, val * height * 0.8);
        const x = i * (barWidth + 2);
        const y = (height - h) / 2;
        const hue = 230 + val * 30;

        this._ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.6 + val * 0.4})`;
        this._ctx.beginPath();
        this._ctx.roundRect(x, y, barWidth, h, 1);
        this._ctx.fill();
      }
    } else {
      const t = (performance.now() - this._startTime) / 1000;
      const bars = 24;
      const barWidth = Math.max(2, (width - bars * 2) / bars);

      for (let i = 0; i < bars; i++) {
        const phase = t * 5 + i * 0.4;
        const h = 4 + 16 * Math.abs(Math.sin(phase)) * (0.5 + 0.5 * Math.sin(phase * 0.3));
        const x = i * (barWidth + 2);
        const y = (height - h) / 2;

        this._ctx.fillStyle = `hsla(${230 + i * 2}, 70%, 60%, 0.7)`;
        this._ctx.beginPath();
        this._ctx.roundRect(x, y, barWidth, h, 1);
        this._ctx.fill();
      }
    }
  }
};

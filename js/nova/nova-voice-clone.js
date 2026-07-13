/**
 * Nova Voice Clone — Recording stub + audio validation
 *
 * Provides MediaRecorder-based audio capture for future voice cloning.
 * Does not perform actual cloning — that requires backend integration.
 *
 * @module NovaVoiceClone
 * @version 2.2.0
 */

const NovaVoiceClone = {
  _mediaRecorder: null,
  _chunks: [],
  _stream: null,
  _recording: false,
  _startTime: 0,
  _overlay: null,
  _timerInterval: null,
  MAX_DURATION_MS: 30000,
  MIN_DURATION_S: 3,
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  getSupportedFormat() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  },

  async record() {
    if (this._recording) return null;
    this._chunks = [];

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      this._showError(err.name === 'NotAllowedError'
        ? 'Microphone permission denied'
        : 'Could not access microphone');
      return null;
    }

    const mimeType = this.getSupportedFormat();
    this._mediaRecorder = new MediaRecorder(this._stream, mimeType ? { mimeType } : undefined);

    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    };

    return new Promise((resolve) => {
      this._mediaRecorder.onstop = () => {
        const blob = new Blob(this._chunks, { type: this._mediaRecorder.mimeType || 'audio/webm' });
        this._cleanup();
        resolve(blob);
      };

      this._recording = true;
      this._startTime = Date.now();
      this._mediaRecorder.start(100);
      this._showOverlay();

      setTimeout(() => {
        if (this._recording) this.stop();
      }, this.MAX_DURATION_MS);
    });
  },

  stop() {
    if (!this._recording) return;
    this._recording = false;
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }
    this._hideOverlay();
  },

  validate(audioBlob) {
    if (!audioBlob) return { valid: false, error: 'No audio data' };
    if (audioBlob.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large (max 10MB)', size: audioBlob.size };
    }

    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      audio.src = url;
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        URL.revokeObjectURL(url);
        if (duration < this.MIN_DURATION_S) {
          resolve({ valid: false, error: `Too short (min ${this.MIN_DURATION_S}s)`, duration, size: audioBlob.size });
        } else if (duration > 30) {
          resolve({ valid: false, error: 'Too long (max 30s)', duration, size: audioBlob.size });
        } else {
          resolve({ valid: true, duration, size: audioBlob.size });
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: 'Invalid audio format', size: audioBlob.size });
      };
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: 'Could not read audio duration', size: audioBlob.size });
      }, 3000);
    });
  },

  _showOverlay() {
    this._hideOverlay();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const overlay = document.createElement('div');
    overlay.id = 'nova-record-overlay';
    overlay.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:10000;
      display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:20px;
      background:${isDark ? '#1a1f36' : '#fff'};box-shadow:0 4px 20px rgba(0,0,0,.15);
      cursor:pointer;font-size:0.85rem;color:${isDark ? '#e2e8f0' : '#1f2937'};
      font-family:system-ui,-apple-system,sans-serif;
    `;

    const dot = document.createElement('span');
    dot.style.cssText = `
      width:10px;height:10px;border-radius:50%;background:#ef4444;
      animation:novaRecPulse 1s ease-in-out infinite;
    `;
    overlay.appendChild(dot);

    const style = document.createElement('style');
    style.textContent = '@keyframes novaRecPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}';
    document.head.appendChild(style);
    this._pulseStyle = style;

    const label = document.createElement('span');
    label.textContent = 'Recording... click to stop';
    overlay.appendChild(label);

    const timer = document.createElement('span');
    timer.id = 'nova-record-timer';
    timer.style.cssText = 'font-weight:600;margin-left:4px;min-width:36px;text-align:right;font-variant-numeric:tabular-nums;';
    timer.textContent = '0s';
    overlay.appendChild(timer);

    overlay.addEventListener('click', () => this.stop());
    document.body.appendChild(overlay);
    this._overlay = overlay;

    this._timerInterval = setInterval(() => {
      const el = document.getElementById('nova-record-timer');
      if (el) el.textContent = ((Date.now() - this._startTime) / 1000).toFixed(1) + 's';
    }, 100);
  },

  _hideOverlay() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = null;
    if (this._pulseStyle && this._pulseStyle.parentNode) {
      this._pulseStyle.parentNode.removeChild(this._pulseStyle);
    }
    this._pulseStyle = null;
  },

  _showError(msg) {
    const existing = document.getElementById('nova-record-error');
    if (existing) existing.remove();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const el = document.createElement('div');
    el.id = 'nova-record-error';
    el.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:10000;
      padding:10px 18px;border-radius:12px;
      background:${isDark ? '#2d1b1b' : '#fef2f2'};color:${isDark ? '#fca5a5' : '#dc2626'};
      font-size:0.85rem;box-shadow:0 4px 20px rgba(0,0,0,.15);
      font-family:system-ui,-apple-system,sans-serif;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 4000);
  },

  _cleanup() {
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    this._mediaRecorder = null;
    this._chunks = [];
    this._recording = false;
  }
};

window.NovaVoiceClone = NovaVoiceClone;

/**
 * Nova TTS Providers — Provider-swappable Text-to-Speech abstraction
 *
 * @module NovaTTS
 * @version 2.2.0
 */

const NovaTTS = {
  providers: {},
  _currentProvider: null,
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;
    this.providers.browser = BrowserTTSProvider;
    this.providers.kokoro = KokoroTTSProvider;
    this.providers['tts-ai'] = TtsAiProvider;
    this.providers.elevenlabs = ElevenLabsProvider;
  },

  getProvider(name) {
    this.init();
    return this.providers[name] || this.providers.browser;
  },

  async selectBestProvider() {
    this.init();
    const preferred = ['kokoro', 'browser'];

    for (const name of preferred) {
      const provider = this.providers[name];
      if (provider && await provider.isAvailable()) {
        this._currentProvider = provider;
        return provider;
      }
    }

    this._currentProvider = this.providers.browser;
    return this._currentProvider;
  },

  async speak(text, options = {}) {
    this.init();
    const providerName = options.provider || this._currentProvider?.name || 'browser';
    const provider = this.getProvider(providerName);

    try {
      return await provider.generate(text, options);
    } catch (error) {
      if (provider.name !== 'browser') {
        if (typeof showToast === 'function') {
          showToast(provider.name + ' voice unavailable. Using Browser Voice.', 'warning');
        }
        return await this.providers.browser.generate(text, options);
      }
      throw error;
    }
  },

  async listVoices(providerName) {
    this.init();
    const provider = this.getProvider(providerName);
    return provider.listVoices();
  },

  _audioCache: new Map(),
  _cacheMaxSize: 20,
  _cacheMaxBytes: 10 * 1024 * 1024,
  _cacheTotalBytes: 0,

  _cacheGet(key) {
    if (this._audioCache.has(key)) {
      const entry = this._audioCache.get(key);
      this._audioCache.delete(key);
      this._audioCache.set(key, entry);
      return entry.buffer;
    }
    return null;
  },

  _cacheSet(key, buffer) {
    if (this._audioCache.has(key)) {
      this._audioCache.delete(key);
    }
    const entry = { buffer, bytes: buffer.byteLength };
    this._audioCache.set(key, entry);
    this._cacheTotalBytes += entry.bytes;

    while (this._audioCache.size > this._cacheMaxSize || this._cacheTotalBytes > this._cacheMaxBytes) {
      const oldest = this._audioCache.keys().next().value;
      const removed = this._audioCache.get(oldest);
      this._cacheTotalBytes -= removed.bytes;
      this._audioCache.delete(oldest);
    }
  }
};

/**
 * Browser TTS Provider — Web Speech API
 */
const BrowserTTSProvider = {
  name: 'browser',

  async generate(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('SpeechSynthesis not supported'));
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = options.speed || 1;
      utter.pitch = options.pitch || 1;
      utter.volume = options.volume || 1;

      if (options.voiceName) {
        const voices = speechSynthesis.getVoices();
        const found = voices.find(v => v.name === options.voiceName);
        if (found) utter.voice = found;
      }

      utter.onend = () => resolve({ type: 'browser' });
      utter.onerror = (e) => reject(new Error(e.error || 'Speech synthesis error'));

      speechSynthesis.speak(utter);
    });
  },

  async listVoices() {
    if (!window.speechSynthesis) return [];

    const voicesReady = new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
      setTimeout(() => resolve(speechSynthesis.getVoices()), 500);
    });

    const voices = await voicesReady;
    return voices
      .filter(v => v.lang.startsWith('en'))
      .map(v => ({
        id: v.name,
        name: v.name,
        lang: v.lang,
        gender: v.name.toLowerCase().includes('female') ? 'female' : 'male',
        localService: v.localService,
        default: v.default
      }));
  },

  async isAvailable() {
    return 'speechSynthesis' in window;
  },

  getCapabilities() {
    return {
      streaming: false,
      voiceCloning: false,
      ssml: false,
      languages: ['en'],
      maxTextLength: 32000,
      requiresNetwork: false
    };
  }
};

/**
 * Kokoro TTS Provider — Local WebGPU/WASM via kokoro-js + Transformers.js
 */
const KokoroTTSProvider = {
  name: 'kokoro',
  _tts: null,
  _loading: false,
  _loadPromise: null,
  _device: null,
  _status: 'idle',
  _lastError: null,

  STATUSES: { IDLE: 'idle', DOWNLOADING: 'downloading', LOADING: 'loading', READY: 'ready', ERROR: 'error' },

  _log(msg) {
    const ts = new Date().toLocaleTimeString();
    if (typeof console !== 'undefined') console.log('[Kokoro ' + ts + '] ' + msg);
  },

  _updateOverlay(status, detail) {
    const overlay = document.getElementById('kokoro-loading-overlay');
    if (!overlay) return;
    const statusEl = overlay.querySelector('.kokoro-status');
    const detailEl = overlay.querySelector('.kokoro-detail');
    const progressFill = overlay.querySelector('.kokoro-progress-fill');
    if (statusEl) statusEl.textContent = status;
    if (detailEl) detailEl.textContent = detail || '';
    if (progressFill && typeof detail === 'number') {
      progressFill.style.width = detail + '%';
    }
  },

  _showOverlay() {
    if (document.getElementById('kokoro-loading-overlay')) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg = isDark ? '#0f172a' : '#ffffff';
    const text = isDark ? '#e2e8f0' : '#1f2937';
    const sub = isDark ? '#94a3b8' : '#6b7280';
    const track = isDark ? '#1e293b' : '#f3f4f6';

    const overlay = document.createElement('div');
    overlay.id = 'kokoro-loading-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);';
    overlay.innerHTML = `
      <div style="background:${bg};border-radius:20px;padding:36px 40px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;font-family:system-ui,-apple-system,sans-serif;">
        <div style="font-size:2rem;margin-bottom:12px;">✦</div>
        <div style="font-size:1.1rem;font-weight:600;color:${text};margin-bottom:6px;">Initializing Nova Voice Engine</div>
        <div class="kokoro-status" style="font-size:0.88rem;color:${sub};margin-bottom:16px;">Preparing...</div>
        <div style="background:${track};border-radius:8px;height:8px;overflow:hidden;margin-bottom:8px;">
          <div class="kokoro-progress-fill" style="height:100%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:8px;width:0%;transition:width 0.3s ease;"></div>
        </div>
        <div class="kokoro-detail" style="font-size:0.78rem;color:${sub};min-height:1.2em;"></div>
      </div>`;
    document.body.appendChild(overlay);
  },

  _hideOverlay() {
    const overlay = document.getElementById('kokoro-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
    }
  },

  async _detectDevice() {
    if (this._device) return this._device;
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter) {
          this._device = 'webgpu';
          this._log('WebGPU detected — using GPU acceleration');
          return 'webgpu';
        }
      } catch (e) {
        this._log('WebGPU adapter request failed: ' + e.message);
      }
    }
    this._device = 'wasm';
    this._log('WebGPU unavailable — falling back to WASM (CPU)');
    return 'wasm';
  },

  async _ensureLoaded() {
    if (this._tts) return this._tts;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = (async () => {
      const device = await this._detectDevice();
      const dtype = device === 'webgpu' ? 'fp32' : 'q8';
      this._log('Loading model (device=' + device + ', dtype=' + dtype + ')...');

      this._showOverlay();
      this._status = this.STATUSES.DOWNLOADING;
      this._updateOverlay('Downloading voice model...', '0%');

      try {
        const { KokoroTTS } = await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm');
        this._log('kokoro-js loaded');

        this._updateOverlay('Loading AI model...', 'Checking cache...');
        this._status = this.STATUSES.LOADING;

        const tts = await KokoroTTS.from_pretrained(
          'onnx-community/Kokoro-82M-v1.0-ONNX',
          {
            dtype,
            device,
            progress_callback: (data) => {
              if (data.status === 'progress' && data.total) {
                const pct = Math.round((data.loaded / data.total) * 100);
                const mb = (data.loaded / 1024 / 1024).toFixed(0);
                const totalMb = (data.total / 1024 / 1024).toFixed(0);
                this._updateOverlay('Downloading voice model...', pct + '% (' + mb + '/' + totalMb + ' MB)');
              } else if (data.status === 'initiate') {
                this._updateOverlay('Preparing download...', data.name || '');
              } else if (data.status === 'done') {
                this._updateOverlay('Download complete', '100%');
              } else if (data.status === 'ready') {
                this._updateOverlay('Compiling AI model...', '');
              }
            }
          }
        );

        this._status = this.STATUSES.READY;
        this._updateOverlay('Voice engine ready!', '');
        this._log('Model loaded successfully');

        await new Promise(r => setTimeout(r, 600));
        this._hideOverlay();

        this._tts = tts;
        return tts;
      } catch (error) {
        this._status = this.STATUSES.ERROR;
        this._lastError = error;
        this._hideOverlay();
        this._loadPromise = null;
        this._log('FAILED: ' + error.message);
        throw error;
      }
    })();

    return this._loadPromise;
  },

  async generate(text, options = {}) {
    const tts = await this._ensureLoaded();
    const voice = options.kokoroVoice || 'af_bella';
    this._log('Generating speech (voice=' + voice + ', text=' + text.length + ' chars)');

    const result = await tts.generate(text, { voice });

    const audioContext = new AudioContext();
    const audioBlob = new Blob([result.audio], { type: 'audio/wav' });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => {
        audioContext.close();
        resolve({ type: 'kokoro' });
      };
      source.onerror = (e) => {
        audioContext.close();
        reject(e);
      };
      source.start();
    });
  },

  async listVoices() {
    return [
      { id: 'af_bella', name: 'Bella', lang: 'en-US', gender: 'female' },
      { id: 'af_heart', name: 'Heart', lang: 'en-US', gender: 'female' },
      { id: 'am_adam', name: 'Adam', lang: 'en-US', gender: 'male' },
      { id: 'am_michael', name: 'Michael', lang: 'en-US', gender: 'male' },
      { id: 'bf_emma', name: 'Emma', lang: 'en-GB', gender: 'female' },
      { id: 'bm_george', name: 'George', lang: 'en-GB', gender: 'male' },
      { id: 'jf_xiaobei', name: 'Xiaobei', lang: 'zh-CN', gender: 'female' },
      { id: 'jm_kumo', name: 'Kumo', lang: 'ja-JP', gender: 'male' }
    ];
  },

  async isAvailable() {
    return 'webgpu' in navigator || 'WebAssembly' in window;
  },

  getStatus() {
    return this._status;
  },

  getCapabilities() {
    return {
      streaming: false,
      voiceCloning: false,
      ssml: false,
      languages: ['en-US', 'en-GB', 'zh-CN', 'ja-JP'],
      maxTextLength: Infinity,
      requiresNetwork: true,
      modelSize: '86MB (q8) / 300MB (fp32)',
      requiresWebGPU: false,
      localProcessing: true
    };
  }
};

/**
 * TTS.ai Provider — Free Cloud API
 */
const TtsAiProvider = {
  name: 'tts-ai',
  _apiKey: '',

  setApiKey(key) {
    this._apiKey = key;
  },

  async generate(text, options = {}) {
    const response = await fetch('https://api.tts.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this._apiKey && { 'Authorization': `Bearer ${this._apiKey}` })
      },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: options.kokoroVoice || 'af_bella',
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      throw new Error(`tts.ai API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => resolve({ type: 'tts-ai' });
      source.onerror = (e) => reject(e);
      source.start();
    });
  },

  async listVoices() {
    return [
      { id: 'af_bella', name: 'Bella', lang: 'en-US', gender: 'female' },
      { id: 'af_heart', name: 'Heart', lang: 'en-US', gender: 'female' },
      { id: 'am_adam', name: 'Adam', lang: 'en-US', gender: 'male' },
      { id: 'am_michael', name: 'Michael', lang: 'en-US', gender: 'male' }
    ];
  },

  async isAvailable() {
    return 'fetch' in window;
  },

  getCapabilities() {
    return {
      streaming: true,
      voiceCloning: false,
      ssml: false,
      languages: ['en-US', 'en-GB', 'ja'],
      maxTextLength: 5000,
      requiresNetwork: true,
      rateLimit: '5K chars/day'
    };
  }
};

/**
 * ElevenLabs Provider — Premium Cloud API
 */
const ElevenLabsProvider = {
  name: 'elevenlabs',
  _apiKey: '',

  setApiKey(key) {
    this._apiKey = key;
  },

  async generate(text, options = {}) {
    if (!this._apiKey) {
      throw new Error('ElevenLabs API key required');
    }

    const voiceId = options.voiceId || 'Rachel';
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this._apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => resolve({ type: 'elevenlabs' });
      source.onerror = (e) => reject(e);
      source.start();
    });
  },

  async listVoices() {
    if (!this._apiKey) {
      return [
        { id: 'Rachel', name: 'Rachel', lang: 'en', gender: 'female' },
        { id: 'Domi', name: 'Domi', lang: 'en', gender: 'female' },
        { id: 'Bella', name: 'Bella', lang: 'en', gender: 'female' },
        { id: 'Antoni', name: 'Antoni', lang: 'en', gender: 'male' }
      ];
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': this._apiKey }
      });
      const data = await response.json();
      return data.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        lang: 'en',
        gender: v.labels?.gender || 'unknown'
      }));
    } catch {
      return [];
    }
  },

  async isAvailable() {
    return 'fetch' in window;
  },

  getCapabilities() {
    return {
      streaming: true,
      voiceCloning: true,
      ssml: true,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pl', 'pt', 'hi', 'ar', 'ja', 'ko', 'zh'],
      maxTextLength: 5000,
      requiresNetwork: true,
      rateLimit: '10K credits/month free'
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NovaTTS, BrowserTTSProvider, KokoroTTSProvider, TtsAiProvider, ElevenLabsProvider };
}

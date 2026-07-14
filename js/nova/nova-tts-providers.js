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
 * Kokoro TTS Provider — Local WebGPU/WASM
 */
const KokoroTTSProvider = {
  name: 'kokoro',
  _tts: null,
  _loading: false,
  _loadPromise: null,

  async _ensureLoaded() {
    if (this._tts) return this._tts;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = (async () => {
      try {
        const { KokoroTTS } = await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.0.1/+esm');

        this._tts = await KokoroTTS.from_pretrained(
          'onnx-community/Kokoro-82M-v1.0-ONNX',
          {
            dtype: 'q8',
            device: 'webgpu' in navigator ? 'webgpu' : 'wasm',
          }
        );

        return this._tts;
      } catch (error) {
        this._loadPromise = null;
        throw error;
      }
    })();

    return this._loadPromise;
  },

  async generate(text, options = {}) {
    if (typeof showToast === 'function' && !this._tts) {
      showToast('Loading Nova AI voice (first time only)...', 'info');
    }
    const tts = await this._ensureLoaded();
    const voice = options.kokoroVoice || 'af_bella';
    const result = await tts.generate(text, { voice });

    const audioContext = new AudioContext();
    const audioBlob = new Blob([result.audio], { type: 'audio/wav' });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => resolve({ type: 'kokoro' });
      source.onerror = (e) => reject(e);
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

  getCapabilities() {
    return {
      streaming: false,
      voiceCloning: false,
      ssml: false,
      languages: ['en-US', 'en-GB', 'zh-CN', 'ja-JP'],
      maxTextLength: Infinity,
      requiresNetwork: true,
      modelSize: '86MB',
      requiresWebGPU: true
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

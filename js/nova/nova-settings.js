/**
 * Nova Settings — Voice companion settings controller
 *
 * @module NovaSettings
 * @version 2.2.0
 */

const NovaSettings = {
  _providerEl: null,
  _voiceEl: null,
  _previewBtn: null,
  _testBtn: null,
  _statusEl: null,
  _apiKeysEl: null,
  _currentProvider: 'browser',

  STORAGE_KEY_PROVIDER: 'blockflow_nova_tts_provider',
  STORAGE_KEY_TTS_AI_KEY: 'blockflow_nova_tts_ai_key',
  STORAGE_KEY_ELEVENLABS_KEY: 'blockflow_nova_elevenlabs_key',

  PROVIDERS: [
    { id: 'browser', name: 'Browser Voice', desc: 'Uses your browser\'s built-in voices. No download needed.', requiresKey: false, requiresWebGPU: false },
    { id: 'kokoro', name: 'Kokoro Local AI', desc: 'Runs on your device with WebGPU. Highest privacy. One-time model download.', requiresKey: false, requiresWebGPU: false },
    { id: 'tts-ai', name: 'tts.ai Cloud', desc: 'Free cloud TTS (5K chars/day).', requiresKey: false, requiresWebGPU: false, comingSoon: true },
    { id: 'elevenlabs', name: 'ElevenLabs Premium', desc: 'Ultra-realistic AI voices.', requiresKey: true, requiresWebGPU: false, comingSoon: true }
  ],

  init() {
    this._providerEl = document.getElementById('novaProviderSelect');
    this._voiceEl = document.getElementById('novaVoiceSelect');
    this._previewBtn = document.getElementById('novaVoicePreview');
    this._testBtn = document.getElementById('novaVoiceTest');
    this._statusEl = document.getElementById('novaProviderStatus');
    this._apiKeysEl = document.getElementById('novaApiKeys');

    if (!this._providerEl || !this._voiceEl) return;

    this._loadApiKeys();
    this._populateProviders();
    this._loadVoices();
    this._updateApiKeyVisibility();
    this._updateStatus();

    this._providerEl.addEventListener('change', () => this._onProviderChange());
    if (this._previewBtn) {
      this._previewBtn.addEventListener('click', () => this._previewVoice());
    }
    if (this._testBtn) {
      this._testBtn.addEventListener('click', () => this._testVoice());
    }

    const ttsAiInput = document.getElementById('novaTtsAiKey');
    const elevenInput = document.getElementById('novaElevenLabsKey');
    if (ttsAiInput) {
      ttsAiInput.addEventListener('change', () => this._saveApiKey('tts-ai', ttsAiInput.value));
    }
    if (elevenInput) {
      elevenInput.addEventListener('change', () => this._saveApiKey('elevenlabs', elevenInput.value));
    }
  },

  _populateProviders() {
    this._providerEl.innerHTML = '';
    this.PROVIDERS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.comingSoon) {
        opt.textContent += ' (Coming Soon)';
        opt.disabled = true;
      } else if (p.id === 'kokoro' && !('webgpu' in navigator) && !('WebAssembly' in window)) {
        opt.textContent += ' (Not Supported)';
        opt.disabled = true;
      }
      this._providerEl.appendChild(opt);
    });

    const saved = localStorage.getItem(this.STORAGE_KEY_PROVIDER) || 'browser';
    const savedProvider = this.PROVIDERS.find(p => p.id === saved);
    if (savedProvider && !savedProvider.comingSoon) {
      this._currentProvider = saved;
    } else {
      this._currentProvider = 'browser';
    }
    this._providerEl.value = this._currentProvider;
    this._updateDescription();
  },

  _updateDescription() {
    const descEl = document.getElementById('novaProviderDesc');
    if (!descEl) return;
    const provider = this.PROVIDERS.find(p => p.id === this._currentProvider);
    descEl.textContent = provider ? provider.desc : '';
  },

  async _loadVoices() {
    if (!this._voiceEl) return;
    this._voiceEl.innerHTML = '<option>Loading voices...</option>';

    try {
      const voices = await NovaTTS.listVoices(this._currentProvider);
      this._voiceEl.innerHTML = '';

      if (voices.length === 0) {
        this._voiceEl.innerHTML = '<option>No voices available</option>';
        return;
      }

      const savedVoice = localStorage.getItem('blockflow_ai_voice_name') || '';
      voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name + (v.lang ? ' (' + v.lang + ')' : '');
        if (v.id === savedVoice) opt.selected = true;
        this._voiceEl.appendChild(opt);
      });

      this._voiceEl.addEventListener('change', () => {
        localStorage.setItem('blockflow_ai_voice_name', this._voiceEl.value);
      });
    } catch (err) {
      this._voiceEl.innerHTML = '<option>Error loading voices</option>';
    }
  },

  _onProviderChange() {
    this._currentProvider = this._providerEl.value;
    localStorage.setItem(this.STORAGE_KEY_PROVIDER, this._currentProvider);
    this._loadVoices();
    this._updateApiKeyVisibility();
    this._updateDescription();
    this._updateStatus();
  },

  _updateApiKeyVisibility() {
    if (!this._apiKeysEl) return;
    const keys = this._apiKeysEl.querySelectorAll('.nova-api-key-group');
    keys.forEach(group => {
      const provider = group.dataset.provider;
      group.style.display = provider === this._currentProvider ? 'block' : 'none';
    });
  },

  _updateStatus() {
    if (!this._statusEl) return;
    if (this._currentProvider === 'kokoro' && typeof KokoroTTSProvider !== 'undefined') {
      const status = KokoroTTSProvider.getStatus();
      const map = {
        idle: { icon: '⚪', text: 'Not loaded yet' },
        downloading: { icon: '🟡', text: 'Downloading model...' },
        loading: { icon: '🟡', text: 'Initializing...' },
        ready: { icon: '🟢', text: 'Ready' },
        error: { icon: '🔴', text: 'Error — try restarting' }
      };
      const s = map[status] || map.idle;
      this._statusEl.textContent = s.icon + ' ' + s.text;
      this._statusEl.style.display = 'block';
    } else {
      this._statusEl.style.display = 'none';
    }
  },

  async _previewVoice() {
    if (!this._previewBtn) return;
    const originalText = this._previewBtn.textContent;
    this._previewBtn.textContent = 'Playing...';
    this._previewBtn.disabled = true;

    try {
      await NovaTTS.speak('Hello, I\'m your Nova voice assistant.', {
        provider: this._currentProvider,
        voiceName: this._voiceEl ? this._voiceEl.value : undefined,
        kokoroVoice: this._voiceEl ? this._voiceEl.value : undefined,
        speed: parseFloat(document.getElementById('voiceSpeed')?.value || 1),
        pitch: parseFloat(document.getElementById('voicePitch')?.value || 1),
        volume: parseFloat(document.getElementById('voiceVolume')?.value || 1)
      });
    } catch (err) {
      this._previewBtn.textContent = 'Failed';
      setTimeout(() => { this._previewBtn.textContent = originalText; }, 2000);
      return;
    }

    this._previewBtn.textContent = originalText;
    this._previewBtn.disabled = false;
    this._updateStatus();
  },

  async _testVoice() {
    if (!this._testBtn) return;
    const originalText = this._testBtn.textContent;
    this._testBtn.textContent = 'Testing...';
    this._testBtn.disabled = true;

    try {
      await NovaTTS.speak('Hello! I\'m Nova. Your voice engine is ready.', {
        provider: this._currentProvider,
        voiceName: this._voiceEl ? this._voiceEl.value : undefined,
        kokoroVoice: this._voiceEl ? this._voiceEl.value : undefined,
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0
      });
    } catch (err) {
      this._testBtn.textContent = 'Test failed';
      setTimeout(() => { this._testBtn.textContent = originalText; }, 2000);
      return;
    }

    this._testBtn.textContent = 'Voice works!';
    this._updateStatus();
    setTimeout(() => { this._testBtn.textContent = originalText; }, 2000);
  },

  _loadApiKeys() {
    const ttsAiKey = localStorage.getItem(this.STORAGE_KEY_TTS_AI_KEY) || '';
    const elevenKey = localStorage.getItem(this.STORAGE_KEY_ELEVENLABS_KEY) || '';

    const ttsAiInput = document.getElementById('novaTtsAiKey');
    const elevenInput = document.getElementById('novaElevenLabsKey');
    if (ttsAiInput) ttsAiInput.value = ttsAiKey;
    if (elevenInput) elevenInput.value = elevenKey;

    if (ttsAiKey && typeof TtsAiProvider !== 'undefined') {
      TtsAiProvider.setApiKey(ttsAiKey);
    }
    if (elevenKey && typeof ElevenLabsProvider !== 'undefined') {
      ElevenLabsProvider.setApiKey(elevenKey);
    }
  },

  _saveApiKey(provider, key) {
    if (provider === 'tts-ai') {
      localStorage.setItem(this.STORAGE_KEY_TTS_AI_KEY, key);
      if (typeof TtsAiProvider !== 'undefined') TtsAiProvider.setApiKey(key);
    } else if (provider === 'elevenlabs') {
      localStorage.setItem(this.STORAGE_KEY_ELEVENLABS_KEY, key);
      if (typeof ElevenLabsProvider !== 'undefined') ElevenLabsProvider.setApiKey(key);
    }
  }
};

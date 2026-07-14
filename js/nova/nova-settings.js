/**
 * Nova Settings — Voice companion settings controller
 *
 * Manages provider selection, dynamic voice loading, voice preview,
 * and API key management for Nova TTS providers.
 *
 * @module NovaSettings
 * @version 2.2.0
 */

const NovaSettings = {
  _providerEl: null,
  _voiceEl: null,
  _previewBtn: null,
  _apiKeysEl: null,
  _currentProvider: 'browser',

  STORAGE_KEY_PROVIDER: 'blockflow_nova_tts_provider',
  STORAGE_KEY_TTS_AI_KEY: 'blockflow_nova_tts_ai_key',
  STORAGE_KEY_ELEVENLABS_KEY: 'blockflow_nova_elevenlabs_key',

  PROVIDERS: [
    { id: 'browser', name: 'Browser (Built-in)', requiresKey: false, requiresWebGPU: false },
    { id: 'kokoro', name: 'Kokoro (Local AI)', requiresKey: false, requiresWebGPU: true },
    { id: 'tts-ai', name: 'tts.ai (Free Cloud)', requiresKey: false, requiresWebGPU: false, comingSoon: true },
    { id: 'elevenlabs', name: 'ElevenLabs (Premium)', requiresKey: true, requiresWebGPU: false, comingSoon: true }
  ],

  init() {
    this._providerEl = document.getElementById('novaProviderSelect');
    this._voiceEl = document.getElementById('novaVoiceSelect');
    this._previewBtn = document.getElementById('novaVoicePreview');
    this._apiKeysEl = document.getElementById('novaApiKeys');

    if (!this._providerEl || !this._voiceEl) return;

    this._loadApiKeys();
    this._populateProviders();
    this._loadVoices();
    this._updateApiKeyVisibility();

    this._providerEl.addEventListener('change', () => this._onProviderChange());
    if (this._previewBtn) {
      this._previewBtn.addEventListener('click', () => this._previewVoice());
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
      } else if (p.requiresWebGPU && !('webgpu' in navigator)) {
        opt.textContent += ' (requires WebGPU)';
        opt.disabled = true;
      }
      this._providerEl.appendChild(opt);
    });

    const saved = localStorage.getItem(this.STORAGE_KEY_PROVIDER) || 'browser';
    this._currentProvider = saved;
    this._providerEl.value = saved;
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
        opt.textContent = v.name + (v.gender ? ' (' + v.gender + ')' : '');
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
  },

  _updateApiKeyVisibility() {
    if (!this._apiKeysEl) return;
    const keys = this._apiKeysEl.querySelectorAll('.nova-api-key-group');
    keys.forEach(group => {
      const provider = group.dataset.provider;
      group.style.display = provider === this._currentProvider ? 'block' : 'none';
    });
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
      this._previewBtn.textContent = 'Preview failed';
      setTimeout(() => { this._previewBtn.textContent = originalText; }, 2000);
      return;
    }

    this._previewBtn.textContent = originalText;
    this._previewBtn.disabled = false;
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

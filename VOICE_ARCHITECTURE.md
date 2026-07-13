# Voice Companion Architecture — "Nova"

> Architecture designed: July 13, 2026  
> Status: Ready for implementation  
> Based on: VOICE_RESEARCH.md findings

---

## Executive Summary

This document defines the technical architecture for upgrading BlockFlow's AI Assistant into "Nova" — a premium voice companion. The design follows the constraint: **provider-swappable, no new frameworks, minimal JS, GPU-accelerated CSS**.

### Core Design Principles

1. **Provider-Swappable**: TTS/STT providers can be swapped without code changes
2. **Graceful Degradation**: Works everywhere, premium where supported
3. **Zero Dependencies**: No new npm packages in production (kokoro-js loaded dynamically)
4. **GPU-First**: All animations use `transform`/`opacity` for 60fps
5. **Lazy Load**: Voice models loaded on-demand, not at startup

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nova UI Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Avatar   │ │ Waveform │ │ Settings │ │ Toasts   │      │
│  │ (States) │ │ (Canvas) │ │ (Modal)  │ │ (System) │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │              │
│  ┌────┴────────────┴────────────┴────────────┴────┐        │
│  │              Nova Voice Controller              │        │
│  │  - State machine (idle/listening/thinking/     │        │
│  │    speaking)                                   │        │
│  │  - Provider dispatch                           │        │
│  │  - Interruption handling                       │        │
│  │  - Memory integration                          │        │
│  └────┬────────────┬────────────┬────────────┬────┘        │
│       │            │            │            │              │
│  ┌────┴────┐ ┌─────┴────┐ ┌────┴────┐ ┌────┴────┐        │
│  │ STT     │ │ TTS      │ │ VAD     │ │ Audio   │        │
│  │Provider │ │Provider  │ │Provider │ │Analyzer │        │
│  └────┬────┘ └─────┬────┘ └────┬────┘ └────┬────┘        │
│       │            │            │            │              │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
   ┌────┴────┐ ┌─────┴────┐ ┌────┴────┐ ┌────┴────┐
   │ Web     │ │ Kokoro   │ │ Silero  │ │ Web     │
   │ Speech  │ │ -82M     │ │ VAD     │ │ Audio   │
   │ API     │ │ (Local)  │ │ (WASM)  │ │ API     │
   ├─────────┤ ├──────────┤ ├─────────┤ ├─────────┤
   │ tts.ai  │ │ KittenTTS│ │ Browser │ │ Canvas  │
   │ (Cloud) │ │ (WebGPU) │ │ Native  │ │ 2D      │
   ├─────────┤ ├──────────┤ └─────────┘ └─────────┘
   │ Eleven  │ │ Piper    │
   │ Labs    │ │ (WASM)   │
   └─────────┘ └──────────┘
```

---

## 2. Nova Voice Controller (Core Module)

### State Machine

```
                    ┌──────────────┐
                    │    IDLE      │ ←── Default state
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ LISTENING  │ │ THINKING   │ │ SPEAKING   │
     │ (mic on)   │ │ (API call) │ │ (TTS out)  │
     └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           ↓
                    ┌──────────────┐
                    │    IDLE      │
                    └──────────────┘
```

### State Properties

```javascript
// Extend AIAssistant._voiceSettings (line 39)
_voiceSettings: {
  // Existing (v2.1.0)
  enabled: true,
  name: '',
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
  
  // Nova additions
  provider: 'browser',        // 'browser' | 'kokoro' | 'tts-ai' | 'elevenlabs'
  mode: 'hybrid',             // 'text' | 'voice' | 'hybrid'
  wakeWordEnabled: false,
  wakeWord: 'hey nova',
  interruptionEnabled: true,
  noiseSuppression: false,
  echoCancellation: true,
  
  // Kokoro-specific
  kokoroVoice: 'af_bella',    // Default Kokoro voice
  kokoroQuantization: 'q8',   // 'q8' | 'q4' | 'fp16'
  
  // API-specific
  ttsAiApiKey: '',
  elevenLabsApiKey: '',
  
  // UI
  waveformEnabled: true,
  speakingAnimation: 'pulse', // 'pulse' | 'waveform' | 'orb'
  listeningAnimation: 'ripple', // 'ripple' | 'waveform' | 'dots'
}
```

### State Transitions

```javascript
// Nova state machine (add to AIAssistant)
_novaState: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'

_setNovaState(newState) {
  const oldState = this._novaState;
  this._novaState = newState;
  
  // Update UI
  this._updateNovaUI(oldState, newState);
  
  // Emit event for waveform canvas
  window.dispatchEvent(new CustomEvent('nova-state-change', {
    detail: { from: oldState, to: newState }
  }));
},

_updateNovaUI(oldState, newState) {
  const avatar = document.querySelector('.ai-avatar');
  if (!avatar) return;
  
  // Remove old state classes
  avatar.classList.remove('nova-idle', 'nova-listening', 'nova-thinking', 'nova-speaking');
  
  // Add new state class
  avatar.classList.add(`nova-${newState}`);
  
  // Update waveform canvas visibility
  const canvas = document.querySelector('.ai-waveform-canvas');
  if (canvas) {
    canvas.style.display = (newState === 'listening' || newState === 'speaking') ? 'block' : 'none';
  }
}
```

---

## 3. TTS Provider Abstraction

### Provider Interface

```javascript
// Each provider implements this interface
const TTSProviderInterface = {
  /**
   * Generate speech from text
   * @param {string} text - Text to speak
   * @param {Object} options - Voice options
   * @returns {Promise<AudioBuffer>} - Generated audio
   */
  async generate(text, options = {}) {
    throw new Error('Not implemented');
  },
  
  /**
   * Stream speech generation (for real-time)
   * @param {string} text - Text to speak
   * @param {Object} options - Voice options
   * @yields {AudioChunk} - Audio chunks as they're generated
   */
  async *stream(text, options = {}) {
    throw new Error('Not implemented');
  },
  
  /**
   * List available voices
   * @returns {Promise<Voice[]>}
   */
  async listVoices() {
    throw new Error('Not implemented');
  },
  
  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('Not implemented');
  },
  
  /**
   * Get provider capabilities
   * @returns {ProviderCapabilities}
   */
  getCapabilities() {
    throw new Error('Not implemented');
  }
};
```

### Provider Implementations

#### 1. Browser TTS Provider (Primary)

```javascript
const BrowserTTSProvider = {
  name: 'browser',
  
  async generate(text, options = {}) {
    return new Promise((resolve, reject) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = options.speed || 1;
      utter.pitch = options.pitch || 1;
      utter.volume = options.volume || 1;
      
      if (options.voice) {
        utter.voice = options.voice;
      }
      
      utter.onend = () => resolve();
      utter.onerror = (e) => reject(e);
      
      speechSynthesis.speak(utter);
    });
  },
  
  async *stream(text, options = {}) {
    // Browser TTS doesn't support true streaming
    // Yield the entire audio as one chunk
    await this.generate(text, options);
    yield { type: 'end' };
  },
  
  async listVoices() {
    const voices = speechSynthesis.getVoices();
    return voices.filter(v => v.lang.startsWith('en'));
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
      maxTextLength: 32000, // ~32KB Chrome limit
    };
  }
};
```

#### 2. Kokoro-82M Provider (Premium Local)

```javascript
const KokoroTTSProvider = {
  name: 'kokoro',
  _tts: null,
  _loading: false,
  
  async _ensureLoaded() {
    if (this._tts) return;
    if (this._loading) {
      // Wait for existing load
      while (this._loading) await new Promise(r => setTimeout(r, 100));
      return;
    }
    
    this._loading = true;
    
    // Dynamic import — no bundle bloat
    const { KokoroTTS } = await import('https://cdn.jsdelivr.net/npm/kokoro-js@latest/+esm');
    
    this._tts = await KokoroTTS.from_pretrained(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      {
        dtype: AIAssistant._voiceSettings.kokoroQuantization || 'q8',
        device: 'webgpu' in navigator ? 'webgpu' : 'wasm',
      }
    );
    
    this._loading = false;
  },
  
  async generate(text, options = {}) {
    await this._ensureLoaded();
    
    const voice = options.kokoroVoice || AIAssistant._voiceSettings.kokoroVoice;
    const audio = await this._tts.generate(text, { voice });
    
    // Convert to AudioBuffer and play
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audio.audio);
    
    return buffer;
  },
  
  async *stream(text, options = {}) {
    // Kokoro generates in one pass, but we can yield chunks
    await this._ensureLoaded();
    
    const voice = options.kokoroVoice || AIAssistant._voiceSettings.kokoroVoice;
    const audio = await this._tts.generate(text, { voice });
    
    yield { type: 'audio', data: audio.audio };
    yield { type: 'end' };
  },
  
  async listVoices() {
    // 54 built-in voices
    return [
      { id: 'af_bella', name: 'Bella', lang: 'en-US', gender: 'female' },
      { id: 'af_heart', name: 'Heart', lang: 'en-US', gender: 'female' },
      { id: 'am_adam', name: 'Adam', lang: 'en-US', gender: 'male' },
      // ... 51 more voices
    ];
  },
  
  async isAvailable() {
    return 'webgpu' in navigator || 'WebAssembly' in window;
  },
  
  getCapabilities() {
    return {
      streaming: true,
      voiceCloning: false,
      ssml: false,
      languages: ['en-US', 'en-GB', 'ja', 'zh', 'ko', 'fr', 'de', 'es'],
      maxTextLength: Infinity,
      requiresModelLoad: true,
      modelSize: '86MB (q8)',
    };
  }
};
```

#### 3. tts.ai Provider (Free Cloud)

```javascript
const TtsAiProvider = {
  name: 'tts-ai',
  
  async generate(text, options = {}) {
    const response = await fetch('https://api.tts.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey || ''}`,
      },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: options.kokoroVoice || 'af_bella',
        response_format: 'mp3',
      }),
    });
    
    if (!response.ok) throw new Error('tts.ai API error');
    
    const audioBlob = await response.blob();
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    
    return buffer;
  },
  
  async *stream(text, options = {}) {
    const response = await fetch('https://api.tts.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey || ''}`,
      },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: options.kokoroVoice || 'af_bella',
        stream: true,
      }),
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Parse SSE chunks
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.audio) {
            yield { type: 'audio', data: data.audio };
          }
        }
      }
    }
    
    yield { type: 'end' };
  },
  
  async listVoices() {
    return [
      { id: 'af_bella', name: 'Bella', lang: 'en-US', gender: 'female' },
      { id: 'af_heart', name: 'Heart', lang: 'en-US', gender: 'female' },
      // ... 20+ voices
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
      maxTextLength: 5000, // Free tier limit
      rateLimit: '5K chars/day',
    };
  }
};
```

#### 4. ElevenLabs Provider (Premium Cloud)

```javascript
const ElevenLabsProvider = {
  name: 'elevenlabs',
  
  async generate(text, options = {}) {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId || 'Rachel'}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': options.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );
    
    if (!response.ok) throw new Error('ElevenLabs API error');
    
    const audioBlob = await response.blob();
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    
    return buffer;
  },
  
  async *stream(text, options = {}) {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId || 'Rachel'}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': options.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
        }),
      }
    );
    
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      yield { type: 'audio', data: value };
    }
    
    yield { type: 'end' };
  },
  
  async listVoices() {
    // Fetch from API
    const response = await fetch('https://api.elevenlabs.io/v1/voices');
    const data = await response.json();
    return data.voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      lang: 'en',
      gender: v.labels?.gender || 'unknown',
    }));
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
      rateLimit: '10K credits/month free',
    };
  }
};
```

### Provider Registry

```javascript
const NovaTTS = {
  providers: {
    browser: BrowserTTSProvider,
    kokoro: KokoroTTSProvider,
    'tts-ai': TtsAiProvider,
    elevenlabs: ElevenLabsProvider,
  },
  
  _currentProvider: null,
  
  /**
   * Get current provider with fallback chain
   */
  getProvider(name) {
    return this.providers[name] || this.providers.browser;
  },
  
  /**
   * Auto-select best available provider
   */
  async selectBestProvider() {
    const preferred = ['kokoro', 'tts-ai', 'browser'];
    
    for (const name of preferred) {
      const provider = this.providers[name];
      if (await provider.isAvailable()) {
        this._currentProvider = provider;
        return provider;
      }
    }
    
    // Fallback to browser
    this._currentProvider = this.providers.browser;
    return this._currentProvider;
  },
  
  /**
   * Generate speech with automatic fallback
   */
  async speak(text, options = {}) {
    const provider = this.getProvider(options.provider || this._currentProvider?.name || 'browser');
    
    try {
      return await provider.generate(text, options);
    } catch (error) {
      // Fallback to browser TTS
      if (provider.name !== 'browser') {
        return await this.providers.browser.generate(text, options);
      }
      throw error;
    }
  }
};
```

---

## 4. STT Provider Abstraction (Phase 2)

### Provider Interface

```javascript
const STTProviderInterface = {
  /**
   * Start continuous recognition
   * @param {Object} options
   * @yields {TranscriptChunk} - Partial/final transcripts
   */
  async *startRecognition(options = {}) {
    throw new Error('Not implemented');
  },
  
  /**
   * Stop recognition
   */
  stop() {
    throw new Error('Not implemented');
  },
  
  /**
   * Check if provider is available
   */
  async isAvailable() {
    throw new Error('Not implemented');
  }
};
```

### Browser STT Provider

```javascript
const BrowserSTTProvider = {
  name: 'browser',
  _recognition: null,
  
  async *startRecognition(options = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error('SpeechRecognition not supported');
    
    this._recognition = new SpeechRecognition();
    this._recognition.continuous = true;
    this._recognition.interimResults = true;
    this._recognition.lang = options.lang || 'en-US';
    
    const recognition = this._recognition;
    
    return new Promise((resolve, reject) => {
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          
          yield { transcript, isFinal };
        }
      };
      
      recognition.onerror = (event) => {
        reject(new Error(event.error));
      };
      
      recognition.onend = () => {
        resolve();
      };
      
      recognition.start();
    });
  },
  
  stop() {
    if (this._recognition) {
      this._recognition.stop();
      this._recognition = null;
    }
  },
  
  async isAvailable() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }
};
```

---

## 5. Voice Settings UI (Phase 4)

### Settings Page Structure

```html
<!-- Extend existing voice section (settings.html:947-996) -->
<section class="settings-section" id="novaSettings">
  <h3>🎤 Voice Companion — Nova</h3>
  
  <!-- Provider Selection -->
  <div class="settings-row">
    <strong>TTS Provider</strong>
    <select id="novaProvider">
      <option value="browser">Browser (Free, Basic)</option>
      <option value="kokoro">Kokoro-82M (Premium, Local)</option>
      <option value="tts-ai">tts.ai (Free Cloud)</option>
      <option value="elevenlabs">ElevenLabs (Premium Cloud)</option>
    </select>
  </div>
  
  <!-- Voice Selection (dynamic based on provider) -->
  <div class="settings-row">
    <strong>Voice</strong>
    <select id="novaVoice">
      <!-- Populated dynamically -->
    </select>
    <button id="novaVoicePreview">▶ Preview</button>
  </div>
  
  <!-- Voice Parameters -->
  <div class="settings-row">
    <strong>Speed</strong>
    <input type="range" id="novaSpeed" min="0.5" max="2" step="0.1" value="1">
    <span id="novaSpeedLabel">1.0x</span>
  </div>
  
  <div class="settings-row">
    <strong>Pitch</strong>
    <input type="range" id="novaPitch" min="0.5" max="2" step="0.1" value="1">
    <span id="novaPitchLabel">1.0</span>
  </div>
  
  <!-- Microphone Settings -->
  <h4>🎤 Microphone</h4>
  <div class="settings-row">
    <strong>Noise Suppression</strong>
    <input type="checkbox" id="novaNoiseSuppression">
  </div>
  
  <div class="settings-row">
    <strong>Echo Cancellation</strong>
    <input type="checkbox" id="novaEchoCancellation" checked>
  </div>
  
  <!-- Wake Word -->
  <h4>✨ Wake Word</h4>
  <div class="settings-row">
    <strong>Enable "Hey Nova"</strong>
    <input type="checkbox" id="novaWakeWordEnabled">
  </div>
  
  <!-- Visual Settings -->
  <h4>🎨 Visuals</h4>
  <div class="settings-row">
    <strong>Waveform Animation</strong>
    <input type="checkbox" id="novaWaveformEnabled" checked>
  </div>
  
  <!-- API Keys (hidden unless provider selected) -->
  <div id="novaApiKeys" style="display: none;">
    <h4>🔑 API Keys</h4>
    <div class="settings-row">
      <strong>tts.ai API Key (optional)</strong>
      <input type="password" id="novaTtsAiKey" placeholder="Optional — improves rate limits">
    </div>
    <div class="settings-row">
      <strong>ElevenLabs API Key</strong>
      <input type="password" id="novaElevenLabsKey" placeholder="Required for ElevenLabs">
    </div>
  </div>
</section>
```

### Settings Controller

```javascript
// Add to settings.html <script>
const NovaSettings = {
  elements: {},
  
  init() {
    this.cacheElements();
    this.loadSettings();
    this.bindEvents();
  },
  
  cacheElements() {
    this.elements = {
      provider: document.getElementById('novaProvider'),
      voice: document.getElementById('novaVoice'),
      voicePreview: document.getElementById('novaVoicePreview'),
      speed: document.getElementById('novaSpeed'),
      speedLabel: document.getElementById('novaSpeedLabel'),
      pitch: document.getElementById('novaPitch'),
      pitchLabel: document.getElementById('novaPitchLabel'),
      noiseSuppression: document.getElementById('novaNoiseSuppression'),
      echoCancellation: document.getElementById('novaEchoCancellation'),
      wakeWordEnabled: document.getElementById('novaWakeWordEnabled'),
      waveformEnabled: document.getElementById('novaWaveformEnabled'),
      ttsAiKey: document.getElementById('novaTtsAiKey'),
      elevenLabsKey: document.getElementById('novaElevenLabsKey'),
      apiKeys: document.getElementById('novaApiKeys'),
    };
  },
  
  async loadSettings() {
    const settings = JSON.parse(localStorage.getItem('blockflow_nova_settings') || '{}');
    
    this.elements.provider.value = settings.provider || 'browser';
    this.elements.speed.value = settings.speed || 1;
    this.elements.pitch.value = settings.pitch || 1;
    this.elements.noiseSuppression.checked = settings.noiseSuppression || false;
    this.elements.echoCancellation.checked = settings.echoCancellation !== false;
    this.elements.wakeWordEnabled.checked = settings.wakeWordEnabled || false;
    this.elements.waveformEnabled.checked = settings.waveformEnabled !== false;
    this.elements.ttsAiKey.value = settings.ttsAiKey || '';
    this.elements.elevenLabsKey.value = settings.elevenLabsKey || '';
    
    // Update labels
    this.elements.speedLabel.textContent = this.elements.speed.value + 'x';
    this.elements.pitchLabel.textContent = this.elements.pitch.value;
    
    // Show/hide API keys section
    this._updateApiKeysVisibility();
    
    // Load voices for selected provider
    await this._loadVoices();
  },
  
  async _loadVoices() {
    const providerName = this.elements.provider.value;
    const provider = NovaTTS.getProvider(providerName);
    
    const voices = await provider.listVoices();
    
    this.elements.voice.innerHTML = '';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} (${v.lang})`;
      this.elements.voice.appendChild(opt);
    });
  },
  
  _updateApiKeysVisibility() {
    const provider = this.elements.provider.value;
    this.elements.apiKeys.style.display = 
      (provider === 'tts-ai' || provider === 'elevenlabs') ? 'block' : 'none';
  },
  
  bindEvents() {
    // Provider change
    this.elements.provider.addEventListener('change', async () => {
      this._updateApiKeysVisibility();
      await this._loadVoices();
      this.saveSettings();
    });
    
    // Voice preview
    this.elements.voicePreview.addEventListener('click', async () => {
      const provider = NovaTTS.getProvider(this.elements.provider.value);
      await provider.generate('Hello! I am Nova, your AI companion.', {
        voiceId: this.elements.voice.value,
        speed: parseFloat(this.elements.speed.value),
        pitch: parseFloat(this.elements.pitch.value),
      });
    });
    
    // Speed/pitch sliders
    this.elements.speed.addEventListener('input', () => {
      this.elements.speedLabel.textContent = this.elements.speed.value + 'x';
      this.saveSettings();
    });
    
    this.elements.pitch.addEventListener('input', () => {
      this.elements.pitchLabel.textContent = this.elements.pitch.value;
      this.saveSettings();
    });
    
    // API keys
    this.elements.ttsAiKey.addEventListener('change', () => this.saveSettings());
    this.elements.elevenLabsKey.addEventListener('change', () => this.saveSettings());
  },
  
  saveSettings() {
    const settings = {
      provider: this.elements.provider.value,
      voice: this.elements.voice.value,
      speed: parseFloat(this.elements.speed.value),
      pitch: parseFloat(this.elements.pitch.value),
      noiseSuppression: this.elements.noiseSuppression.checked,
      echoCancellation: this.elements.echoCancellation.checked,
      wakeWordEnabled: this.elements.wakeWordEnabled.checked,
      waveformEnabled: this.elements.waveformEnabled.checked,
      ttsAiKey: this.elements.ttsAiKey.value,
      elevenLabsKey: this.elements.elevenLabsKey.value,
    };
    
    localStorage.setItem('blockflow_nova_settings', JSON.stringify(settings));
  }
};
```

---

## 6. Waveform Visualization (Phase 9)

### Canvas Setup

```html
<!-- Add to AI assistant HTML (injected by ai-assistant.js) -->
<canvas class="ai-waveform-canvas" width="200" height="60"></canvas>
```

### Waveform Renderer

```javascript
const NovaWaveform = {
  _canvas: null,
  _ctx: null,
  _analyser: null,
  _animationId: null,
  
  init() {
    this._canvas = document.querySelector('.ai-waveform-canvas');
    if (!this._canvas) return;
    
    this._ctx = this._canvas.getContext('2d');
    this._setupAudio();
  },
  
  _setupAudio() {
    // Create audio context for visualization
    this._audioContext = new AudioContext();
    this._analyser = this._audioContext.createAnalyser();
    this._analyser.fftSize = 256;
    
    this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
  },
  
  /**
   * Connect to microphone for listening visualization
   */
  async connectMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this._audioContext.createMediaStreamSource(stream);
    source.connect(this._analyser);
    
    this._stream = stream;
    this._startDrawing();
  },
  
  /**
   * Connect to audio element for speaking visualization
   */
  connectAudioElement(audioElement) {
    const source = this._audioContext.createMediaElementSource(audioElement);
    source.connect(this._analyser);
    source.connect(this._audioContext.destination); // Play audio
    
    this._startDrawing();
  },
  
  /**
   * Draw waveform bars
   */
  _draw() {
    this._animationId = requestAnimationFrame(() => this._draw());
    
    this._analyser.getByteFrequencyData(this._dataArray);
    
    const { width, height } = this._canvas;
    
    // Clear with fade effect
    this._ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this._ctx.fillRect(0, 0, width, height);
    
    // Draw bars
    const barWidth = width / this._dataArray.length;
    const accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-color').trim();
    
    this._dataArray.forEach((value, i) => {
      const barHeight = (value / 255) * height;
      
      // Gradient color based on frequency
      const hue = 220 + (i / this._dataArray.length) * 40;
      this._ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
      
      this._ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight
      );
    });
  },
  
  _startDrawing() {
    if (this._animationId) return;
    this._draw();
  },
  
  stop() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    
    if (this._stream) {
      this._stream.getTracks().forEach(track => track.stop());
      this._stream = null;
    }
  }
};
```

---

## 7. Interruption Handling (Phase 6)

### Strategy

When the user speaks while Nova is speaking:
1. Detect voice activity (VAD or manual mic press)
2. Cancel current TTS playback
3. Process new user input
4. Resume conversation

### Implementation

```javascript
// Add to AIAssistant
_handleInterruption() {
  if (this._novaState === 'speaking') {
    // Cancel current speech
    this.stopSpeaking();
    
    // Stop waveform visualization
    NovaWaveform.stop();
    
    // Reset state
    this._setNovaState('idle');
    
    // Visual feedback
    UI.showToast('Interrupted — listening...');
  }
},

// Modify speak() to check for interruptions
speak(text) {
  if (!this._voiceSettings.enabled) return;
  
  this._setNovaState('speaking');
  
  const provider = NovaTTS.getProvider(this._voiceSettings.provider);
  
  // Check for interruption every 100ms
  const interruptionCheck = setInterval(() => {
    if (this._novaState !== 'speaking') {
      clearInterval(interruptionCheck);
      return;
    }
    
    // If mic is active, handle interruption
    if (this.isListening) {
      this._handleInterruption();
      clearInterval(interruptionCheck);
    }
  }, 100);
  
  // Generate and play audio
  provider.generate(text, {
    voiceId: this._voiceSettings.kokoroVoice,
    speed: this._voiceSettings.speed,
    pitch: this._voiceSettings.pitch,
  }).then(buffer => {
    // Play buffer
    const audioContext = new AudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    
    source.onended = () => {
      clearInterval(interruptionCheck);
      this._setNovaState('idle');
    };
  });
}
```

---

## 8. File Structure

### New Files

```
js/
├── nova/
│   ├── nova-controller.js      # State machine, provider dispatch
│   ├── nova-tts-providers.js   # TTS provider implementations
│   ├── nova-stt-providers.js   # STT provider implementations
│   ├── nova-waveform.js        # Canvas waveform renderer
│   └── nova-settings.js        # Settings controller
```

### Modified Files

```
js/ai-assistant.js              # Add Nova imports, extend _voiceSettings
settings.html                   # Add Nova settings section
css/style.css                   # Add Nova animation classes
```

---

## 9. Implementation Phases

| Phase | Feature | Files Modified | Dependencies |
|-------|---------|----------------|--------------|
| 1 ✅ | Basic TTS | ai-assistant.js | None |
| 2 | Live Transcription | nova-stt-providers.js | Web Speech API |
| 3 | Premium TTS | nova-tts-providers.js | kokoro-js (dynamic import) |
| 4 | Voice Settings UI | settings.html, nova-settings.js | None |
| 5 | Voice Cloning Prep | nova-tts-providers.js | F5-TTS (optional) |
| 6 | Interruption | nova-controller.js | VAD or mic detection |
| 7 | Better Memory | ai-assistant.js | None |
| 8 | Voice + Memory | nova-controller.js | Phase 7 |
| 9 | Animations | nova-waveform.js, css/style.css | Web Audio API |
| 10 | Performance | nova/*.js | Lazy loading |
| 11 | Testing | tests/ | Playwright |

---

## 10. Performance Budget

| Resource | Budget | Notes |
|----------|--------|-------|
| Initial JS | < 50KB | Core controller + browser TTS |
| Kokoro model | 86MB | Lazy loaded on first use |
| Canvas animations | < 5% CPU | 60fps with rAF |
| Audio buffers | < 10MB | Cache recent generations |
| localStorage | < 1MB | Settings + voice cache |

---

*Architecture designed based on VOICE_RESEARCH.md findings. Ready for phased implementation.*

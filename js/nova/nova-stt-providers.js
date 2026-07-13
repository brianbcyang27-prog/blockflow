/**
 * Nova STT Providers — Speech-to-Text abstraction layer
 * 
 * Provides provider-swappable STT with:
 * - Browser Web Speech API (primary)
 * - Graceful degradation for unsupported browsers
 * - Android Chrome continuous recognition workaround
 * 
 * @module NovaSTT
 * @version 2.2.0
 */

const NovaSTT = {
  /**
   * STT Provider Interface
   * Each provider must implement:
   * - start(options) → begins recognition
   * - stop() → ends recognition
   * - isAvailable() → boolean
   */
  providers: {},

  /**
   * Current active provider
   */
  _currentProvider: null,

  /**
   * Recognition state
   */
  _state: 'idle', // 'idle' | 'listening' | 'processing'

  /**
   * Event listeners
   */
  _listeners: {
    onResult: null,
    onInterim: null,
    onStart: null,
    onEnd: null,
    onError: null,
  },

  /**
   * Initialize NovaSTT
   */
  init() {
    this._currentProvider = this.providers.browser;
  },

  /**
   * Register event listeners
   */
  on(event, callback) {
    if (this._listeners.hasOwnProperty(event)) {
      this._listeners[event] = callback;
    }
  },

  /**
   * Emit event to listeners
   */
  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event](data);
    }
  },

  /**
   * Start recognition
   * @param {Object} options - Recognition options
   */
  async start(options = {}) {
    if (this._state !== 'idle') {
      this.stop();
    }

    const provider = this._currentProvider;
    if (!provider || !(await provider.isAvailable())) {
      this._emit('onError', { error: 'Speech recognition not supported in this browser' });
      return;
    }

    this._state = 'listening';
    this._emit('onStart', {});

    try {
      await provider.start(options);
    } catch (error) {
      this._state = 'idle';
      this._emit('onError', { error: error.message });
    }
  },

  /**
   * Stop recognition
   */
  stop() {
    if (this._currentProvider) {
      this._currentProvider.stop();
    }
    this._state = 'idle';
    this._emit('onEnd', {});
  },

  /**
   * Get current state
   */
  getState() {
    return this._state;
  }
};

/**
 * Browser STT Provider
 * Uses Web Speech API (SpeechRecognition)
 */
const BrowserSTTProvider = {
  name: 'browser',
  _recognition: null,
  _isListening: false,
  _restartTimeout: null,
  _processedResults: new Set(),
  _lastResultIndex: 0,

  /**
   * Check if provider is available
   */
  async isAvailable() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  },

  /**
   * Start recognition
   * @param {Object} options
   * @param {boolean} options.continuous - Keep listening after result
   * @param {boolean} options.interimResults - Show partial results
   * @param {string} options.lang - Language code
   */
  async start(options = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition not supported');
    }

    this._isListening = true;
    this._processedResults.clear();
    this._lastResultIndex = 0;

    this._recognition = new SpeechRecognition();
    this._recognition.lang = options.lang || 'en-US';
    this._recognition.continuous = options.continuous !== false;
    this._recognition.interimResults = options.interimResults !== false;
    this._recognition.maxAlternatives = 1;

    this._recognition.onresult = (event) => {
      this._handleResult(event);
    };

    this._recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Silently handle these
        return;
      }
      NovaSTT._emit('onError', { error: event.error });
    };

    this._recognition.onend = () => {
      // Auto-restart for continuous mode (workaround for Android Chrome)
      if (this._isListening && NovaSTT._state === 'listening') {
        this._restartTimeout = setTimeout(() => {
          if (this._isListening) {
            this._restart();
          }
        }, 250);
      }
    };

    try {
      this._recognition.start();
    } catch (error) {
      this._isListening = false;
      throw error;
    }
  },

  /**
   * Stop recognition
   */
  stop() {
    this._isListening = false;
    
    if (this._restartTimeout) {
      clearTimeout(this._restartTimeout);
      this._restartTimeout = null;
    }

    if (this._recognition) {
      try {
        this._recognition.stop();
      } catch (e) { /* silent */ }
      this._recognition = null;
    }

    this._processedResults.clear();
    this._lastResultIndex = 0;
  },

  /**
   * Restart recognition (for continuous mode)
   */
  _restart() {
    if (!this._isListening) return;

    try {
      this._recognition.start();
    } catch (error) {
      // Already started, ignore
    }
  },

  /**
   * Handle recognition result
   */
  _handleResult(event) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        // Deduplicate final results
        if (!this._processedResults.has(transcript)) {
          this._processedResults.add(transcript);
          finalTranscript += transcript;
        }
      } else {
        interimTranscript += transcript;
      }
    }

    // Emit interim results
    if (interimTranscript) {
      NovaSTT._emit('onInterim', { transcript: interimTranscript });
    }

    // Emit final results
    if (finalTranscript) {
      NovaSTT._emit('onResult', { transcript: finalTranscript.trim() });
    }
  }
};

// Register providers
NovaSTT.providers.browser = BrowserSTTProvider;

// Initialize on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    NovaSTT.init();
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NovaSTT, BrowserSTTProvider };
}

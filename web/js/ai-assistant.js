/**
 * AIAssistant - BlockFlow's integrated AI productivity assistant
 * 
 * Features:
 * - Draggable, resizable, snap-to-sidebar window
 * - Streaming chat with NVIDIA API
 * - Voice input support
 * - Conversation history persistence
 * - Custom system prompt / persona
 * - Long-term memory points
 * - Markdown rendering in AI messages
 * - Auto-scroll lock
 * - Copy-to-clipboard on messages
 * - Retry on failure
 * - Dynamic suggestion chips
 * 
 * @module AIAssistant
 * @version 2.1.0
 */

const AIAssistant = {
  elements: {},
  isOpen: false,
  isProcessing: false,
  isListening: false,
  messages: [],
  memoryPoints: [],
  _container: null,
  _dragState: null,
  _resizeState: null,
  _recognition: null,
  _minWidth: 320,
  _minHeight: 400,
  _snapThreshold: 60,
  _maxHistoryMessages: 20,
  _maxMemoryPoints: 10,
  _userScrolledUp: false,
  _lastUserMessage: '',
  _storageKeys: {
    position: 'blockflow_ai_pos',
    model: 'blockflow_ai_model',
    history: 'blockflow_ai_history',
    systemPrompt: 'blockflow_ai_system_prompt',
    memory: 'blockflow_ai_memory'
  },

  /**
   * Initialize the AI Assistant
   */
  init() {
    this.cacheElements();
    if (!this.elements.bubble) return;
    this.setupEventListeners();
    this.initDrag();
    this.initResize();
    this.loadSystemPrompt();
    this.loadMemoryPoints();
    this.loadMessageHistory();
    this.addGreeting();
  },

  /**
   * Cache all DOM element references for performance
   */
  cacheElements() {
    this.elements = {
      bubble: document.getElementById('aiBubble'),
      overlay: document.getElementById('aiOverlay'),
      conversation: document.getElementById('aiMessages'),
      input: document.getElementById('aiInput'),
      sendBtn: document.getElementById('aiSend'),
      voiceBtn: document.getElementById('aiVoiceBtn'),
      closeBtn: document.getElementById('aiClose'),
      modelSelect: document.getElementById('aiModelSelect'),
      suggestions: document.getElementById('aiSuggestions'),
      chips: document.querySelectorAll('.ai-chip'),
      systemPromptBtn: document.getElementById('aiSystemPromptBtn'),
      systemPromptModal: document.getElementById('aiSystemPromptModal'),
      systemPromptTextarea: document.getElementById('aiSystemPromptTextarea'),
      systemPromptSave: document.getElementById('aiSystemPromptSave'),
      systemPromptCancel: document.getElementById('aiSystemPromptCancel'),
      systemPromptReset: document.getElementById('aiSystemPromptReset'),
      memoryBtn: document.getElementById('aiMemoryBtn'),
      memoryModal: document.getElementById('aiMemoryModal'),
      memoryList: document.getElementById('aiMemoryList'),
      memoryAddBtn: document.getElementById('aiMemoryAddBtn'),
      memoryInput: document.getElementById('aiMemoryInput'),
      memoryClose: document.getElementById('aiMemoryClose')
    };
  },

  /**
   * Set up all event listeners for UI interactions
   */
  setupEventListeners() {
    this.elements.bubble.addEventListener('click', () => this.toggle());
    this.elements.closeBtn.addEventListener('click', () => this.close());
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    this.elements.input.addEventListener('input', () => this.autoResize());
    this.elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.elements.conversation.addEventListener('scroll', () => {
      const el = this.elements.conversation;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      this._userScrolledUp = !atBottom;
    });

    if (this.elements.voiceBtn) {
      this.elements.voiceBtn.addEventListener('click', () => this.toggleVoice());
    }
    if (this.elements.modelSelect) {
      const savedModel = localStorage.getItem(this._storageKeys.model);
      if (savedModel) this.elements.modelSelect.value = savedModel;
      this.elements.modelSelect.addEventListener('change', () => {
        localStorage.setItem(this._storageKeys.model, this.elements.modelSelect.value);
      });
    }

    this.elements.chips.forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        if (prompt) {
          this.open();
          this.addUserMessage(prompt);
          this.getAiResponse(prompt);
        }
      });
    });

    if (this.elements.systemPromptBtn) {
      this.elements.systemPromptBtn.addEventListener('click', () => this.openSystemPromptModal());
    }
    if (this.elements.systemPromptSave) {
      this.elements.systemPromptSave.addEventListener('click', () => this.saveSystemPrompt());
    }
    if (this.elements.systemPromptCancel) {
      this.elements.systemPromptCancel.addEventListener('click', () => this.closeSystemPromptModal());
    }
    if (this.elements.systemPromptReset) {
      this.elements.systemPromptReset.addEventListener('click', () => this.resetSystemPrompt());
    }
    if (this.elements.systemPromptModal) {
      this.elements.systemPromptModal.addEventListener('click', (e) => {
        if (e.target === this.elements.systemPromptModal) this.closeSystemPromptModal();
      });
    }

    if (this.elements.memoryBtn) {
      this.elements.memoryBtn.addEventListener('click', () => this.openMemoryModal());
    }
    if (this.elements.memoryAddBtn) {
      this.elements.memoryAddBtn.addEventListener('click', () => this.addMemoryPoint());
    }
    if (this.elements.memoryInput) {
      this.elements.memoryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addMemoryPoint();
      });
    }
    if (this.elements.memoryClose) {
      this.elements.memoryClose.addEventListener('click', () => this.closeMemoryModal());
    }
    if (this.elements.memoryModal) {
      this.elements.memoryModal.addEventListener('click', (e) => {
        if (e.target === this.elements.memoryModal) this.closeMemoryModal();
      });
    }

    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.elements.input.focus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
      if (e.key === 'Escape' && this.elements.systemPromptModal?.classList.contains('open')) this.closeSystemPromptModal();
      if (e.key === 'Escape' && this.elements.memoryModal?.classList.contains('open')) this.closeMemoryModal();
    });
  },

  /**
   * Auto-resize the input textarea based on content
   */
  autoResize() {
    const el = this.elements.input;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  },

  toggleVoice() {
    this.isListening ? this.stopVoice() : this.startVoice();
  },

  startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.addAiMessage('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    this.isListening = true;
    this.elements.voiceBtn.classList.add('listening');
    this.elements.voiceBtn.textContent = '⏹';
    this.elements.input.placeholder = 'Listening...';

    this._recognition = new SpeechRecognition();
    this._recognition.lang = 'en-US';
    this._recognition.continuous = false;
    this._recognition.interimResults = false;

    this._recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.elements.input.value = transcript;
      this.autoResize();
      this.stopVoice();
      this.sendMessage();
    };

    this._recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      this.stopVoice();
      if (event.error !== 'no-speech') {
        this.addAiMessage('Could not hear you. Please try typing instead.');
      }
    };

    this._recognition.onend = () => {
      this.stopVoice();
    };

    this._recognition.start();
  },

  stopVoice() {
    this.isListening = false;
    if (this.elements.voiceBtn) {
      this.elements.voiceBtn.classList.remove('listening');
      this.elements.voiceBtn.textContent = '🎤';
    }
    this.elements.input.placeholder = 'Ask me anything...';
    if (this._recognition) {
      try { this._recognition.stop(); } catch (e) {}
      this._recognition = null;
    }
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    if (this.isOpen) return;
    const container = this.getContainer();
    const saved = this.loadPosition();

    if (saved) {
      if (saved.snapped === 'left' || saved.snapped === 'right') {
        container.classList.add('snapped-' + saved.snapped);
        if (saved.w) container.style.width = saved.w + 'px';
        if (saved.h) container.style.height = saved.h + 'px';
      } else if (saved.left !== undefined) {
        const clamped = this.clampPosition(saved.left, saved.top);
        this.setPosition(clamped.left, clamped.top);
        if (saved.w) container.style.width = saved.w + 'px';
        if (saved.h) container.style.height = saved.h + 'px';
      } else {
        this.centerContainer();
      }
    } else {
      this.centerContainer();
    }

    this.isOpen = true;
    this.elements.overlay.classList.add('open');
    this.elements.bubble.classList.add('hidden');
    setTimeout(() => {
      this.elements.input.focus();
      this.autoResize();
      this._userScrolledUp = false;
      this.scrollToBottom();
    }, 350);
  },

  close() {
    this.isOpen = false;
    this.elements.overlay.classList.remove('open');
    this.elements.bubble.classList.remove('hidden');
  },

  getContainer() {
    if (!this._container) {
      this._container = this.elements.overlay.querySelector('.ai-container');
    }
    return this._container;
  },

  setPosition(left, top) {
    const container = this.getContainer();
    if (!container) return;
    container.style.left = left + 'px';
    container.style.top = top + 'px';
  },

  clampPosition(left, top) {
    const container = this.getContainer();
    if (!container) return { left, top };
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const minLeft = -(w * 0.4);
    const maxLeft = window.innerWidth - (w * 0.3);
    const minTop = 0;
    const maxTop = window.innerHeight - 40;
    return {
      left: Math.max(minLeft, Math.min(maxLeft, left)),
      top: Math.max(minTop, Math.min(maxTop, top))
    };
  },

  centerContainer() {
    const container = this.getContainer();
    if (!container) return;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const left = Math.max(0, (window.innerWidth - w) / 2);
    const top = Math.max(0, (window.innerHeight - h) / 2);
    this.setPosition(left, top);
  },

  savePosition(pos) {
    try { localStorage.setItem(this._storageKeys.position, JSON.stringify(pos)); } catch (e) {}
  },

  loadPosition() {
    try {
      const saved = localStorage.getItem(this._storageKeys.position);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },

  initDrag() {
    const header = this.elements.overlay.querySelector('.ai-header');
    if (!header) return;

    header.addEventListener('mousedown', (e) => this._onDragStart(e));
    document.addEventListener('mousemove', (e) => this._onDragMove(e));
    document.addEventListener('mouseup', () => this._onDragEnd());

    window.addEventListener('resize', () => {
      const saved = this.loadPosition();
      if (saved && !saved.snapped && saved.left !== undefined) {
        const clamped = this.clampPosition(saved.left, saved.top);
        this.setPosition(clamped.left, clamped.top);
        this.savePosition(clamped);
      }
    });
  },

  _onDragStart(e) {
    if (e.button !== 0) return;
    const tag = e.target.tagName;
    if (['SELECT', 'BUTTON', 'INPUT', 'TEXTAREA', 'OPTION'].includes(tag)) return;

    const container = this.getContainer();
    if (!container) return;

    const wasSnapped = container.classList.contains('snapped-left') || container.classList.contains('snapped-right');
    if (wasSnapped) {
      const rect = container.getBoundingClientRect();
      const saved = this.loadPosition() || {};
      container.classList.remove('snapped-left', 'snapped-right');
      container.style.left = ''; container.style.right = ''; container.style.top = '';
      this.setPosition(rect.left, rect.top);
      if (saved.w) container.style.width = saved.w + 'px';
      if (saved.h) container.style.height = saved.h + 'px';
    }

    const rect = container.getBoundingClientRect();
    this._dragState = {
      isDragging: true,
      startLeft: rect.left,
      startTop: rect.top,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };

    container.style.transition = 'none';
  },

  _onDragMove(e) {
    if (!this._dragState?.isDragging) return;
    e.preventDefault();

    const newLeft = e.clientX - this._dragState.offsetX;
    const newTop = e.clientY - this._dragState.offsetY;
    const clamped = this.clampPosition(newLeft, newTop);
    this.setPosition(clamped.left, clamped.top);
  },

  _onDragEnd() {
    if (!this._dragState?.isDragging) return;
    this._dragState.isDragging = false;

    const container = this.getContainer();
    if (!container) { this._dragState = null; return; }
    container.style.transition = '';

    if (window.innerWidth > 640) {
      const rect = container.getBoundingClientRect();
      if (rect.left <= this._snapThreshold) {
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        container.classList.remove('snapped-left', 'snapped-right');
        container.classList.add('snapped-left');
        container.style.left = ''; container.style.top = '';
        this.savePosition({ snapped: 'left', w, h });
        this._dragState = null;
        return;
      }
      if (rect.left + rect.width >= window.innerWidth - this._snapThreshold) {
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        container.classList.remove('snapped-left', 'snapped-right');
        container.classList.add('snapped-right');
        container.style.left = ''; container.style.top = '';
        this.savePosition({ snapped: 'right', w, h });
        this._dragState = null;
        return;
      }
    }

    const left = parseInt(container.style.left, 10) || 0;
    const top = parseInt(container.style.top, 10) || 0;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    this.savePosition({ left, top, w, h, snapped: null });
    this._dragState = null;
  },

  initResize() {
    const handle = this.getContainer().querySelector('.ai-resize-handle');
    if (!handle) return;
    handle.addEventListener('mousedown', (e) => this._onResizeStart(e));
  },

  _onResizeStart(e) {
    e.stopPropagation();
    e.preventDefault();
    const container = this.getContainer();
    if (!container) return;
    if (container.classList.contains('snapped-left') || container.classList.contains('snapped-right')) return;

    const rect = container.getBoundingClientRect();
    this._resizeState = {
      startX: e.clientX, startY: e.clientY,
      startW: rect.width, startH: rect.height
    };
    container.style.transition = 'none';
    container.style.maxWidth = 'none';
    container.style.maxHeight = 'none';
  },

  _onResizeMove(e) {
    if (!this._resizeState) return;
    e.preventDefault();
    const container = this.getContainer();
    if (!container) return;

    const dw = e.clientX - this._resizeState.startX;
    const dh = e.clientY - this._resizeState.startY;
    let newW = Math.max(this._minWidth, this._resizeState.startW + dw);
    let newH = Math.max(this._minHeight, this._resizeState.startH + dh);

    const currentLeft = parseInt(container.style.left, 10) || 0;
    const currentTop = parseInt(container.style.top, 10) || 0;
    newW = Math.min(newW, window.innerWidth - currentLeft - 20);
    newH = Math.min(newH, window.innerHeight - currentTop - 20);

    container.style.width = newW + 'px';
    container.style.height = newH + 'px';
  },

  _onResizeEnd() {
    if (!this._resizeState) return;
    const container = this.getContainer();
    if (container) {
      container.style.transition = '';
      container.style.maxWidth = '';
      container.style.maxHeight = '';
      const saved = this.loadPosition() || {};
      saved.w = container.offsetWidth;
      saved.h = container.offsetHeight;
      this.savePosition(saved);
    }
    this._resizeState = null;
  },

  /**
   * Add the initial greeting message with calendar context
   */
  addGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const events = typeof Storage !== 'undefined' ? Storage.getCalendarEvents() : [];
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);

    let contextMsg = 'How can I help you today?';
    if (todayEvents.length > 0) {
      const count = todayEvents.length;
      contextMsg = `You have ${count} event${count !== 1 ? 's' : ''} on your calendar today. Want to review your schedule or plan something?`;
    }

    const greeting = `${timeGreeting}! I'm your BlockFlow assistant. ${contextMsg}`;
    this.addAiMessage(greeting, true);
  },

  /**
   * Load conversation history from localStorage
   */
  loadMessageHistory() {
    try {
      const saved = localStorage.getItem(this._storageKeys.history);
      if (saved) {
        this.messages = JSON.parse(saved);
        this.messages.forEach(msg => {
          if (msg.role === 'user') {
            this.addUserMessage(msg.content, false);
          } else if (msg.role === 'assistant') {
            this.addAiMessage(msg.content, false);
          }
        });
      }
    } catch (e) {}
  },

  /**
   * Save conversation history to localStorage
   */
  saveMessageHistory() {
    try {
      localStorage.setItem(this._storageKeys.history, JSON.stringify(this.messages));
    } catch (e) {}
  },

  sendMessage() {
    const text = this.elements.input.value.trim();
    if (!text || this.isProcessing) return;
    this.elements.input.value = '';
    this.elements.input.style.height = 'auto';

    this._lastUserMessage = text;
    this.addUserMessage(text);
    const enriched = this._enrichForAi(text);
    this.getAiResponse(enriched);
  },

  addUserMessage(text, saveToHistory = true) {
    const container = this.elements.conversation;
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-user';
    div.textContent = text;
    container.appendChild(div);
    this.scrollToBottom();
    if (saveToHistory) {
      this.messages.push({ role: 'user', content: text });
      this.saveMessageHistory();
    }
  },

  addAiMessage(text, isFirst = false) {
    const container = this.elements.conversation;
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-ai';
    div.style.position = 'relative';
    div.innerHTML = this.renderMarkdown(text);
    this.addCopyButton(div);
    container.appendChild(div);
    this.scrollToBottom();
    if (!isFirst) {
      this.messages.push({ role: 'assistant', content: text });
      this.saveMessageHistory();
    }
  },

  /**
   * Convert markdown text to safe HTML
   * @param {string} text
   * @returns {string}
   */
  renderMarkdown(text) {
    const codeBlocks = [];
    let processed = text;

    processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      codeBlocks.push(code);
      return `\x00CB${codeBlocks.length - 1}\x00`;
    });

    processed = processed.replace(/^> (.+)$/gm, (match, content) => {
      return `\x00BQ${this.escapeHtml(content)}\x00`;
    });

    const div = document.createElement('div');
    div.textContent = processed;
    let html = div.innerHTML;

    html = html.replace(/\x00CB(\d+)\x00/g, (match, idx) => {
      return `<pre><code>${this.escapeHtml(codeBlocks[parseInt(idx)])}</code></pre>`;
    });

    html = html.replace(/\x00BQ([\s\S]*?)\x00/g, '<blockquote><p>$1</p></blockquote>');

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => {
      if (/^\d+\./m.test(match)) return '<ol>' + match + '</ol>';
      return '<ul>' + match + '</ul>';
    });

    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    html = html.replace(/---+/g, '<hr>');
    html = html.replace(/([^>\n])\n(?!<)/g, '$1<br>');

    return html;
  },

  /**
   * Add copy-to-clipboard button to a message element
   * @param {HTMLElement} msgEl
   */
  addCopyButton(msgEl) {
    const btn = document.createElement('button');
    btn.className = 'ai-copy-btn';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    btn.title = 'Copy message';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = msgEl.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 2000);
      }).catch(() => {});
    });
    msgEl.appendChild(btn);
  },

  showTyping() {
    const container = this.elements.conversation;
    const div = document.createElement('div');
    div.className = 'ai-typing';
    div.id = 'aiTypingIndicator';
    div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    container.appendChild(div);
    this.scrollToBottom();
  },

  removeTyping() {
    const el = document.getElementById('aiTypingIndicator');
    if (el) el.remove();
  },

  scrollToBottom() {
    if (this._userScrolledUp) return;
    const container = this.elements.conversation;
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
  },

  loadSystemPrompt() {
    const saved = localStorage.getItem(this._storageKeys.systemPrompt);
    this._customSystemPrompt = saved || null;
    if (this.elements.systemPromptTextarea && saved) {
      this.elements.systemPromptTextarea.value = saved;
    }
  },

  /**
   * Get the active system prompt (custom or default)
   * @returns {string}
   */
  getSystemPrompt() {
    if (this._customSystemPrompt) return this._customSystemPrompt;
    return this.getDefaultSystemPrompt();
  },

  /**
   * Default system prompt for the AI assistant
   * @returns {string}
   */
  getDefaultSystemPrompt() {
    return `You are a personal executive assistant integrated into BlockFlow, a daily planning and focus app. Your role is to help users be more organized, productive, and intentional with their time.

IMPORTANT: The user's full calendar for today and upcoming days is provided to you before each message. Read it carefully — you never need to ask the user what their schedule is. You can see it directly.

## Core behavior

You are not a form-filling chatbot. You understand intent, reason about the user's schedule, and make smart decisions. When the user mentions something involving their calendar, time, or tasks, you think first before responding:

1. What is the user actually trying to achieve?
2. What does their calendar look like right now?
3. Can I solve this automatically?
4. Do I actually need more information, or can I make a reasonable assumption?
5. Execute what's needed, then explain naturally.

## Calendar management

You have direct access to the user's calendar through JSON tool calls. When you need to add, update, delete, or list events, append a \`\`\`json block at the end of your response with the correct tool format. Available tools:

addEvent — Add a new event
  {"tool":"addEvent","title":"...","date":"YYYY-MM-DD","time":"HH:MM","endTime":"HH:MM","description":"...","importance":"low|medium|high","block":"focus|personal|recovery"}

deleteEvent — Delete an event by id
  {"tool":"deleteEvent","id":"..."}

updateEvent — Update an existing event
  {"tool":"updateEvent","id":"...","title":"...","date":"...","time":"...","block":"..."}

listEvents — List events (omit date for all)
  {"tool":"listEvents","date":"YYYY-MM-DD"}

## Rules

### Understand intent, not just words
Never interpret literally if the user's intention is obvious. If they say "I'm going out with my friend tomorrow all day. Move everything to the next day", don't ask "what time?" — block the day and reschedule events automatically.

### Make reasonable assumptions
"I'm busy tomorrow" → all-day event. "I have class tonight" → assume evening. Only ask if the missing information truly prevents completing the task.

### Use calendar context
Your calendar data (today's events and upcoming days) is provided before every message. Always read it and reference specific events when relevant. "I see you have a team standup at 9am and a dentist appointment at 2pm today." Never ask the user what their schedule is — you already have it.

### Be proactive
Offer useful suggestions. "You've had three late nights — want me to protect tomorrow morning?" "You have 6 hours of focus without breaks — want me to spread them out?"

### Minimize questions
Never ask for information you don't truly need. Prefer "I can make this an all-day event" over "what time?". If you must ask, explain why.

### Hide tool usage
Never mention tool calls, JSON, or implementation details in your response. Just say what happened naturally. "Done! I've moved your meetings to Wednesday" — not "I used the updateEvent tool."

### Explain decisions briefly
"I moved your meetings to Wednesday so tomorrow stays completely free." Not just "done."

### Natural conversation
Vary your responses. Don't start every reply with "Sure, I can help." Use natural variety: "Sounds good", "Got it", "Absolutely", "Let's do that."

### Remember context
Understand follow-ups. If the user said "I'm free the day after" and then says "move everything", you should know what "everything" refers to.

### Personality
Be warm, calm, intelligent, and confident. Small touches help — "Hope you have fun tomorrow!", "You've earned a break."

## Communication style
- Warm and supportive
- Direct and concise — under 150 words unless the task requires more
- Respond in the same language the user writes in
- Never mention that you are an AI
- Never ask the user to repeat information they already gave

Always respond in the same language the user writes to you.`;
  },

  openSystemPromptModal() {
    if (!this.elements.systemPromptModal) return;
    this.elements.systemPromptTextarea.value = this._customSystemPrompt || '';
    this.elements.systemPromptModal.classList.add('open');
  },

  closeSystemPromptModal() {
    if (!this.elements.systemPromptModal) return;
    this.elements.systemPromptModal.classList.remove('open');
  },

  saveSystemPrompt() {
    const prompt = this.elements.systemPromptTextarea.value.trim();
    if (prompt) {
      localStorage.setItem(this._storageKeys.systemPrompt, prompt);
      this._customSystemPrompt = prompt;
    } else {
      localStorage.removeItem(this._storageKeys.systemPrompt);
      this._customSystemPrompt = null;
    }
    this.closeSystemPromptModal();
    this.addAiMessage('System prompt updated. It will apply to the next conversation.');
  },

  resetSystemPrompt() {
    localStorage.removeItem(this._storageKeys.systemPrompt);
    this._customSystemPrompt = null;
    this.elements.systemPromptTextarea.value = '';
    this.closeSystemPromptModal();
    this.addAiMessage('System prompt reset to default.');
  },

  /**
   * Load memory points from localStorage
   */
  loadMemoryPoints() {
    try {
      const saved = localStorage.getItem(this._storageKeys.memory);
      this.memoryPoints = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.memoryPoints = [];
    }
  },

  /**
   * Save memory points to localStorage
   */
  saveMemoryPoints() {
    try {
      localStorage.setItem(this._storageKeys.memory, JSON.stringify(this.memoryPoints));
    } catch (e) {}
  },

  /**
   * Add a new memory point
   */
  addMemoryPoint() {
    const text = this.elements.memoryInput.value.trim();
    if (!text) return;
    
    const point = {
      id: Date.now().toString(),
      content: text,
      createdAt: new Date().toISOString()
    };
    
    this.memoryPoints.unshift(point);
    if (this.memoryPoints.length > this._maxMemoryPoints) {
      this.memoryPoints = this.memoryPoints.slice(0, this._maxMemoryPoints);
    }
    
    this.saveMemoryPoints();
    this.renderMemoryList();
    this.elements.memoryInput.value = '';
  },

  /**
   * Delete a memory point by ID
   * @param {string} id 
   */
  deleteMemoryPoint(id) {
    this.memoryPoints = this.memoryPoints.filter(p => p.id !== id);
    this.saveMemoryPoints();
    this.renderMemoryList();
  },

  /**
   * Render the memory points list in the modal
   */
  renderMemoryList() {
    const list = this.elements.memoryList;
    if (!list) return;
    
    if (this.memoryPoints.length === 0) {
      list.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">No memory points yet. Add something important to remember.</p>';
      return;
    }
    
    list.innerHTML = this.memoryPoints.map(point => `
      <div class="memory-item" data-id="${point.id}">
        <span class="memory-content">${this.escapeHtml(point.content)}</span>
        <button class="memory-delete" data-id="${point.id}" title="Delete">×</button>
      </div>
    `).join('');
    
    list.querySelectorAll('.memory-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMemoryPoint(btn.dataset.id);
      });
    });
  },

  openMemoryModal() {
    if (!this.elements.memoryModal) return;
    this.renderMemoryList();
    this.elements.memoryModal.classList.add('open');
    this.elements.memoryInput.focus();
  },

  closeMemoryModal() {
    if (!this.elements.memoryModal) return;
    this.elements.memoryModal.classList.remove('open');
  },

  /**
   * Get memory points formatted for inclusion in system prompt
   * @returns {string}
   */
  getMemoryContext() {
    if (this.memoryPoints.length === 0) return '';
    const items = this.memoryPoints.map((p, i) => `${i + 1}. ${p.content}`).join('\n');
    return `\n\nUser's saved memory points (important context):\n${items}`;
  },

  /**
   * Get the API key from localStorage with fallback
   * @returns {string}
   */
  getApiKey() {
    return localStorage.getItem('blockflow_nvidia_key') || 
           localStorage.getItem('bf_key_nvidia') || 
           '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';
  },

  /**
   * Get the selected model
   * @returns {string}
   */
  getModel() {
    return this.elements.modelSelect?.value || 'nvidia/llama-3.1-nemotron-nano-8b-v1';
  },

  /**
   * Show dynamic suggestion chips after a response
   * @param {string} lastResponse
   */
  showDynamicSuggestions(lastResponse) {
    const container = this.elements.conversation;
    const existing = container.querySelector('.ai-suggestions-dynamic');
    if (existing) existing.remove();

    const suggestions = this._getContextualSuggestions(lastResponse);

    const wrap = document.createElement('div');
    wrap.className = 'ai-suggestions-dynamic';

    suggestions.forEach(text => {
      const chip = document.createElement('button');
      chip.className = 'ai-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        wrap.remove();
        this.addUserMessage(text);
        this.getAiResponse(text);
      });
      wrap.appendChild(chip);
    });

    container.appendChild(wrap);
    this.scrollToBottom();
  },

  /**
   * Generate contextual follow-up suggestions based on last response
   * @param {string} lastResponse
   * @returns {string[]}
   */
  _getContextualSuggestions(lastResponse) {
    const lower = lastResponse.toLowerCase();
    if (lower.includes('event') || lower.includes('added') || lower.includes('moved') || lower.includes('scheduled') || lower.includes('calendar')) {
      return ['What does my day look like?', 'Add a break this afternoon', 'Move my focus block to later'];
    }
    if (lower.includes('busy') || lower.includes('free') || lower.includes('schedule') || lower.includes('plan')) {
      return ['What\'s my week looking like?', 'Help me plan tomorrow', 'I need more focus time'];
    }
    if (lower.includes('focus') || lower.includes('timer') || lower.includes('deep work')) {
      return ['Start a 25 min focus session', 'How do I avoid distractions?', 'Plan my deep work blocks'];
    }
    if (lower.includes('break') || lower.includes('rest') || lower.includes('recovery') || lower.includes('tired')) {
      return ['Protect my evening', 'Schedule a break', 'How much rest do I need?'];
    }
    return ['What\'s on my calendar?', 'Help me plan my day', 'I need to focus more'];
  },

  /**
   * Parse tool call JSON blocks from AI response
   * @param {string} text
   * @returns {Array<{tool:string, params:object}>}
   */
  _parseToolCalls(text) {
    const calls = [];
    const regex = /```json\s*\n?({[\s\S]*?})\n?\s*```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool && typeof parsed.tool === 'string') {
          calls.push(parsed);
        }
      } catch(e) {}
    }
    return calls;
  },

  _enrichForAi(text) {
    const parsed = this._nlpParseCalendarRequest(text, true);
    if (parsed && parsed.time) {
      const autoAdd = localStorage.getItem('blockflow_ai_auto_add') === 'true';
      if (autoAdd) {
        const parts = [`title="${parsed.title}"`, `date="${parsed.date}"`, `time="${parsed.time}"`];
        if (parsed.block) parts.push(`block="${parsed.block}"`);
        return text + `\n\n[Add this event: ${parts.join(', ')}]`;
      }
    }
    return text;
  },

  _nlpParseCalendarRequest(text, liberal) {
    const lower = text.toLowerCase().trim();

    if (lower.includes('?') || /^(what|who|why|how|where|when|can|could|would|should|is|are|do|does|did)/i.test(lower)) return null;

    const hasTime = /(\d{1,2})\s*:?\s*(\d{2})?\s*(o'?\s*clock|am\b|pm\b)?|(at\s+\d{1,2})/i.test(lower);
    const hasDate = /\b(tomorrow|today|tonight|next\s+\w+|this\s+\w+|on\s+\w+)/i.test(lower);
    if (liberal) {
      if (!hasTime && !hasDate) return null;
    } else {
      const triggerPhrases = [/remind\s+(me|us)/i, /set\s+(a\s+)?reminder/i, /schedule\s+/i, /book\s+/i, /i\s+have\s+/i, /add\s+(a\s+)?(calendar\s+)?event/i];
      if (!triggerPhrases.some(p => p.test(lower)) && !(hasTime && hasDate)) return null;
    }

    let date = '';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (/tomorrow/i.test(lower)) {
      date = tomorrow.toISOString().split('T')[0];
    } else if (/next\s+(week|month)/i.test(lower)) {
      const d = new Date(today);
      if (/next\s+week/i.test(lower)) d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      date = d.toISOString().split('T')[0];
    } else if (/next\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(lower)) {
      const dayMap = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
      const m = lower.match(/next\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      const target = dayMap[m[1].toLowerCase()];
      if (target !== undefined) {
        const d = new Date(today);
        let days = target - d.getDay();
        if (days <= 0) days += 7;
        d.setDate(d.getDate() + days);
        date = d.toISOString().split('T')[0];
      }
    } else if (/this\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(lower)) {
      const dayMap = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
      const m = lower.match(/this\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      const target = dayMap[m[1].toLowerCase()];
      if (target !== undefined) {
        const d = new Date(today);
        let days = target - d.getDay();
        if (days < 0) days += 7;
        d.setDate(d.getDate() + days);
        date = d.toISOString().split('T')[0];
      }
    }

    if (!date) {
      date = today.toISOString().split('T')[0];
    }

    let time = '';
    const timeMatch = lower.match(/(\d{1,2})\s*:?\s*(\d{2})?\s*(o'?\s*clock|am\b|pm\b)?/) ||
                      lower.match(/(\d{1,2})\s*(o'?\s*clock|am\b|pm\b)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const suffix = (timeMatch[3] || timeMatch[2 + (timeMatch[2] ? 0 : 1)] || '').toLowerCase().replace(/['\s]/g, '');
      if (suffix === 'pm' && h < 12) h += 12;
      if (suffix === 'am' && h === 12) h = 0;
      time = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    let title = text;
    const removePatterns = [
      /^.*?remind\s+(me|us)\s+(that\s+)?/i,
      /^.*?set\s+(a\s+)?reminder\s+(for\s+|that\s+)?/i,
      /^.*?schedule\s+/i,
      /^.*?book\s+/i,
      /^.*?i\s+have\s+/i,
    ];
    for (const p of removePatterns) {
      const m = title.match(p);
      if (m) {
        title = title.slice(m[0].length).trim();
        break;
      }
    }
    title = title.replace(/tomorrow\s*/i, '').replace(/\d{1,2}\s*:?\s*\d{0,2}\s*(o'?clock|am|pm)?\s*/gi, '').replace(/at\s+/gi, '').replace(/on\s+/gi, '').replace(/by\s+/gi, '').replace(/from\s+/gi, '').trim();
    title = title.replace(/\b(next|this|coming)\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b\s*/gi, '').trim();
    title = title.replace(/\bi\s+have\s+(a\s+|an\s+)?/i, '').trim();
    if (title.length < 2) return null;
    title = title.charAt(0).toUpperCase() + title.slice(1);

    let block = 'focus';
    if (/personal/i.test(lower)) block = 'personal';
    if (/recovery/i.test(lower)) block = 'recovery';

    return { tool: 'addEvent', title, date, time, block };
  },

  /**
   * Execute a single calendar tool call
   * @param {object} toolCall
   * @returns {string} Human-readable result
   */
  _executeCalendarTool(toolCall) {
    const { tool, ...params } = toolCall;
    if (typeof Storage === 'undefined') return 'Calendar storage not available.';

    switch (tool) {
      case 'addEvent': {
        if (!params.title || !params.date) return 'Missing required fields: title, date.';
        const event = Storage.addCalendarEvent({
          title: params.title,
          date: params.date,
          time: params.time || '',
          endTime: params.endTime || '',
          description: params.description || '',
          importance: params.importance || 'medium',
          block: params.block || 'focus'
        });
        return `Added "${event.title}" on ${event.date}${event.time ? ' at ' + event.time : ''}.`;
      }

      case 'deleteEvent': {
        if (!params.id) return 'Missing event id.';
        Storage.deleteCalendarEvent(params.id);
        return `Deleted event ${params.id}.`;
      }

      case 'updateEvent': {
        if (!params.id) return 'Missing event id.';
        const keys = ['title', 'date', 'time', 'endTime', 'description', 'importance', 'block'];
        const updates = {};
        keys.forEach(k => { if (params[k] !== undefined) updates[k] = params[k]; });
        const result = Storage.updateCalendarEvent(params.id, updates);
        if (!result) return `Event ${params.id} not found.`;
        return `Updated "${result.title}".`;
      }

      case 'listEvents': {
        const events = Storage.getCalendarEvents();
        const date = params.date || '';
        const filtered = date ? events.filter(e => e.date === date) : events;
        if (filtered.length === 0) return 'No events found' + (date ? ` on ${date}.` : '.');
        return `Found ${filtered.length} event(s).`;
      }

      default:
        return `Unknown tool: ${tool}.`;
    }
  },

  /**
   * Process tool calls from AI response text
   * @param {string} responseText
   */
  _processToolCalls(responseText) {
    const calls = this._parseToolCalls(responseText);

    if (calls.length === 0) return;

    let hasCalendarOp = false;
    calls.forEach(tc => {
      this._executeCalendarTool(tc);
      if (tc.tool === 'addEvent' || tc.tool === 'deleteEvent' || tc.tool === 'updateEvent') {
        hasCalendarOp = true;
      }
    });

    this._refreshCalendarUI();

    if (hasCalendarOp) {
      this.saveMessageHistory();
      this.close();
      if (localStorage.getItem('blockflow_auto_calendar_nav') !== 'false') {
        this._showCalendarToast('Calendar updated successfully');
        setTimeout(() => { window.location.href = 'calendar.html'; }, 2500);
      }
    }
  },

  _refreshCalendarUI() {
    if (typeof Calendar !== 'undefined' && typeof Calendar.refresh === 'function') {
      Calendar.refresh();
    }
  },

  _showCalendarToast(message) {
    const existing = document.getElementById('aiCalendarToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'aiCalendarToast';
    toast.style.cssText = `
      position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
      z-index: 9999; background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff; padding: 16px 24px; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(102,126,234,0.4);
      font: 14px/1.5 -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: min(480px, calc(100vw - 32px));
      opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease;
      transform: translateX(-50%) translateY(-12px);
      pointer-events: none;
    `;
    toast.innerHTML = '<div style="font-weight:600;margin-bottom:4px">✅ Calendar Updated</div>' + message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-12px)';
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  },

  /**
   * Send user message to AI and handle streaming response
   * @param {string} userText 
   */
  async getAiResponse(userText) {
    this.isProcessing = true;
    this.elements.sendBtn.disabled = true;
    this.showTyping();

    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.removeTyping();
      this.addAiMessage('Please configure your NVIDIA API key in Settings to use the AI assistant.');
      this.isProcessing = false;
      this.elements.sendBtn.disabled = false;
      return;
    }

    const model = this.getModel();
    const systemPrompt = this.getSystemPrompt() + this.getMemoryContext();

    const events = typeof Storage !== 'undefined' ? Storage.getCalendarEvents() : [];
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    const tomorrowEvents = events.filter(e => e.date === tomorrow);
    const upcomingEvents = events
      .filter(e => e.date > tomorrow)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 6);

    let contextStr = `Today (${today}):`;
    if (todayEvents.length > 0) {
      todayEvents.forEach(e => {
        contextStr += `\n- ${e.title}${e.time ? ' at ' + e.time : ''}`;
      });
    } else {
      contextStr += '\n- Nothing scheduled';
    }

    contextStr += `\n\nTomorrow (${tomorrow}):`;
    if (tomorrowEvents.length > 0) {
      tomorrowEvents.forEach(e => {
        contextStr += `\n- ${e.title}${e.time ? ' at ' + e.time : ''}`;
      });
    } else {
      contextStr += '\n- Nothing scheduled';
    }

    if (upcomingEvents.length > 0) {
      contextStr += `\n\nLater this week:`;
      upcomingEvents.forEach(e => {
        contextStr += `\n- ${e.date}: ${e.title}${e.time ? ' at ' + e.time : ''}`;
      });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.messages.slice(-this._maxHistoryMessages),
      { role: 'user', content: `Current calendar:\n${contextStr}\n\n---\n\n${userText}` }
    ];

    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 20000);

      let response;
      try {
        response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 800,
            stream: true
          }),
          signal: controller.signal
        });
      } catch (directError) {
        if (directError.name === 'AbortError') throw directError;
        const proxyUrl = 'http://127.0.0.1:8080/';
        response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 800
          }),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errText = '';
        try { errText = await response.text(); } catch(e) {}
        throw new Error(`API error: ${response.status}${errText ? ' - ' + errText.slice(0, 100) : ''}`);
      }

      this.removeTyping();

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await this.handleStream(response);
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim() || '';
        this.addAiMessage(content);
        this.showDynamicSuggestions(content);
        this._processToolCalls(content);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      this.removeTyping();

      let errorMsg;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Try a simpler question or check your connection.';
      } else {
        errorMsg = 'Sorry, I had trouble connecting. Please check your API key in Settings and try again.';
      }

      const container = this.elements.conversation;
      const div = document.createElement('div');
      div.className = 'ai-msg ai-msg-ai';
      div.style.position = 'relative';
      div.innerHTML = `<p>${errorMsg}</p>`;
      this.addCopyButton(div);

      const retryBtn = document.createElement('button');
      retryBtn.className = 'ai-retry-btn';
      retryBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Retry';
      retryBtn.addEventListener('click', () => {
        div.remove();
        this.getAiResponse(this._lastUserMessage);
      });
      div.appendChild(retryBtn);

      container.appendChild(div);
      this.scrollToBottom();
    }

    this.isProcessing = false;
    this.elements.sendBtn.disabled = false;
    this.elements.input.focus();
  },

  /**
   * Handle streaming response from the API
   * @param {Response} response 
   */
  async handleStream(response) {
    const container = this.elements.conversation;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-msg ai-msg-ai';
    msgDiv.style.position = 'relative';
    msgDiv.textContent = '';
    container.appendChild(msgDiv);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              msgDiv.innerHTML = this.renderMarkdown(fullContent);
              this.scrollToBottom();
            }
          } catch(e) {}
        }
      }
    } catch(e) {
      console.error('Stream error:', e);
    }

    if (buffer) {
      const dataLine = buffer.trim();
      if (dataLine.startsWith('data: ')) {
        const data = dataLine.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) fullContent += delta.content;
          } catch(e) {}
        }
      }
    }

    msgDiv.innerHTML = this.renderMarkdown(fullContent);
    this.addCopyButton(msgDiv);
    this.messages.push({ role: 'assistant', content: fullContent });
    this.saveMessageHistory();
    this.scrollToBottom();
    this.showDynamicSuggestions(fullContent);
    this._processToolCalls(fullContent);
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text 
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('aiBubble')) {
    AIAssistant.init();
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistant;
}

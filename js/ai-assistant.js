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
   * Inject AI assistant CSS into the page if not already present
   */
  injectCSS() {
    if (document.getElementById('ai-assistant-styles')) return;
    var style = document.createElement('style');
    style.id = 'ai-assistant-styles';
    style.textContent = `
/* ─── AI Assistant ─── */
.ai-fab{position:fixed;bottom:28px;right:28px;z-index:2001;width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;cursor:pointer;box-shadow:0 6px 28px rgba(102,126,234,0.4);display:flex;align-items:center;justify-content:center;transition:all .3s ease}
.ai-fab:hover{transform:scale(1.1) rotate(15deg);box-shadow:0 8px 36px rgba(102,126,234,0.5)}
.ai-fab.hidden{transform:scale(0);opacity:0;pointer-events:none}
.ai-overlay{position:fixed;inset:0;z-index:2000;pointer-events:none}
.ai-overlay.open{pointer-events:none}
.ai-container{position:fixed;width:min(680px,calc(100vw - 40px));height:min(85vh,700px);background:#fff;border-radius:24px;box-shadow:0 20px 80px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateZ(0);transition:opacity .2s ease,width .2s ease,height .2s ease,border-radius .2s ease}
.ai-overlay.open .ai-container{opacity:1;pointer-events:all}
.ai-container.snapped-left,.ai-container.snapped-right{width:380px !important;height:100vh !important;max-height:none;border-radius:0;transition:opacity .2s ease,left .25s ease,width .25s ease,height .25s ease,border-radius .25s ease}
.ai-container.snapped-left{left:0 !important;top:0 !important;border-radius:0 20px 20px 0}
.ai-container.snapped-right{right:0 !important;top:0 !important;left:auto !important;border-radius:20px 0 0 20px}
.ai-resize-handle{position:absolute;bottom:0;right:0;z-index:10;cursor:nwse-resize;pointer-events:all;width:32px;height:32px}
.ai-resize-handle::after{content:'';position:absolute;right:5px;bottom:5px;width:14px;height:14px;border-right:2.5px solid #64748b;border-bottom:2.5px solid #64748b;transition:border-color .2s, border-width .2s}
.ai-resize-handle:hover::after{border-color:#667eea;border-width:3px}
.ai-container.snapped-left .ai-resize-handle,.ai-container.snapped-right .ai-resize-handle{display:none}
.ai-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;gap:12px;flex-shrink:0;cursor:grab;user-select:none}
.ai-header:active{cursor:grabbing}
.ai-header-left{display:flex;align-items:center;gap:10px}
.ai-avatar{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.ai-title{font-weight:700;color:#1f2937;font-size:.95rem;white-space:nowrap}
.ai-model-select{padding:6px 28px 6px 12px;border-radius:20px;border:1.5px solid #e5e7eb;background:#f9fafb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 8px center;font-size:.78rem;color:#1f2937;cursor:pointer;appearance:none;-webkit-appearance:none;outline:none;font-family:inherit}
.ai-model-select:focus{border-color:#667eea}
.ai-header-actions{display:flex;align-items:center;gap:4px}
.ai-close-btn{background:none;border:none;font-size:1.5rem;color:#6b7280;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.ai-close-btn:hover{background:#f3f4f6;color:#374151}
.ai-conversation{flex:1;overflow-y:auto;padding:20px;background:#f9fafb;display:flex;flex-direction:column;gap:12px}
.ai-conversation::-webkit-scrollbar{width:6px}
.ai-conversation::-webkit-scrollbar-track{background:transparent}
.ai-conversation::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
.ai-msg{max-width:78%;padding:14px 18px;font-size:.92rem;line-height:1.65;word-wrap:break-word;animation:msgIn .2s ease}
.ai-msg-ai{align-self:flex-start;background:#fff;color:#1f2937;box-shadow:0 1px 3px rgba(0,0,0,.05);border:1px solid #f0eeeb;border-radius:18px 18px 18px 4px;position:relative}
.ai-msg-user{align-self:flex-end;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border-radius:18px 18px 4px 18px}
.ai-typing{align-self:flex-start;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.05);border:1px solid #f0eeeb;border-radius:18px 18px 18px 4px;padding:16px 20px;display:flex;gap:4px;align-items:center}
.ai-typing .dot{width:8px;height:8px;border-radius:50%;background:#9ca3af;animation:dotPulse 1.2s ease-in-out infinite}
.ai-typing .dot:nth-child(2){animation-delay:.2s}
.ai-typing .dot:nth-child(3){animation-delay:.4s}
@keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes thinkingFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.ai-thinking{align-self:flex-start;width:100%;max-width:400px;margin-bottom:8px;border-radius:14px;background:#fff;border:1px solid #f0eeeb;box-shadow:0 1px 4px rgba(0,0,0,.04);overflow:hidden;transition:box-shadow .2s}
.ai-thinking:hover{box-shadow:0 2px 12px rgba(0,0,0,.06)}
.ai-thinking-progress{height:3px;background:#f0eeeb;overflow:hidden;border-radius:0}
.ai-thinking-progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:3px;transition:width .5s cubic-bezier(.34,1.56,.64,1)}
.ai-thinking-header{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none;transition:background .15s;font-size:.85rem;color:#6b7280}
.ai-thinking-header:hover{background:#f9fafb}
.ai-thinking-icon{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;color:#fff}
.ai-thinking-title{flex:1;font-weight:500;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ai-thinking-dots{display:inline-flex;gap:3px;align-items:center;margin-left:2px}
.ai-thinking-dots span{width:4px;height:4px;border-radius:50%;background:#9ca3af;animation:dotPulse .8s ease-in-out infinite}
.ai-thinking-dots span:nth-child(2){animation-delay:.15s}
.ai-thinking-dots span:nth-child(3){animation-delay:.3s}
.ai-thinking-timer{font-size:.72rem;color:#9ca3af;font-variant-numeric:tabular-nums;min-width:32px;text-align:right}
.ai-thinking-arrow{font-size:.6rem;color:#d1d5db;transition:transform .25s cubic-bezier(.34,1.56,.64,1);flex-shrink:0}
.ai-thinking-arrow.open{transform:rotate(180deg)}
.ai-thinking-body{max-height:0;overflow:hidden;transition:max-height .35s cubic-bezier(.4,0,.2,1);will-change:max-height}
.ai-thinking-body.open{max-height:400px}
.ai-thinking-steps{padding:2px 14px 10px}
.ai-thinking-step{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:.82rem;color:#9ca3af;opacity:0;transform:translateY(6px);animation:thinkingFade .3s ease forwards}
.ai-thinking-step:nth-child(1){animation-delay:0s}
.ai-thinking-step:nth-child(2){animation-delay:.1s}
.ai-thinking-step:nth-child(3){animation-delay:.2s}
.ai-thinking-step .status-icon{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;flex-shrink:0;transition:all .3s}
.ai-thinking-step.pending .status-icon{background:#f3f4f6;color:#d1d5db}
.ai-thinking-step.active .status-icon{background:#eff6ff;color:#3b82f6;position:relative}
.ai-thinking-step.active .status-icon::after{content:'';width:8px;height:8px;border:2px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;position:absolute}
.ai-thinking-step.completed .status-icon{background:#ecfdf5;color:#10b981}
.ai-thinking-step .step-label{flex:1;color:inherit;transition:color .2s}
.ai-thinking-step.active .step-label{color:#3b82f6;font-weight:500}
.ai-thinking-step.completed .step-label{color:#374151}
.ai-thinking-step .step-time{font-size:.68rem;color:#d1d5db;font-variant-numeric:tabular-nums;min-width:36px;text-align:right;transition:color .2s}
.ai-thinking-step.completed .step-time{color:#9ca3af}
.ai-thinking-divider{border:none;border-top:1px solid #f3f4f6;margin:2px 0}
.ai-thinking-footer{padding:6px 14px 10px;display:flex;flex-wrap:wrap;gap:4px;border-top:1px solid #f3f4f6;margin-top:2px}
.ai-thinking-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;font-size:.72rem;font-weight:500;line-height:1.3}
.ai-thinking-badge.cal{background:#eff6ff;color:#3b82f6}
.ai-thinking-badge.mem{background:#fef3c7;color:#d97706}
.ai-thinking-badge.ctx{background:#f3f4f6;color:#6b7280}
.ai-thinking-reasoning{margin:4px 14px 10px;padding:8px 12px;background:#fafafa;border-radius:10px;border:1px solid #f3f4f6;font-size:.78rem;line-height:1.6;color:#6b7280;display:none;max-height:150px;overflow-y:auto}
.ai-thinking-reasoning.show{display:block}
.ai-thinking-reasoning em{font-style:italic;color:#9ca3af;font-size:.74rem}
.ai-thinking.error{border-color:#fca5a5 !important;box-shadow:0 0 0 1px #fca5a5}
body.dstyle-dark .ai-thinking{background:#1e293b;border-color:#334155}
body.dstyle-dark .ai-thinking.error{border-color:#ef4444 !important;box-shadow:0 0 0 1px #450a0a}
body.dstyle-dark .ai-thinking:hover{box-shadow:0 2px 12px rgba(0,0,0,.2)}
body.dstyle-dark .ai-thinking-progress{background:#334155}
body.dstyle-dark .ai-thinking-header:hover{background:#1e3347}
body.dstyle-dark .ai-thinking-title{color:#cbd5e1}
body.dstyle-dark .ai-thinking-step.completed .step-label{color:#e2e8f0}
body.dstyle-dark .ai-thinking-step.completed .status-icon{background:#064e3b;color:#34d399}
body.dstyle-dark .ai-thinking-step.active .status-icon{background:#1e3a5f;color:#60a5fa}
body.dstyle-dark .ai-thinking-step.pending .status-icon{background:#1e293b;color:#475569}
body.dstyle-dark .ai-thinking-step.completed .step-time{color:#64748b}
body.dstyle-dark .ai-thinking-footer{border-color:#334155}
body.dstyle-dark .ai-thinking-badge.cal{background:#1e3a5f;color:#60a5fa}
body.dstyle-dark .ai-thinking-badge.mem{background:#422006;color:#fbbf24}
body.dstyle-dark .ai-thinking-badge.ctx{background:#1e293b;color:#94a3b8}
body.dstyle-dark .ai-thinking-reasoning{background:#0f172a;border-color:#1e293b;color:#94a3b8}
body.dstyle-dark .ai-thinking-reasoning em{color:#64748b}
.ai-suggestions{display:flex;gap:8px;padding:12px 20px;border-top:1px solid #e5e7eb;overflow-x:auto;flex-shrink:0}
.ai-suggestions:empty{display:none}
.ai-chip{flex-shrink:0;padding:7px 16px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;font-size:.78rem;color:#6b7280;cursor:pointer;white-space:nowrap;transition:all .2s;font-weight:500;font-family:inherit}
.ai-chip:hover{border-color:#667eea;color:#667eea}
.ai-input-wrap{padding:0 20px 16px;flex-shrink:0}
.ai-input-area{display:flex;align-items:flex-end;gap:8px;border:2px solid #e5e7eb;border-radius:16px;padding:4px 4px 4px 16px;transition:all .2s}
.ai-input-area:focus-within{border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.12)}
.ai-input{border:none;outline:none;resize:none;flex:1;font-size:.92rem;font-family:inherit;color:#1f2937;padding:10px 0;min-height:24px;max-height:120px;background:transparent;line-height:1.5}
.ai-input::placeholder{color:#9ca3af}
.ai-voice-btn{width:40px;height:40px;border-radius:50%;border:none;background:#f3f4f6;color:#6b7280;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.ai-voice-btn:hover{background:#e5e7eb;color:#374151}
.ai-voice-btn.listening{background:#fee2e2;color:#ef4444;animation:pulse 1s infinite}
.ai-attach-btn{width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:#9ca3af;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.ai-attach-btn:hover{background:#f3f4f6;color:#6b7280}
.ai-drag-overlay{display:none;position:absolute;inset:0;z-index:10;background:rgba(102,126,234,.08);border-radius:20px;border:3px dashed #667eea;align-items:center;justify-content:center;pointer-events:none}
.ai-drag-overlay.show{display:flex}
.ai-drag-overlay span{background:#fff;padding:12px 24px;border-radius:12px;color:#667eea;font-weight:600;font-size:.95rem;box-shadow:0 4px 16px rgba(102,126,234,.2)}
.ai-file-preview{display:flex;flex-wrap:wrap;gap:6px;padding:6px 16px 2px}
.ai-file-tag{display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;border-radius:8px;padding:3px 10px;font-size:.78rem;color:#374151;max-width:200px}
.ai-file-tag .name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ai-file-tag .remove{cursor:pointer;color:#9ca3af;font-weight:bold;font-size:.9rem;line-height:1;padding:0 2px}
.ai-file-tag .remove:hover{color:#ef4444}
.ai-memory-btn{width:32px;height:32px;border-radius:8px;border:none;background:transparent;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;color:#6b7280}
.ai-memory-btn:hover{background:#f3f4f6}
.ai-memory-modal{display:none;position:absolute;bottom:140px;left:12px;right:12px;z-index:20}
.ai-memory-modal.open{display:block}
.ai-memory-modal-content{background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid #e5e7eb;overflow:hidden}
.ai-memory-modal-header{display:flex;align-items:center;gap:8px;padding:14px 16px 8px}
.ai-memory-list{max-height:200px;overflow-y:auto;padding:4px 12px}
.memory-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;margin-bottom:4px;background:#f9fafb;font-size:.85rem;color:#374151}
.memory-item:hover{background:#f3f4f6}
.memory-delete{background:none;border:none;color:#d1d5db;cursor:pointer;font-size:1.1rem;padding:0 4px;line-height:1}
.memory-delete:hover{color:#ef4444}
.ai-memory-input-row{display:flex;gap:8px;padding:8px 12px 12px;border-top:1px solid #f3f4f6}
.ai-memory-input-row input{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-size:.85rem;outline:none;font-family:inherit}
.ai-memory-input-row input:focus{border-color:#667eea}
.ai-memory-input-row button{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:.85rem;cursor:pointer;font-weight:600;white-space:nowrap}
.ai-memory-input-row button:hover{opacity:.9}
.ai-send-btn{width:40px;height:40px;border-radius:12px;border:none;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.ai-send-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(102,126,234,.3)}
.ai-send-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
.ai-disclaimer{text-align:center;font-size:.7rem;color:#d1d5db;margin:8px 0 0}
.ai-msg-ai code{background:#f1f3f5;padding:2px 6px;border-radius:4px;font-size:.85em;font-family:'SF Mono','Fira Code','Consolas',monospace;color:#e03131}
.ai-msg-ai pre{background:#1e293b;color:#e2e8f0;padding:14px 16px;border-radius:12px;overflow-x:auto;margin:8px 0;font-size:.85rem;line-height:1.5}
.ai-msg-ai pre code{background:none;padding:0;color:inherit;font-size:inherit}
.ai-msg-ai strong{font-weight:700}
.ai-msg-ai em{font-style:italic}
.ai-msg-ai ul,.ai-msg-ai ol{margin:6px 0;padding-left:20px}
.ai-msg-ai li{margin-bottom:4px}
.ai-msg-ai a{color:#667eea;text-decoration:underline}
.ai-msg-ai a:hover{color:#764ba2}
.ai-msg-ai h1,.ai-msg-ai h2,.ai-msg-ai h3,.ai-msg-ai h4{margin:10px 0 6px;font-weight:700;line-height:1.3}
.ai-msg-ai h1{font-size:1.2rem}
.ai-msg-ai h2{font-size:1.1rem}
.ai-msg-ai h3{font-size:1rem}
.ai-msg-ai p{margin-bottom:6px}
.ai-msg-ai p:last-child{margin-bottom:0}
.ai-msg-ai blockquote{border-left:3px solid #d1d5db;padding-left:12px;margin:8px 0;color:#6b7280}
.ai-msg-ai table{border-collapse:collapse;margin:8px 0;font-size:.85rem;width:100%}
.ai-msg-ai th,.ai-msg-ai td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}
.ai-msg-ai th{background:#f9fafb;font-weight:600}
.ai-msg-ai hr{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
.ai-copy-btn{position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:6px;border:none;background:rgba(255,255,255,.9);color:#6b7280;font-size:.75rem;cursor:pointer;opacity:0;transition:all .15s ease;display:flex;align-items:center;justify-content:center;z-index:2}
.ai-msg-ai:hover .ai-copy-btn{opacity:1}
.ai-copy-btn:hover{background:#f3f4f6;color:#374151}
.ai-copy-btn.copied{color:#10b981}
.ai-retry-btn{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 16px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-size:.8rem;cursor:pointer;transition:all .2s;font-weight:500;font-family:inherit}
.ai-retry-btn:hover{border-color:#667eea;color:#667eea;background:#f9f9ff}
.ai-suggestions-dynamic{display:flex;gap:8px;padding:6px 20px 4px;flex-wrap:wrap;flex-shrink:0}
.ai-suggestions-dynamic:empty{display:none}
.ai-suggestions-dynamic .ai-chip{font-size:.74rem;padding:5px 12px}
body.dstyle-dark .ai-msg-ai code{background:#334155;color:#f87171}
body.dstyle-dark .ai-msg-ai pre{background:#0f172a}
body.dstyle-dark .ai-copy-btn{background:rgba(30,41,59,.9);color:#94a3b8}
body.dstyle-dark .ai-copy-btn:hover{background:#334155;color:#e2e8f0}
body.dstyle-dark .ai-retry-btn{background:#1e293b;border-color:#334155;color:#94a3b8}
body.dstyle-dark .ai-retry-btn:hover{border-color:#3b82f6;color:#3b82f6}
body.dstyle-dark .ai-msg-ai blockquote{border-color:#475569;color:#94a3b8}
body.dstyle-dark .ai-file-tag{background:#1e293b;color:#cbd5e1}
body.dstyle-dark .ai-attach-btn{color:#64748b}
body.dstyle-dark .ai-attach-btn:hover{background:#1e293b;color:#94a3b8}
body.dstyle-dark .ai-memory-btn{color:#64748b}
body.dstyle-dark .ai-memory-btn:hover{background:#1e293b}
body.dstyle-dark .ai-memory-modal-content{background:#1e293b;border-color:#334155}
body.dstyle-dark .ai-memory-modal-header strong{color:#e2e8f0}
body.dstyle-dark .memory-item{background:#0f172a;color:#cbd5e1}
body.dstyle-dark .memory-item:hover{background:#1e293b}
body.dstyle-dark .ai-memory-input-row{border-color:#1e293b}
body.dstyle-dark .ai-memory-input-row input{background:#0f172a;border-color:#334155;color:#e2e8f0}
body.dstyle-warm .ai-msg-ai code{background:#efe6dc;color:#bc6c25}
body.dstyle-warm .ai-file-tag{background:#f5efe6}
body.dstyle-warm .ai-attach-btn:hover{background:#f5efe6}
body.dstyle-warm .ai-memory-btn:hover{background:#f5efe6}
body.dstyle-warm .ai-copy-btn{background:rgba(250,246,240,.9)}
body.dstyle-warm .ai-copy-btn:hover{background:#f5efe6}
@media(max-width:640px){.ai-overlay{background:rgba(0,0,0,.3);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:flex-end;opacity:0;transition:opacity .25s ease}.ai-overlay.open{opacity:1}.ai-container{position:relative;width:100%;height:90vh;border-radius:20px 20px 0 0;opacity:1;pointer-events:all;transform:translateY(100%);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}.ai-overlay.open .ai-container{transform:translateY(0)}.ai-header{padding:14px 16px;cursor:default;user-select:auto}.ai-header:active{cursor:default}.ai-conversation{padding:16px}.ai-input-wrap{padding:0 16px 12px}.ai-suggestions{padding:10px 16px}}
.ai-calendar-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px;margin-top:8px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.ai-calendar-card .cal-month{font-size:.85rem;font-weight:700;color:#1f2937;margin-bottom:10px;text-align:center}
.ai-calendar-card .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.ai-calendar-card .cal-dow{font-size:.65rem;font-weight:600;color:#9ca3af;padding:4px 0;text-transform:uppercase}
.ai-calendar-card .cal-day{font-size:.78rem;color:#374151;padding:4px 0;border-radius:8px;line-height:1}
.ai-calendar-card .cal-day.highlight{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(102,126,234,.4)}
.ai-calendar-card .cal-day.other{color:#d1d5db}
.ai-calendar-card .cal-event{font-size:.75rem;color:#6b7280;margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6;text-align:center}
`;
    document.head.appendChild(style);
  },

  buildOverlay() {
    if (document.getElementById('aiOverlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'ai-overlay';
    overlay.id = 'aiOverlay';

    var container = document.createElement('div');
    container.className = 'ai-container';

    var header = document.createElement('div');
    header.className = 'ai-header';
    header.innerHTML =
      '<div class="ai-header-left"><div class="ai-avatar">🤖</div><span class="ai-title">BlockFlow Assistant</span></div>' +
      '<div class="ai-header-center"><select class="ai-model-select" id="aiModelSelect"></select></div>' +
      '<div class="ai-header-actions"><button class="ai-memory-btn" id="aiMemoryBtn" aria-label="Memory">🧠</button><button class="ai-close-btn" id="aiClose" aria-label="Close">x</button></div>';
    container.appendChild(header);

    var conversation = document.createElement('div');
    conversation.className = 'ai-conversation';
    conversation.id = 'aiMessages';
    conversation.setAttribute('aria-live', 'polite');
    conversation.setAttribute('aria-label', 'Chat messages');
    container.appendChild(conversation);

    var dragOverlay = document.createElement('div');
    dragOverlay.className = 'ai-drag-overlay';
    dragOverlay.id = 'aiDragOverlay';
    dragOverlay.innerHTML = '<span>📄 Drop files here</span>';
    container.appendChild(dragOverlay);

    var memoryModal = document.createElement('div');
    var memoryModal = document.createElement('div');
    memoryModal.className = 'ai-memory-modal';
    memoryModal.id = 'aiMemoryModal';
    memoryModal.innerHTML =
      '<div class="ai-memory-modal-content">' +
      '<div class="ai-memory-modal-header"><strong>🧠 Memory</strong><span style="font-size:0.78rem;color:#9ca3af;flex:1">Things I remember about you</span><button id="aiMemoryClose" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:1.2rem;line-height:1;padding:0 4px">x</button></div>' +
      '<div class="ai-memory-list" id="aiMemoryList"></div>' +
      '<div class="ai-memory-input-row"><input type="text" id="aiMemoryInput" placeholder="Add a note about yourself..." autocomplete="off"><button id="aiMemoryAddBtn">Save</button></div>' +
      '</div>';
    container.appendChild(memoryModal);

    var suggestions = document.createElement('div');
    suggestions.className = 'ai-suggestions';
    suggestions.id = 'aiSuggestions';
    suggestions.innerHTML =
      '<button class="ai-chip" data-prompt="I have too much on my plate today. Clear my afternoon">Clear my afternoon</button>' +
      '<button class="ai-chip" data-prompt="Reschedule anything in Focus block that slipped yesterday to tomorrow morning">Reschedule slipped focus</button>' +
      '<button class="ai-chip" data-prompt="What does my week look like? Find two windows for deep work">Find deep work windows</button>';
    container.appendChild(suggestions);

    var inputWrap = document.createElement('div');
    inputWrap.className = 'ai-input-wrap';

    var inputArea = document.createElement('div');
    inputArea.className = 'ai-input-area';
    inputArea.innerHTML =
      '<textarea class="ai-input" id="aiInput" rows="1" placeholder="Ask me anything..." autocomplete="off"></textarea>' +
      '<button class="ai-attach-btn" id="aiAttachBtn" aria-label="Attach file">📎</button>' +
      '<input type="file" id="aiFileInput" multiple accept=".txt,.md,.csv,.json,.xml,.html,.js,.py,.css,.yaml,.yml,.log,.ini,.cfg,.env" style="display:none">' +
      '<button class="ai-voice-btn" id="aiVoiceBtn" aria-label="Voice input">🎤</button>' +
      '<button class="ai-send-btn" id="aiSend" aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>';
    inputWrap.appendChild(inputArea);

    var disclaimer = document.createElement('p');
    disclaimer.className = 'ai-disclaimer';
    disclaimer.textContent = 'BlockFlow Assistant may produce inaccurate information.';
    inputWrap.appendChild(disclaimer);

    container.appendChild(inputWrap);

    var resizeHandle = document.createElement('div');
    resizeHandle.className = 'ai-resize-handle';
    container.appendChild(resizeHandle);

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  },

  /**
   * Initialize the AI Assistant
   */
  init() {
    this._hasApiKey = !!this.getApiKey();
    this._lazyLoaded = false;
    // Create just the tiny FAB button eagerly; defer the heavy DOM/CSS
    this._createFab();
    var fab = document.getElementById('aiBubble');
    if (!fab) return;
    fab.addEventListener('click', function(e) {
      AIAssistant._ensureLazyLoaded();
      AIAssistant.open();
    });
  },

  _createFab() {
    if (document.getElementById('aiBubble')) return;
    var fab = document.createElement('button');
    fab.className = 'ai-fab';
    fab.id = 'aiBubble';
    fab.setAttribute('aria-label', 'Open AI Assistant');
    fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7L3 9h7z"/></svg>';
    document.body.appendChild(fab);
  },

  _ensureLazyLoaded() {
    if (this._lazyLoaded) return;
    this._lazyLoaded = true;
    this.injectCSS();
    this.buildOverlay();
    this.cacheElements();
    this.syncModelSelect();
    this.setupEventListeners();
    this.initDrag();
    this.initResize();
    this.loadSystemPrompt();
    this.loadMemoryPoints();
    this.loadMessageHistory();
    this.addGreeting();
    this._attachedFiles = [];
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
      memoryClose: document.getElementById('aiMemoryClose'),
      attachBtn: document.getElementById('aiAttachBtn'),
      fileInput: document.getElementById('aiFileInput'),
      container: document.querySelector('.ai-container'),
      dragOverlay: document.getElementById('aiDragOverlay')
    };
  },

  syncModelSelect() {
    if (!this.elements.modelSelect || typeof NvidiaConfig === 'undefined') return;
    const savedModel = localStorage.getItem(this._storageKeys.model);
    const selectedModel = NvidiaConfig.populateModelSelect(this.elements.modelSelect, savedModel);
    localStorage.setItem(this._storageKeys.model, selectedModel);
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
      this.syncModelSelect();
      this.elements.modelSelect.addEventListener('change', () => {
        const nextModel = typeof NvidiaConfig !== 'undefined'
          ? NvidiaConfig.normalizeModelId(this.elements.modelSelect.value)
          : this.elements.modelSelect.value.toLowerCase();
        localStorage.setItem(this._storageKeys.model, nextModel);
      });
    }

    this.elements.chips.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this._hasApiKey) {
          this.open();
          return;
        }
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

    if (this.elements.attachBtn) {
      this.elements.attachBtn.addEventListener('click', () => {
        this.elements.fileInput.click();
      });
    }
    if (this.elements.fileInput) {
      this.elements.fileInput.addEventListener('change', (e) => {
        this._handleFiles(e.target.files);
        e.target.value = '';
      });
    }
    if (this.elements.container) {
      this.elements.container.addEventListener('dragenter', (e) => { e.preventDefault(); this.elements.dragOverlay?.classList.add('show'); });
      this.elements.container.addEventListener('dragover', (e) => { e.preventDefault(); });
      this.elements.container.addEventListener('dragleave', (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) this.elements.dragOverlay?.classList.remove('show');
      });
      this.elements.container.addEventListener('drop', (e) => {
        e.preventDefault();
        this.elements.dragOverlay?.classList.remove('show');
        this._handleFiles(e.dataTransfer.files);
      });
    }

    document.addEventListener('keydown', (e) => {
      // Ctrl+K / Cmd+K to toggle AI assistant
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      }
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
      try { this._recognition.stop(); } catch (e) { /* silent */ }
      this._recognition = null;
    }
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    if (this.isOpen) return;
    this._ensureLazyLoaded();
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
    try { localStorage.setItem(this._storageKeys.position, JSON.stringify(pos)); } catch (e) { /* silent */ }
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

    this._dragMoveHandler = (e) => this._onDragMove(e);
    this._dragEndHandler = () => this._onDragEnd();

    header.addEventListener('mousedown', (e) => this._onDragStart(e));

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

    document.addEventListener('mousemove', this._dragMoveHandler);
    document.addEventListener('mouseup', this._dragEndHandler);
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
    document.removeEventListener('mousemove', this._dragMoveHandler);
    document.removeEventListener('mouseup', this._dragEndHandler);
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
    if (!this._hasApiKey) {
      this.addAiMessage('👋 Hey! I need an <strong>NVIDIA API key</strong> to work — you can set one up in <button class="ai-chip" onclick="window.location.href=\'settings.html\'" style="padding:2px 10px;font-size:inherit;vertical-align:baseline">Settings</button> anytime.', true);
      if (this.elements.suggestions) {
        this.elements.suggestions.style.display = 'none';
      }
      return;
    }
    const now = new Date();
    const hour = now.getHours();
    const timeGreeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    const events = typeof Storage === 'object' ? Storage.getCalendarEvents() : [];
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const tomorrowEvents = events.filter(e => e.date === tomorrow);

    let greeting;
    if (this.memoryPoints.length > 0) {
      const m = this.memoryPoints[0];
      greeting = `Hey! How's "${m.content.slice(0, 40)}" going?`;
    } else {
      const greetings = ['Hey!', 'Hi there!', "What's happening?"];
      greeting = greetings[Math.floor(Math.random() * greetings.length)];
    }

    let contextMsg = '';
    if (todayEvents.length > 0) {
      const first = todayEvents[0];
      const label = first.title || first.task || 'something';
      contextMsg = ` Good ${timeGreeting}, by the way. You've got ${todayEvents.length} thing${todayEvents.length > 1 ? 's' : ''} on today${first.time ? ' — starting with ' + label + ' at ' + first.time : '.'}`;
    } else if (tomorrowEvents.length > 0) {
      contextMsg = ` Good ${timeGreeting}. You have ${tomorrowEvents.length} thing${tomorrowEvents.length > 1 ? 's' : ''} coming up tomorrow if you want to prep.`;
    }

    this.addAiMessage(greeting + contextMsg, true);
  },

  /**
   * Load conversation history from localStorage
   */
  loadMessageHistory() {
    try {
      const raw = localStorage.getItem(this._storageKeys.history);
      if (!raw) return;
      // Check if the stored data is too large and trim it
      if (raw.length > 500000) {
        const parsed = JSON.parse(raw);
        const trimmed = parsed.slice(-50); // keep last 50 messages
        this.messages = trimmed;
        localStorage.setItem(this._storageKeys.history, JSON.stringify(trimmed));
      } else {
        const parsed = JSON.parse(raw);
        const stalePhrases = ['configure your NVIDIA API key', 'No API key configured'];
        this.messages = parsed.filter(msg => {
          if (msg.role === 'assistant' && typeof msg.content === 'string') {
            return !stalePhrases.some(p => msg.content.includes(p));
          }
          return true;
        });
      }
      // Render saved messages to DOM (no re-saving — they're already stored)
      const container = this.elements.conversation;
      this.messages.forEach(msg => {
        const div = document.createElement('div');
        if (msg.role === 'user') {
          div.className = 'ai-msg ai-msg-user';
          div.textContent = msg.content;
        } else {
          div.className = 'ai-msg ai-msg-ai';
          div.style.position = 'relative';
          div.innerHTML = this.renderMarkdown(msg.content);
          this.addCopyButton(div);
        }
        container.appendChild(div);
      });
      this.scrollToBottom();
    } catch (e) { /* silent */ }
  },

  /**
   * Save conversation history to localStorage
   */
  saveMessageHistory() {
    try {
      localStorage.setItem(this._storageKeys.history, JSON.stringify(this.messages));
    } catch (e) { /* silent */ }
  },

  sendMessage() {
    const text = this.elements.input.value.trim();
    if (!text || this.isProcessing) return;
    if (!this._hasApiKey) {
      this.elements.input.value = '';
      this.elements.input.style.height = 'auto';
      this.addAiMessage('Need an API key first — head to <button class="ai-chip" onclick="window.location.href=\'settings.html\'" style="padding:2px 10px;font-size:inherit;vertical-align:baseline">Settings</button> to set one up.', true);
      return;
    }
    this.elements.input.value = '';
    this.elements.input.style.height = 'auto';

    this._lastUserMessage = text;
    let fullText = text;

    const attachCtx = this._getAttachmentsContext();
    if (attachCtx) {
      fullText += attachCtx;
      this._attachedFiles = [];
      this._renderFileTags();
    }

    this.addUserMessage(text);
    const enriched = this._enrichForAi(fullText);
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
      // Strip tool call JSON blocks before saving to history
      const cleanText = this._stripToolCalls(text);
      if (cleanText) {
        this.messages.push({ role: 'assistant', content: cleanText });
        this.saveMessageHistory();
      }
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

  _thinkingSteps: [
    { id: 'analyze', label: 'Analyzing your request', delay: 600 },
    { id: 'connect', label: 'Sending request', delay: 999999 },
    { id: 'respond', label: 'Waiting for response', delay: 0 }
  ],
  _currentThinkingStep: -1,
  _thinkingEl: null,
  _thinkingBodyEl: null,
  _thinkingProgressEl: null,
  _thinkingTimer: null,
  _thinkingStartTime: null,
  _thinkingTimerInterval: null,
  _stepTimes: [],

  showThinking() {
    const existing = document.getElementById('aiThinkingIndicator');
    if (existing) existing.remove();

    const container = this.elements.conversation;

    const events = typeof Storage === 'object' ? Storage.getCalendarEvents() : [];
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    const hasMemory = this.memoryPoints && this.memoryPoints.length > 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'ai-thinking';
    wrapper.id = 'aiThinkingIndicator';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'ai-thinking-progress';
    progressWrap.innerHTML = '<div class="ai-thinking-progress-bar" id="aiThinkingProgress"></div>';
    wrapper.appendChild(progressWrap);
    this._thinkingProgressEl = progressWrap.querySelector('.ai-thinking-progress-bar');

    const header = document.createElement('div');
    header.className = 'ai-thinking-header';
    header.id = 'aiThinkingHeader';
    header.innerHTML =
      '<div class="ai-thinking-icon">🧠</div>' +
      '<span class="ai-thinking-title" id="aiThinkingTitle">Thinking</span>' +
      '<span class="ai-thinking-dots"><span></span><span></span><span></span></span>' +
      '<span class="ai-thinking-timer" id="aiThinkingTimer"></span>' +
      '<span class="ai-thinking-arrow" id="aiThinkingArrow">▼</span>';
    wrapper.appendChild(header);

    const body = document.createElement('div');
    body.className = 'ai-thinking-body';
    body.id = 'aiThinkingBody';

    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'ai-thinking-steps';
    this._thinkingSteps.forEach((step, i) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'ai-thinking-step pending';
      stepEl.id = 'aiThinkingStep_' + step.id;
      stepEl.innerHTML =
        '<span class="status-icon">○</span>' +
        '<span class="step-label">' + step.label + '</span>' +
        '<span class="step-time" id="aiThinkingTime_' + step.id + '"></span>';
      stepsWrap.appendChild(stepEl);
      if (i < this._thinkingSteps.length - 1) {
        const divider = document.createElement('hr');
        divider.className = 'ai-thinking-divider';
        stepsWrap.appendChild(divider);
      }
    });
    body.appendChild(stepsWrap);

    const footer = document.createElement('div');
    footer.className = 'ai-thinking-footer';
    footer.id = 'aiThinkingFooter';
    if (todayEvents.length > 0) {
      footer.innerHTML += '<span class="ai-thinking-badge cal">📅 ' + todayEvents.length + ' today</span>';
    }
    if (hasMemory) {
      footer.innerHTML += '<span class="ai-thinking-badge mem">🧠 ' + this.memoryPoints.length + ' memories</span>';
    }
    footer.innerHTML += '<span class="ai-thinking-badge ctx">⚡ ' + this.getModel().split('/').pop() + '</span>';
    body.appendChild(footer);

    const reasoning = document.createElement('div');
    reasoning.className = 'ai-thinking-reasoning';
    reasoning.id = 'aiThinkingReasoning';
    reasoning.innerHTML = '<em>Waiting for response...</em>';
    body.appendChild(reasoning);

    wrapper.appendChild(body);
    container.appendChild(wrapper);

    header.addEventListener('click', () => {
      const isOpen = body.classList.toggle('open');
      document.getElementById('aiThinkingArrow').classList.toggle('open', isOpen);
    });

    this._thinkingEl = wrapper;
    this._thinkingBodyEl = body;
    this._currentThinkingStep = -1;
    this._stepTimes = [];
    this._thinkingStartTime = Date.now();

    this._thinkingTimerInterval = setInterval(() => {
      if (!this._thinkingEl) { clearInterval(this._thinkingTimerInterval); return; }
      const elapsed = Math.floor((Date.now() - this._thinkingStartTime) / 1000);
      const timerEl = document.getElementById('aiThinkingTimer');
      if (timerEl) {
        timerEl.textContent = (elapsed < 60)
          ? elapsed + 's'
          : Math.floor(elapsed / 60) + 'm ' + (elapsed % 60) + 's';
      }
    }, 200);

    body.classList.add('open');
    document.getElementById('aiThinkingArrow').classList.add('open');
    this.scrollToBottom();
    this._advanceThinking();
  },

  _advanceThinking() {
    if (!this._thinkingEl) return;
    const nextIdx = this._currentThinkingStep + 1;
    if (nextIdx >= this._thinkingSteps.length) return;

    if (this._currentThinkingStep >= 0) {
      const prevTime = Date.now() - (this._stepTimes[this._currentThinkingStep]?.start || Date.now());
      this._stepTimes[this._currentThinkingStep].elapsed = prevTime;
      const prevStep = document.getElementById('aiThinkingStep_' + this._thinkingSteps[this._currentThinkingStep].id);
      if (prevStep) {
        prevStep.className = 'ai-thinking-step completed';
        prevStep.querySelector('.status-icon').textContent = '✓';
        const timeEl = prevStep.querySelector('.step-time');
        if (timeEl) timeEl.textContent = (prevTime < 1000) ? prevTime + 'ms' : (prevTime / 1000).toFixed(1) + 's';
      }
    }

    if (this._thinkingProgressEl) {
      const pct = ((nextIdx) / this._thinkingSteps.length) * 100;
      this._thinkingProgressEl.style.width = pct + '%';
    }

    this._currentThinkingStep = nextIdx;
    const step = this._thinkingSteps[nextIdx];
    this._stepTimes[nextIdx] = { start: Date.now(), elapsed: 0 };

    const stepEl = document.getElementById('aiThinkingStep_' + step.id);
    if (stepEl) {
      stepEl.className = 'ai-thinking-step active';
      stepEl.querySelector('.status-icon').textContent = '';
    }

    const titleEl = document.getElementById('aiThinkingTitle');
    if (titleEl) titleEl.textContent = step.label + '...';

    if (nextIdx < this._thinkingSteps.length - 1) {
      this._thinkingTimer = setTimeout(() => this._advanceThinking(), step.delay || 1000);
    }
  },

  completeThinking() {
    if (!this._thinkingEl) return;
    clearTimeout(this._thinkingTimer);
    clearInterval(this._thinkingTimerInterval);

    const totalTime = Date.now() - this._thinkingStartTime;

    for (let i = this._currentThinkingStep; i < this._thinkingSteps.length; i++) {
      const step = this._thinkingSteps[i];
      const stepEl = document.getElementById('aiThinkingStep_' + step.id);
      if (stepEl) {
        stepEl.className = 'ai-thinking-step completed';
        stepEl.querySelector('.status-icon').textContent = '✓';
      }
    if (this._stepTimes[i]) {
        this._stepTimes[i].elapsed = Date.now() - this._stepTimes[i].start;
        const timeEl = document.getElementById('aiThinkingTime_' + step.id);
        if (timeEl) {
          const elapsed = this._stepTimes[i].elapsed;
          timeEl.textContent = (elapsed < 1000) ? elapsed + 'ms' : (elapsed / 1000).toFixed(1) + 's';
        }
      }
    }

    if (this._thinkingProgressEl) {
      this._thinkingProgressEl.style.width = '100%';
    }

    const header = this._thinkingEl.querySelector('.ai-thinking-header');
    const body = this._thinkingBodyEl;

    const dots = header?.querySelector('.ai-thinking-dots');
    if (dots) dots.remove();

    if (header) {
      const titleEl = document.getElementById('aiThinkingTitle');
      if (titleEl) {
        const totalSecs = (totalTime / 1000).toFixed(1);
        titleEl.textContent = 'Thought process (' + this._thinkingSteps.length + ' steps, ' + totalSecs + 's)';
      }
    }

    const timerEl = document.getElementById('aiThinkingTimer');
    if (timerEl) timerEl.textContent = '';

    setTimeout(() => {
      if (body && body.classList.contains('open')) {
        body.classList.remove('open');
        const arrow = document.getElementById('aiThinkingArrow');
        if (arrow) arrow.classList.remove('open');
      }
    }, 1200);

    if (header && body) {
      header.onclick = () => {
        const isOpen = body.classList.toggle('open');
        const arrow = document.getElementById('aiThinkingArrow');
        if (arrow) arrow.classList.toggle('open', isOpen);
      };
    }
  },

  updateReasoning(content) {
    const reasoningEl = document.getElementById('aiThinkingReasoning');
    if (!reasoningEl) return;
    reasoningEl.classList.add('show');
    const clean = content.replace(/```/g, '`').slice(0, 300);
    reasoningEl.innerHTML = '<strong style="font-size:.78rem;color:#9ca3af;display:block;margin-bottom:4px">⚡ Generating...</strong>' + this.escapeHtml(clean) + (content.length > 300 ? '<em>…</em>' : '');
    this.scrollToBottom();
  },

  removeThinking() {
    clearTimeout(this._thinkingTimer);
    clearInterval(this._thinkingTimerInterval);
    const el = document.getElementById('aiThinkingIndicator');
    if (el) {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-4px)';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }
    this._thinkingEl = null;
    this._thinkingBodyEl = null;
    this._thinkingProgressEl = null;
    this._currentThinkingStep = -1;
    this._stepTimes = [];
  },

  _updateThinkingStepLabel(label) {
    if (!this._thinkingEl) return;
    const step = this._thinkingSteps[this._currentThinkingStep];
    if (step) {
      const stepEl = document.getElementById('aiThinkingStep_' + step.id);
      if (stepEl) {
        const labelEl = stepEl.querySelector('.step-label');
        if (labelEl) labelEl.textContent = label;
      }
    }
    const titleEl = document.getElementById('aiThinkingTitle');
    if (titleEl) titleEl.textContent = label;
  },

  _failThinking(errorMsg) {
    if (!this._thinkingEl) return;
    clearTimeout(this._thinkingTimer);
    clearInterval(this._thinkingTimerInterval);

    const currentStep = this._thinkingSteps[this._currentThinkingStep];
    if (currentStep) {
      const stepEl = document.getElementById('aiThinkingStep_' + currentStep.id);
      if (stepEl) {
        stepEl.className = 'ai-thinking-step completed';
        stepEl.querySelector('.status-icon').textContent = '⚠';
        const timeEl = stepEl.querySelector('.step-time');
        if (timeEl) {
          const elapsed = Date.now() - (this._stepTimes[this._currentThinkingStep]?.start || Date.now());
          timeEl.textContent = (elapsed < 1000) ? elapsed + 'ms' : (elapsed / 1000).toFixed(1) + 's';
        }
      }
    }

    for (let i = this._currentThinkingStep + 1; i < this._thinkingSteps.length; i++) {
      const step = this._thinkingSteps[i];
      const stepEl = document.getElementById('aiThinkingStep_' + step.id);
      if (stepEl) {
        stepEl.className = 'ai-thinking-step completed';
        stepEl.querySelector('.status-icon').textContent = '—';
        stepEl.style.color = '#9ca3af';
      }
    }

    if (this._thinkingProgressEl) {
      this._thinkingProgressEl.style.width = '100%';
      this._thinkingProgressEl.style.background = 'linear-gradient(90deg,#dc2626,#ef4444)';
    }

    const dots = this._thinkingEl.querySelector('.ai-thinking-dots');
    if (dots) dots.remove();

    const titleEl = document.getElementById('aiThinkingTitle');
    if (titleEl) titleEl.textContent = '⚠ Connection failed';

    const timerEl = document.getElementById('aiThinkingTimer');
    if (timerEl) timerEl.textContent = '';

    const reasoning = document.getElementById('aiThinkingReasoning');
    if (reasoning) {
      reasoning.classList.add('show');
      reasoning.innerHTML = '<strong style="color:#dc2626;font-size:.78rem;display:block;margin-bottom:4px">⚠ Where it failed</strong><code style="font-size:.78rem;color:#6b7280;display:block;margin-bottom:6px;line-height:1.5;white-space:pre-wrap">' + this.escapeHtml(errorMsg) + '</code>';

      const steps = [
        { label: '1. Shared proxy endpoint', status: this._proxyError ? '❌ Failed' : '✓' },
        { label: '2. Local proxy / hosted rewrite', status: '❌ ' + (this._proxyError || 'Failed') },
        { label: '3. NVIDIA upstream', status: '❌ No response' }
      ];
      reasoning.innerHTML += '<div style="margin-top:8px;padding:6px 8px;background:#fef2f2;border-radius:6px;font-size:.75rem;line-height:1.7">' +
        steps.map(s => '<div style="display:flex;justify-content:space-between;gap:8px"><span>' + s.label + '</span><span style="color:#dc2626;flex-shrink:0">' + s.status + '</span></div>').join('') +
        '</div>';
    }

    this._thinkingEl.classList.add('error');
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
    return `You are BlockFlow, a productivity calendar assistant.

Your only job: help the user manage their schedule. You can chat normally and use tools for calendar actions.

================================================================
RULE 1: NORMAL CONVERSATION — NO TOOLS

When the user says hello, asks a question, or has a casual conversation, respond with plain text only.

NEVER output JSON during normal conversation.

================================================================
RULE 2: CALENDAR ACTIONS — USE TOOLS

Only use a tool when the user EXPLICITLY asks to:
- add, create, or schedule an event
- delete or remove an event
- edit, update, or change an event
- move or reschedule an event
- list or show calendar events
- change focus, personal, or recovery block duration

When using a tool, respond with a short confirmation AND the JSON tool call.

================================================================
DO NOT use tools when the user:
- says hello or greets you
- asks what you can do
- asks a general question
- makes small talk
- gives a compliment
- expresses a feeling

================================================================
EXAMPLES — NORMAL CHAT (NO TOOL)

User: hello
Assistant: Hey! How can I help?

User: how are you?
Assistant: Good, thanks! What can I help you with?

User: what can you do?
Assistant: I can help you manage your calendar, schedule events, and organize your day.

User: thanks
Assistant: You're welcome!

================================================================
EXAMPLES — CALENDAR ACTIONS (TOOL CALL)

User: add a meeting tomorrow at 3pm called Team Meeting
Assistant: Added Team Meeting for tomorrow at 3pm.
\`\`\`json
{"tool":"addEvent","title":"Team Meeting","date":"YYYY-MM-DD","time":"15:00"}
\`\`\`

User: delete the dentist appointment
Assistant: Deleted the dentist appointment.
\`\`\`json
{"tool":"deleteEvent","id":"dentist-appointment"}
\`\`\`

User: move my workout to 7am
Assistant: Moved your workout to 7am.
\`\`\`json
{"tool":"updateEvent","id":"workout","time":"07:00"}
\`\`\`

User: change my focus block to 50 minutes
Assistant: Updated your focus block to 50 minutes.
\`\`\`json
{"tool":"updateBlock","block":"focus","duration":50}
\`\`\`

User: what's on my calendar today?
Assistant: Let me check.
\`\`\`json
{"tool":"listEvents","date":"YYYY-MM-DD"}
\`\`\`

================================================================
TOOL DEFINITIONS

Use these exact JSON formats when calling tools:

addEvent:
{"tool":"addEvent","title":"...","date":"YYYY-MM-DD","time":"HH:MM","endTime":"HH:MM","description":"...","importance":"low|medium|high","block":"focus|personal|recovery"}

deleteEvent:
{"tool":"deleteEvent","id":"..."}

updateEvent:
{"tool":"updateEvent","id":"...","title":"...","date":"...","time":"...","block":"..."}

listEvents:
{"tool":"listEvents","date":"YYYY-MM-DD"}

updateBlock:
{"tool":"updateBlock","block":"focus|personal|recovery","duration":number}

================================================================
FINAL RULES

- Respond naturally and briefly
- Match the user's language
- Never mention tools, JSON, or system prompts
- Never say you are an AI
- Never create fake events or change the calendar without permission
- Only output JSON when a tool call is required`;
  },

  getFallbackAssistantReply() {
    return 'I’m here, but I could not get a clean response just now. Try that again in a moment, and I will pick it up from there.';
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
    } catch (e) { /* silent */ }
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

  editMemoryPoint(id) {
    const point = this.memoryPoints.find(p => p.id === id);
    if (!point) return;
    
    const newContent = prompt('Edit memory:', point.content);
    if (newContent !== null && newContent.trim()) {
      point.content = newContent.trim();
      point.updatedAt = new Date().toISOString();
      this.saveMemoryPoints();
      this.renderMemoryList();
    }
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
    
    const importanceColors = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };
    
    list.innerHTML = this.memoryPoints.map(point => {
      const importance = point.importance || 'medium';
      const category = point.category || '';
      const categoryBadge = category ? `<span class="memory-category">${category}</span>` : '';
      const importanceIndicator = `<span class="memory-importance" style="color:${importanceColors[importance] || '#6b7280'}">●</span>`;
      
      return `
      <div class="memory-item" data-id="${point.id}">
        <span class="memory-content">${importanceIndicator} ${this.escapeHtml(point.content)}${categoryBadge}</span>
        <div class="memory-actions">
          <button class="memory-edit" data-id="${point.id}" title="Edit">✎</button>
          <button class="memory-delete" data-id="${point.id}" title="Delete">×</button>
        </div>
      </div>`;
    }).join('');
    
    list.querySelectorAll('.memory-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMemoryPoint(btn.dataset.id);
      });
    });
    
    list.querySelectorAll('.memory-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editMemoryPoint(btn.dataset.id);
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

    const sorted = [...this.memoryPoints].sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = importanceOrder[a.importance] ?? 1;
      const bPriority = importanceOrder[b.importance] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    });

    const items = sorted.slice(0, 10).map((p, i) => {
      const category = p.category ? ` [${p.category}]` : '';
      return `${i + 1}. ${p.content}${category}`;
    }).join('\n');

    return `\n\nUser's saved memory points (important context):\n${items}`;
  },

  /**
   * Extract memorable information from conversation (automatic memory extraction)
   * @param {string} userMessage - The user's latest message
   * @param {string} aiResponse - The assistant's response
   * @returns {Promise<void>}
   */
  async extractMemoryFromConversation(userMessage, aiResponse) {
    try {
      const apiKey = this.getApiKey();
      if (!apiKey) return;

      const existingMemories = this.memoryPoints.map(m => `- ${m.content}`).join('\n') || 'None';

      const extractionPrompt = `Analyze this conversation and determine if the user shared any lasting information worth remembering.

EXISTING MEMORIES (avoid duplicates):
${existingMemories}

CONVERSATION:
User: ${userMessage.slice(0, 500)}
Assistant: ${aiResponse.slice(0, 500)}

RULES:
- ONLY save long-term useful information (name, occupation, interests, goals, projects, preferences, habits)
- DO NOT save temporary events, greetings, thanks, or casual conversation
- If similar information exists, return save: false
- Return ONLY valid JSON, no other text

Categories: profile, preferences, projects, interests, goals, work, education, productivity, other

Response format:
{"save": true, "category": "profile", "memory": "User's name is Brian.", "importance": "high"}
or
{"save": false}`;

      const result = await NvidiaConfig.postChatCompletion({
        model: this.getModel(),
        messages: [
          { role: 'system', content: 'You are a memory extraction assistant. Return only JSON.' },
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.1,
        max_tokens: 150,
        stream: false
      }, { apiKey });

      if (!result.response.ok) return;

      const data = await result.response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return;

      const extracted = JSON.parse(content);
      if (extracted.save && extracted.memory) {
        this.addAutomaticMemory(extracted);
      }
    } catch (e) {
    }
  },

  /**
   * Add a memory point from automatic extraction
   * @param {Object} memoryData - { category, memory, importance }
   */
  addAutomaticMemory(memoryData) {
    const { category = 'other', memory, importance = 'medium' } = memoryData;

    const existingIndex = this.findSimilarMemory(memory);
    if (existingIndex !== -1) {
      this.memoryPoints[existingIndex].content = memory;
      this.memoryPoints[existingIndex].category = category;
      this.memoryPoints[existingIndex].importance = importance;
      this.memoryPoints[existingIndex].updatedAt = new Date().toISOString();
    } else {
      const point = {
        id: Date.now().toString(),
        content: memory,
        category: category,
        importance: importance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryPoints.unshift(point);
    }

    if (this.memoryPoints.length > this._maxMemoryPoints) {
      this.memoryPoints = this.memoryPoints.slice(0, this._maxMemoryPoints);
    }

    this.saveMemoryPoints();
    this.renderMemoryList();
  },

  /**
   * Find a similar memory to avoid duplicates
   * @param {string} newMemory - The new memory text
   * @returns {number} - Index of similar memory, or -1 if none found
   */
  findSimilarMemory(newMemory) {
    const normalized = newMemory.toLowerCase().trim();
    for (let i = 0; i < this.memoryPoints.length; i++) {
      const existing = this.memoryPoints[i].content.toLowerCase().trim();
      if (existing === normalized) return i;
      if (existing.includes(normalized) || normalized.includes(existing)) return i;
    }
    return -1;
  },

  /**
   * Get the API key from localStorage with fallback
   * @returns {string}
   */
  getApiKey() {
      return localStorage.getItem('blockflow_nvidia_key') ||
        localStorage.getItem('bf_key_nvidia') ||
        '';
  },

  /**
   * Get the selected model
   * @returns {string}
   */
  getModel() {
    if (typeof NvidiaConfig !== 'undefined') {
      return NvidiaConfig.normalizeModelId(this.elements.modelSelect?.value || NvidiaConfig.getStoredModel());
    }
    return (this.elements.modelSelect?.value || 'meta/llama-3.1-8b-instruct').toLowerCase();
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
      return ['Bump my recovery block to 90 min', 'Show me tomorrow\'s schedule', 'Shift everything after 3pm to tomorrow'];
    }
    if (lower.includes('busy') || lower.includes('free') || lower.includes('schedule') || lower.includes('plan')) {
      return ['Block 2h for deep work this week', 'What can I drop?', 'Push low-priority items to Friday'];
    }
    if (lower.includes('focus') || lower.includes('timer') || lower.includes('deep work')) {
      return ['Start a 25 min block now', 'Protect my focus block tomorrow', 'Extend focus by 15 min'];
    }
    if (lower.includes('break') || lower.includes('rest') || lower.includes('recovery') || lower.includes('tired')) {
      return ['Schedule a 30 min break now', 'Guard my evening after 6pm', 'What\'s my recovery time like this week?'];
    }
    return ['Clear my afternoon', 'Find deep work windows this week', 'Show me what I deprioritized'];
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
      } catch(e) { /* silent */ }
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

  _handleFiles(files) {
    if (!files || files.length === 0) return;
    for (const file of files) {
      if (file.size > 1024 * 1024) {
        this.addAiMessage(`⚠️ File too large: ${file.name} (max 1MB). Skipped.`, true);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        this._attachedFiles.push({ name: file.name, content, type: file.type });
        this._renderFileTags();
      };
      reader.readAsText(file);
    }
  },

  _renderFileTags() {
    if (!this.elements.conversation) return;
    const existing = this.elements.conversation.querySelector('.ai-file-preview');
    if (existing) existing.remove();
    if (this._attachedFiles.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'ai-file-preview';
    this._attachedFiles.forEach((f, i) => {
      const tag = document.createElement('span');
      tag.className = 'ai-file-tag';
      tag.innerHTML = `<span class="name">📄 ${this.escapeHtml(f.name)}</span><span class="remove" data-idx="${i}">×</span>`;
      tag.querySelector('.remove').addEventListener('click', () => {
        this._attachedFiles.splice(i, 1);
        this._renderFileTags();
      });
      wrap.appendChild(tag);
    });
    this.elements.conversation.appendChild(wrap);
    this.scrollToBottom();
  },

  _getAttachmentsContext() {
    if (this._attachedFiles.length === 0) return '';
    let ctx = '\n\n[The user attached the following files. Analyze their content, summarize importance, and organize key information:]';
    this._attachedFiles.forEach(f => {
      ctx += `\n--- File: ${f.name} ---\n${f.content.slice(0, 4000)}`;
      if (f.content.length > 4000) ctx += '\n[truncated...]';
    });
    return ctx;
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
    if (typeof Storage !== 'object' || !Storage.getCalendarEvents) return 'Calendar storage not available.';

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

      case 'updateBlock': {
        const blockId = params.block;
        const duration = parseInt(params.duration, 10);
        if (!blockId || !['focus','personal','recovery'].includes(blockId)) return 'Invalid block. Use focus, personal, or recovery.';
        if (isNaN(duration) || duration < 5 || duration > 480) return 'Duration must be 5-480 minutes.';
        Storage.updateBlock(blockId, { duration });
        const label = blockId.charAt(0).toUpperCase() + blockId.slice(1);
        return `Updated ${label} block to ${duration} min.`;
      }

      default:
        return `Unknown tool: ${tool}.`;
    }
  },

  /**
   * Process tool calls from AI response text
   * @param {string} responseText
   */
  /**
   * Strip ```json ... ``` tool call blocks from display text
   * @param {string} text
   * @returns {string}
   */
  _stripToolCalls(text) {
    return text.replace(/```json\s*\n?({[\s\S]*?})\n?\s*```/g, '').trim();
  },

  _processToolCalls(responseText) {
    const calls = this._parseToolCalls(responseText);

    if (calls.length === 0) return '';

    const results = [];
    const eventDates = [];
    let hasCalendarOp = false;
    let hasBlockOp = false;
    calls.forEach(tc => {
      const result = this._executeCalendarTool(tc);
      results.push(result);
      if ((tc.tool === 'addEvent' || tc.tool === 'updateEvent') && tc.date) {
        eventDates.push({ date: tc.date, title: tc.title || '' });
      }
      if (tc.tool === 'addEvent' || tc.tool === 'deleteEvent' || tc.tool === 'updateEvent') {
        hasCalendarOp = true;
      }
      if (tc.tool === 'updateBlock') {
        hasBlockOp = true;
      }
    });

    this._refreshCalendarUI();

    if (hasCalendarOp && eventDates.length > 0) {
      this._showEventCalendar(eventDates);
    }

    if (hasBlockOp) {
      this.saveMessageHistory();
      this._updateBlockUI();
      this._showCalendarToast(results.join(' | '));
    } else if (hasCalendarOp) {
      this.saveMessageHistory();
      this.close();
      if (localStorage.getItem('blockflow_auto_calendar_nav') !== 'false') {
        this._showCalendarToast(results.join(' | '));
        setTimeout(() => { window.location.href = 'calendar.html'; }, 2500);
      }
    }

    return results.join('\n');
  },

  _refreshCalendarUI() {
    if (typeof Calendar !== 'undefined' && typeof Calendar.refresh === 'function') {
      Calendar.refresh();
    }
  },

  _updateBlockUI() {
    if (typeof Storage !== 'object' || !Storage.getData) return;
    if (typeof UI !== 'undefined' && typeof UI.renderBlocks === 'function' && typeof App !== 'undefined') {
      App.currentData = Storage.getData();
      UI.renderBlocks(App.currentData.blocks);
      UI.updateFocusTime(App.currentData.focusTime);
    }
  },

  _showEventCalendar(eventDates) {
    const container = this.elements.conversation;
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-msg ai-msg-ai';
    wrapper.style.position = 'relative';

    let html = '';
    eventDates.forEach((ed, idx) => {
      const parts = ed.date.split('-');
      if (parts.length !== 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);

      const dateObj = new Date(year, month, 1);
      const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const firstDay = dateObj.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

      let daysHtml = dayNames.map(d => `<div class="cal-dow">${d}</div>`).join('');

      for (let i = 0; i < firstDay; i++) {
        daysHtml += '<div class="cal-day other"></div>';
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cls = d === dayNum ? 'cal-day highlight' : 'cal-day';
        daysHtml += `<div class="${cls}">${d}</div>`;
      }

      const title = ed.title || 'Event';
      html += `<div class="ai-calendar-card">
        <div class="cal-month">${monthName}</div>
        <div class="cal-grid">${daysHtml}</div>
        <div class="cal-event">${this.escapeHtml(title)}</div>
      </div>`;
    });

    if (!html) return;
    wrapper.innerHTML = html;
    container.appendChild(wrapper);
    this.scrollToBottom();
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
    this.showThinking();
    this._proxyError = null;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      this._failThinking('No API key configured.');
      this.addAiMessage('🔑 No API key set — add your <strong>NVIDIA API key</strong> in <button class="ai-chip" onclick="window.location.href=\'settings.html\'" style="padding:2px 10px;font-size:inherit;vertical-align:baseline">Settings</button> to use the AI assistant.', true);
      this.isProcessing = false;
      this.elements.sendBtn.disabled = false;
      return;
    }

    const model = this.getModel();
    const systemPrompt = this.getSystemPrompt() + this.getMemoryContext();

    const events = typeof Storage === 'object' ? Storage.getCalendarEvents() : [];
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    const tomorrowEvents = events.filter(e => e.date === tomorrow);
    const upcomingEvents = events
      .filter(e => e.date > tomorrow)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 6);

    const blockData = typeof Storage === 'object' ? (Storage.getData().blocks || {}) : {};
    let contextStr = `Blocks today: focus=${blockData.focus?.duration||25}min, personal=${blockData.personal?.duration||60}min, recovery=${blockData.recovery?.duration||60}min`;

    contextStr += `\n\nToday (${today}):`;
    if (todayEvents.length > 0) {
      todayEvents.forEach(e => {
        contextStr += `\n- [id:${e.id}] ${e.title}${e.time ? ' at ' + e.time : ''}`;
      });
    } else {
      contextStr += '\n- Nothing scheduled';
    }

    contextStr += `\n\nTomorrow (${tomorrow}):`;
    if (tomorrowEvents.length > 0) {
      tomorrowEvents.forEach(e => {
        contextStr += `\n- [id:${e.id}] ${e.title}${e.time ? ' at ' + e.time : ''}`;
      });
    } else {
      contextStr += '\n- Nothing scheduled';
    }

    if (upcomingEvents.length > 0) {
      contextStr += `\n\nLater this week:`;
      upcomingEvents.forEach(e => {
        contextStr += `\n- ${e.date}: [id:${e.id}] ${e.title}${e.time ? ' at ' + e.time : ''}`;
      });
    }

    clearTimeout(this._thinkingTimer);
    while (this._currentThinkingStep < 2) {
      this._advanceThinking();
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.messages.slice(-this._maxHistoryMessages),
      { role: 'user', content: `Current calendar:\n${contextStr}\n\n---\n\n${userText}` }
    ];

    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 60000);

      let response;
      let proxyEndpoint = '';
      try {
        let completion;
        if (typeof NvidiaConfig !== 'undefined') {
          completion = await NvidiaConfig.postChatCompletion({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 800,
            stream: true
          }, { apiKey, signal: controller.signal });
        } else {
          const proxyUrls = ['https://blockflow-proxy.jarvis-cf.workers.dev', 'http://127.0.0.1:8080'];
          let proxyErr = null;
          for (const proxyUrl of proxyUrls) {
            try {
              const res = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 800 }),
                signal: controller.signal
              });
              completion = { response: res, endpoint: proxyUrl };
              proxyErr = null;
              break;
            } catch (err) {
              if (err.name === 'AbortError') throw err;
              proxyErr = err;
            }
          }
          if (proxyErr || !completion) {
            throw new Error(proxyErr?.message || 'All proxies unreachable');
          }
        }
        response = completion.response;
        proxyEndpoint = completion.endpoint || '';
        if (proxyEndpoint) {
          this._updateThinkingStepLabel(proxyEndpoint.includes('127.0.0.1') || proxyEndpoint.includes('localhost')
            ? 'Using local NVIDIA proxy...'
            : 'Using hosted NVIDIA proxy...');
        }
      } catch (proxyError) {
        if (proxyError.name === 'AbortError') throw proxyError;
        this._proxyError = proxyError.message || 'Proxy unreachable';
        throw new Error(this._proxyError);
      }

      if (!response.ok) {
        let errText = '';
        try { errText = await response.text(); } catch(e) { /* silent */ }
        const detail = errText ? errText.slice(0, 120) : 'No additional details';
        throw new Error(`API error: ${response.status}\n${detail}`);
      }

      this.completeThinking();

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await this.handleStream(response, userText);
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim() || '';
        if (content) {
          this.addAiMessage(content);
          const toolResults = this._processToolCalls(content);
          if (toolResults) {
            this.addAiMessage(toolResults, true);
          }
          this.showDynamicSuggestions(content);
          this.extractMemoryFromConversation(userText, content);
        } else {
          const fallbackReply = this.getFallbackAssistantReply();
          this.addAiMessage(fallbackReply);
          this.showDynamicSuggestions(fallbackReply);
        }
      }
    } catch (error) {
      let errorMsg;
      if (error.name === 'AbortError') {
        errorMsg = 'I could not get a response in time. Please try again in a moment.';
      } else if (this._proxyError) {
        errorMsg = 'I could not reach the assistant service right now. Please try again in a moment.';
      } else {
        errorMsg = error.message || 'Unknown connection error';
      }
      this._failThinking(errorMsg);

      const container = this.elements.conversation;
      const div = document.createElement('div');
      div.className = 'ai-msg ai-msg-ai';
      div.style.position = 'relative';
      div.innerHTML = '<p>' + errorMsg.replace(/\n/g, '<br>') + '</p>';
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
    } finally {
      clearTimeout(timeoutId);
      this.isProcessing = false;
      this.elements.sendBtn.disabled = false;
      this.elements.input?.focus();
    }
  },

  /**
   * Handle streaming response from the API
   * @param {Response} response 
   */
  async handleStream(response, userText = '') {
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
              this.updateReasoning(fullContent);
              this.scrollToBottom();
            }
          } catch(e) { /* silent */ }
        }
      }
    } catch(e) {
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
          } catch(e) { /* silent */ }
        }
      }
    }

    const finalContent = fullContent.trim() || this.getFallbackAssistantReply(userText);
    msgDiv.innerHTML = this.renderMarkdown(finalContent);
    this.addCopyButton(msgDiv);

    const cleanContent = this._stripToolCalls(finalContent);
    if (cleanContent) {
      this.messages.push({ role: 'assistant', content: cleanContent });
      this.saveMessageHistory();
    }
    this.scrollToBottom();

    const toolResults = this._processToolCalls(finalContent);
    if (toolResults) {
      this.addAiMessage(toolResults, true);
    }
    this.showDynamicSuggestions(finalContent);

    this.extractMemoryFromConversation(userText, cleanContent);
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

// Only auto-init on pages that actually use the AI assistant
if (!document.body.classList.contains('no-ai')) {
  document.addEventListener('DOMContentLoaded', () => {
    AIAssistant.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistant;
}

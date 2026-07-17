const QuickCapture = {
  isOpen: false,
  
  init() {
    this.renderFloatingButton();
    this.setupEventListeners();
  },

  renderFloatingButton() {
    const existing = document.querySelector('.quick-capture-fab');
    if (existing) return;
    
    const fab = document.createElement('button');
    fab.className = 'quick-capture-fab';
    fab.innerHTML = '⚡';
    fab.title = 'Quick Capture';
    fab.setAttribute('aria-label', 'Quick Capture');
    document.body.appendChild(fab);
    
    const modal = document.createElement('div');
    modal.className = 'quick-capture-modal';
    modal.id = 'quickCaptureModal';
    modal.innerHTML = `
      <div class="quick-capture-content">
        <div class="quick-capture-header">
          <h3>Quick Capture</h3>
          <button class="quick-capture-close" onclick="QuickCapture.close()">×</button>
        </div>
        <div class="quick-capture-input-area">
          <textarea 
            id="quickCaptureInput" 
            class="quick-capture-input" 
            placeholder="What's on your mind? (task, note, idea...)"
            rows="3"
          ></textarea>
        </div>
        <div class="quick-capture-options">
          <div class="quick-capture-type">
            <button class="quick-capture-type-btn active" data-type="task">📋 Task</button>
            <button class="quick-capture-type-btn" data-type="note">📝 Note</button>
            <button class="quick-capture-type-btn" data-type="idea">💡 Idea</button>
          </div>
          <div class="quick-capture-block">
            <label>Assign to block:</label>
            <select id="quickCaptureBlock">
              <option value="focus">🎯 Focus</option>
              <option value="personal">📚 Personal</option>
              <option value="recovery">🧘 Recovery</option>
            </select>
          </div>
        </div>
        <div class="quick-capture-actions">
          <button class="quick-capture-save-btn" onclick="QuickCapture.save()">
            Save
          </button>
          <button class="quick-capture-cancel-btn" onclick="QuickCapture.close()">
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quick-capture-fab')) {
        this.toggle();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
    
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-capture-modal')) {
        this.close();
      }
    });
    
    document.addEventListener('click', (e) => {
      const typeBtn = e.target.closest('.quick-capture-type-btn');
      if (typeBtn) {
        document.querySelectorAll('.quick-capture-type-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        typeBtn.classList.add('active');
      }
    });
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    const modal = document.getElementById('quickCaptureModal');
    if (modal) {
      modal.classList.add('open');
      this.isOpen = true;
      
      const input = document.getElementById('quickCaptureInput');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  },

  close() {
    const modal = document.getElementById('quickCaptureModal');
    if (modal) {
      modal.classList.remove('open');
      this.isOpen = false;
      
      const input = document.getElementById('quickCaptureInput');
      if (input) {
        input.value = '';
      }
    }
  },

  save() {
    const input = document.getElementById('quickCaptureInput');
    const blockSelect = document.getElementById('quickCaptureBlock');
    const activeType = document.querySelector('.quick-capture-type-btn.active');
    
    if (!input || !input.value.trim()) {
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('Please enter some text', 'error');
      }
      return;
    }
    
    const text = input.value.trim();
    const block = blockSelect ? blockSelect.value : 'focus';
    const type = activeType ? activeType.dataset.type : 'task';
    
    const item = {
      id: 'qc_' + Date.now(),
      text: text,
      type: type,
      block: block,
      createdAt: new Date().toISOString(),
      completed: false
    };
    
    this.saveToStorage(item);
    this.close();
    
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} saved to ${block} block!`, 'success');
    }
  },

  saveToStorage(item) {
    try {
      const existing = localStorage.getItem('blockflow_quick_capture');
      const items = existing ? JSON.parse(existing) : [];
      items.push(item);
      localStorage.setItem('blockflow_quick_capture', JSON.stringify(items));
      
      this.addToCalendar(item);
    } catch (e) {
      console.error('Failed to save quick capture:', e);
    }
  },

  addToCalendar(item) {
    const today = new Date().toISOString().split('T')[0];
    
    const event = {
      title: item.text,
      date: today,
      time: '',
      description: `Quick ${item.type}: ${item.text}`,
      importance: 'medium',
      block: item.block,
      aiAnalyzed: false
    };
    
    if (typeof Storage !== 'undefined' && Storage.addCalendarEvent) {
      Storage.addCalendarEvent(event);
    }
  },

  getItems() {
    try {
      const existing = localStorage.getItem('blockflow_quick_capture');
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      return [];
    }
  },

  markComplete(itemId) {
    const items = this.getItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.completed = true;
      localStorage.setItem('blockflow_quick_capture', JSON.stringify(items));
    }
  },

  deleteItem(itemId) {
    const items = this.getItems();
    const filtered = items.filter(i => i.id !== itemId);
    localStorage.setItem('blockflow_quick_capture', JSON.stringify(filtered));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    QuickCapture.init();
  }, 250);
});

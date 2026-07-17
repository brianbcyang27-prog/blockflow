const NaturalLanguageScheduling = {
  init() {
    this.renderSchedulingUI();
    this.setupEventListeners();
  },

  renderSchedulingUI() {
    const container = document.getElementById('nlSchedulingContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="nl-scheduling-card">
        <div class="nl-scheduling-header">
          <h3 class="nl-scheduling-title">Smart Scheduling</h3>
          <span class="nl-scheduling-badge">AI Powered</span>
        </div>
        
        <div class="nl-scheduling-input-area">
          <div class="nl-scheduling-input-wrapper">
            <input 
              type="text" 
              id="nlSchedulingInput" 
              class="nl-scheduling-input" 
              placeholder="e.g., Meet with Sarah next Tuesday at 2pm"
            >
            <button class="nl-scheduling-parse-btn" onclick="NaturalLanguageScheduling.parseInput()">
              ✨ Parse
            </button>
          </div>
        </div>

        <div class="nl-scheduling-preview" id="nlSchedulingPreview" style="display: none;">
          <div class="nl-scheduling-preview-header">
            <span>Preview</span>
            <button class="nl-scheduling-edit-btn" onclick="NaturalLanguageScheduling.editPreview()">Edit</button>
          </div>
          <div class="nl-scheduling-preview-content" id="nlSchedulingPreviewContent"></div>
          <div class="nl-scheduling-preview-actions">
            <button class="nl-scheduling-confirm-btn" onclick="NaturalLanguageScheduling.confirmEvent()">
              ✓ Add to Calendar
            </button>
            <button class="nl-scheduling-cancel-btn" onclick="NaturalLanguageScheduling.cancelPreview()">
              Cancel
            </button>
          </div>
        </div>

        <div class="nl-scheduling-suggestions">
          <div class="nl-scheduling-suggestions-title">Try saying:</div>
          <div class="nl-scheduling-suggestion-chips">
            <button class="nl-suggestion-chip" onclick="NaturalLanguageScheduling.useSuggestion('Team standup tomorrow at 9am')">
              Team standup tomorrow at 9am
            </button>
            <button class="nl-suggestion-chip" onclick="NaturalLanguageScheduling.useSuggestion('Gym session every Monday at 6pm')">
              Gym every Monday at 6pm
            </button>
            <button class="nl-suggestion-chip" onclick="NaturalLanguageScheduling.useSuggestion('Deep work block from 10am to 12pm')">
              Deep work 10am-12pm
            </button>
            <button class="nl-suggestion-chip" onclick="NaturalLanguageScheduling.useSuggestion('Lunch break at 1pm for 1 hour')">
              Lunch at 1pm for 1hr
            </button>
          </div>
        </div>

        <div class="nl-scheduling-recent">
          <div class="nl-scheduling-recent-title">Recently Scheduled</div>
          <div class="nl-scheduling-recent-list" id="nlRecentList"></div>
        </div>
      </div>
    `;
    
    this.loadRecentEvents();
  },

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'nlSchedulingInput') {
        this.parseInput();
      }
    });
  },

  parseInput() {
    const input = document.getElementById('nlSchedulingInput');
    if (!input || !input.value.trim()) {
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('Please enter an event description', 'error');
      }
      return;
    }
    
    const text = input.value.trim();
    const parsed = this.parseNaturalLanguage(text);
    
    this.showPreview(parsed);
  },

  parseNaturalLanguage(text) {
    const now = new Date();
    let date = new Date(now);
    let time = null;
    let title = text;
    let duration = 60;
    let block = 'focus';
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('tomorrow')) {
      date.setDate(date.getDate() + 1);
      title = title.replace(/tomorrow/i, '').trim();
    } else if (lowerText.includes('next monday')) {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilMonday);
      title = title.replace(/next monday/i, '').trim();
    } else if (lowerText.includes('next tuesday')) {
      const daysUntilTuesday = (9 - now.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilTuesday);
      title = title.replace(/next tuesday/i, '').trim();
    } else if (lowerText.includes('next wednesday')) {
      const daysUntilWednesday = (10 - now.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilWednesday);
      title = title.replace(/next wednesday/i, '').trim();
    } else if (lowerText.includes('next thursday')) {
      const daysUntilThursday = (11 - now.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilThursday);
      title = title.replace(/next thursday/i, '').trim();
    } else if (lowerText.includes('next friday')) {
      const daysUntilFriday = (12 - now.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilFriday);
      title = title.replace(/next friday/i, '').trim();
    } else if (lowerText.includes('next week')) {
      date.setDate(date.getDate() + 7);
      title = title.replace(/next week/i, '').trim();
    }
    
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3];
      
      if (ampm && ampm.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      
      time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      date.setHours(hours, minutes, 0, 0);
      
      title = title.replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '').trim();
    }
    
    const durationMatch = text.match(/for\s+(\d+)\s*(hour|hr|minute|min)/i);
    if (durationMatch) {
      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        duration = amount * 60;
      } else {
        duration = amount;
      }
      
      title = title.replace(/for\s+\d+\s*(?:hour|hr|minute|min)s?/i, '').trim();
    }
    
    if (lowerText.includes('gym') || lowerText.includes('workout') || lowerText.includes('exercise')) {
      block = 'recovery';
    } else if (lowerText.includes('meeting') || lowerText.includes('call') || lowerText.includes('standup')) {
      block = 'personal';
    } else if (lowerText.includes('deep work') || lowerText.includes('focus') || lowerText.includes('study')) {
      block = 'focus';
    }
    
    title = title.replace(/^(meet with|call|schedule|add|create|plan)\s+/i, '').trim();
    
    if (!title) {
      title = 'Untitled Event';
    }
    
    return {
      title: title,
      date: date.toISOString().split('T')[0],
      time: time,
      duration: duration,
      block: block,
      importance: 'medium',
      originalText: text
    };
  },

  showPreview(parsed) {
    const preview = document.getElementById('nlSchedulingPreview');
    const content = document.getElementById('nlSchedulingPreviewContent');
    
    if (!preview || !content) return;
    
    const blockLabels = {
      focus: '🎯 Focus',
      personal: '📚 Personal',
      recovery: '🧘 Recovery'
    };
    
    const dateObj = new Date(parsed.date + (parsed.time ? 'T' + parsed.time : ''));
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    content.innerHTML = `
      <div class="nl-preview-event">
        <div class="nl-preview-title">${parsed.title}</div>
        <div class="nl-preview-details">
          <div class="nl-preview-detail">
            <span class="nl-preview-icon">📅</span>
            <span>${formattedDate}</span>
          </div>
          ${parsed.time ? `
            <div class="nl-preview-detail">
              <span class="nl-preview-icon">⏰</span>
              <span>${parsed.time}</span>
            </div>
          ` : ''}
          <div class="nl-preview-detail">
            <span class="nl-preview-icon">⏱️</span>
            <span>${parsed.duration} minutes</span>
          </div>
          <div class="nl-preview-detail">
            <span class="nl-preview-icon">📦</span>
            <span>${blockLabels[parsed.block] || parsed.block}</span>
          </div>
        </div>
      </div>
    `;
    
    preview.style.display = 'block';
    this.currentParsed = parsed;
  },

  editPreview() {
    const input = document.getElementById('nlSchedulingInput');
    if (input && this.currentParsed) {
      input.value = this.currentParsed.originalText;
      this.cancelPreview();
      input.focus();
    }
  },

  cancelPreview() {
    const preview = document.getElementById('nlSchedulingPreview');
    if (preview) {
      preview.style.display = 'none';
    }
    this.currentParsed = null;
  },

  confirmEvent() {
    if (!this.currentParsed) return;
    
    const event = {
      title: this.currentParsed.title,
      date: this.currentParsed.date,
      time: this.currentParsed.time || '',
      description: `Scheduled via natural language: ${this.currentParsed.originalText}`,
      importance: this.currentParsed.importance,
      block: this.currentParsed.block,
      aiAnalyzed: true
    };
    
    if (typeof Storage !== 'undefined' && Storage.addCalendarEvent) {
      Storage.addCalendarEvent(event);
    }
    
    this.saveToRecent(event);
    this.cancelPreview();
    
    const input = document.getElementById('nlSchedulingInput');
    if (input) {
      input.value = '';
    }
    
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Event added to calendar!', 'success');
    }
    
    this.loadRecentEvents();
  },

  saveToRecent(event) {
    try {
      const existing = localStorage.getItem('blockflow_nl_recent');
      const recent = existing ? JSON.parse(existing) : [];
      recent.unshift(event);
      
      if (recent.length > 5) {
        recent.pop();
      }
      
      localStorage.setItem('blockflow_nl_recent', JSON.stringify(recent));
    } catch (e) {
      console.error('Failed to save recent event:', e);
    }
  },

  loadRecentEvents() {
    const list = document.getElementById('nlRecentList');
    if (!list) return;
    
    try {
      const existing = localStorage.getItem('blockflow_nl_recent');
      const recent = existing ? JSON.parse(existing) : [];
      
      if (recent.length === 0) {
        list.innerHTML = '<div class="nl-recent-empty">No recent events</div>';
        return;
      }
      
      list.innerHTML = recent.map(event => `
        <div class="nl-recent-item">
          <div class="nl-recent-title">${event.title}</div>
          <div class="nl-recent-date">${event.date} ${event.time || ''}</div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = '<div class="nl-recent-empty">No recent events</div>';
    }
  },

  useSuggestion(text) {
    const input = document.getElementById('nlSchedulingInput');
    if (input) {
      input.value = text;
      input.focus();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    NaturalLanguageScheduling.init();
  }, 300);
});

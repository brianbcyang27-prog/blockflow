const DemoMode = {
  isActive: false,
  
  init() {
    this.renderDemoButton();
    this.checkDemoMode();
  },

  renderDemoButton() {
    const container = document.getElementById('demoContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="demo-card">
        <div class="demo-header">
          <h3 class="demo-title">Demo Mode</h3>
          <span class="demo-badge">Presentation Ready</span>
        </div>
        
        <div class="demo-description">
          Load sample data to showcase all features for your presentation.
        </div>
        
        <div class="demo-actions">
          <button class="demo-load-btn" onclick="DemoMode.loadDemoData()">
            📊 Load Demo Data
          </button>
          <button class="demo-clear-btn" onclick="DemoMode.clearDemoData()">
            🗑️ Clear Data
          </button>
        </div>
        
        <div class="demo-features">
          <div class="demo-feature">
            <span class="demo-feature-icon">📅</span>
            <span class="demo-feature-text">7-day history with focus patterns</span>
          </div>
          <div class="demo-feature">
            <span class="demo-feature-icon">📋</span>
            <span class="demo-feature-text">Calendar events across the week</span>
          </div>
          <div class="demo-feature">
            <span class="demo-feature-icon">📚</span>
            <span class="demo-feature-text">Sample materials for AI analysis</span>
          </div>
          <div class="demo-feature">
            <span class="demo-feature-icon">🎯</span>
            <span class="demo-feature-text">Realistic distraction patterns</span>
          </div>
        </div>
        
        <div class="demo-status" id="demoStatus"></div>
      </div>
    `;
  },

  checkDemoMode() {
    const status = document.getElementById('demoStatus');
    if (!status) return;
    
    const history = Storage.getHistory();
    const events = Storage.getCalendarEvents();
    
    if (history.length > 0 || events.length > 0) {
      status.innerHTML = '<span class="demo-status-active">Demo data loaded</span>';
    } else {
      status.innerHTML = '<span class="demo-status-inactive">No demo data</span>';
    }
  },

  loadDemoData() {
    this.loadDemoHistory();
    this.loadDemoCalendarEvents();
    this.loadDemoMaterials();
    
    this.isActive = true;
    this.checkDemoMode();
    
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Demo data loaded successfully!', 'success');
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  loadDemoHistory() {
    const history = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const focusTime = Math.floor(Math.random() * 120) + 30;
      const distractions = Math.floor(Math.random() * 5);
      
      history.push({
        date: date.toISOString().split('T')[0],
        blocks: {
          focus: { 
            duration: 25, 
            completed: Math.random() > 0.3, 
            timeSpent: Math.floor(Math.random() * 25) 
          },
          personal: { 
            duration: 60, 
            completed: Math.random() > 0.4, 
            timeSpent: Math.floor(Math.random() * 60) 
          },
          recovery: { 
            duration: 60, 
            completed: Math.random() > 0.5, 
            timeSpent: Math.floor(Math.random() * 60) 
          }
        },
        distractions: distractions,
        focusTime: focusTime,
        sleep: { sleepTime: '22:00', wakeTime: '07:00' }
      });
    }
    
    localStorage.setItem('blockflow_history', JSON.stringify(history));
  },

  loadDemoCalendarEvents() {
    const events = [];
    const today = new Date();
    
    const sampleEvents = [
      { title: 'Team Standup', time: '09:00', block: 'focus', importance: 'high' },
      { title: 'Deep Work Session', time: '10:00', block: 'focus', importance: 'high' },
      { title: 'Lunch with Client', time: '12:00', block: 'personal', importance: 'medium' },
      { title: 'Project Review', time: '14:00', block: 'focus', importance: 'high' },
      { title: 'Gym Workout', time: '17:00', block: 'recovery', importance: 'medium' },
      { title: 'Evening Reading', time: '20:00', block: 'recovery', importance: 'low' }
    ];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const eventsForDay = sampleEvents.filter(() => Math.random() > 0.3);
      
      eventsForDay.forEach(evt => {
        events.push({
          id: 'evt_demo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          title: evt.title,
          date: date.toISOString().split('T')[0],
          time: evt.time,
          endTime: '',
          description: `Demo event: ${evt.title}`,
          importance: evt.importance,
          block: evt.block,
          aiAnalyzed: true,
          createdAt: Date.now()
        });
      });
    }
    
    localStorage.setItem('blockflow_calendar_events', JSON.stringify(events));
  },

  loadDemoMaterials() {
    const materials = [
      {
        id: 'mat_demo_1',
        name: 'Project Requirements.pdf',
        type: 'pdf',
        size: 245000,
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
        summary: 'Key requirements for Q3 project delivery including timeline and milestones.',
        block: 'focus'
      },
      {
        id: 'mat_demo_2',
        name: 'Meeting Notes.md',
        type: 'text',
        size: 12000,
        uploadedAt: new Date(Date.now() - 172800000).toISOString(),
        summary: 'Notes from team planning session with action items and deadlines.',
        block: 'personal'
      },
      {
        id: 'mat_demo_3',
        name: 'Training Video.mp4',
        type: 'video',
        size: 15000000,
        uploadedAt: new Date(Date.now() - 259200000).toISOString(),
        summary: 'Onboarding training video covering company policies and procedures.',
        block: 'recovery'
      }
    ];
    
    localStorage.setItem('blockflow_materials', JSON.stringify(materials));
  },

  clearDemoData() {
    localStorage.removeItem('blockflow_history');
    localStorage.removeItem('blockflow_calendar_events');
    localStorage.removeItem('blockflow_materials');
    localStorage.removeItem('blockflow_data');
    
    this.isActive = false;
    this.checkDemoMode();
    
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Demo data cleared!', 'success');
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    DemoMode.init();
  }, 350);
});

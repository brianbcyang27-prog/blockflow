const DailyBriefing = {
  briefingData: null,
  
  init() {
    this.loadBriefingData();
    this.renderBriefingCard();
  },

  loadBriefingData() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const hour = today.getHours();
    
    const calendarEvents = Storage.getCalendarEvents();
    const todayEvents = calendarEvents.filter(evt => {
      const evtDate = new Date(evt.date);
      return evtDate.toDateString() === today.toDateString();
    });

    const history = Storage.getHistory();
    const materials = this.getMaterials();
    const focusPatterns = this.analyzeFocusPatterns(history);
    
    this.briefingData = {
      greeting: this.getGreeting(hour),
      dayOfWeek: this.getDayName(dayOfWeek),
      todayEvents: todayEvents,
      eventCount: todayEvents.length,
      focusPatterns: focusPatterns,
      materialsCount: materials.length,
      recommendations: this.generateRecommendations(todayEvents, focusPatterns, materials),
      priorityTask: this.findPriorityTask(todayEvents)
    };
  },

  getGreeting(hour) {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  },

  getDayName(dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  },

  analyzeFocusPatterns(history) {
    if (!history || history.length === 0) {
      return {
        avgFocusTime: 0,
        avgDistractions: 0,
        bestDay: null,
        trend: 'insufficient_data'
      };
    }

    const totalFocusTime = history.reduce((sum, day) => sum + (day.focusTime || 0), 0);
    const totalDistractions = history.reduce((sum, day) => sum + (day.distractions || 0), 0);
    const avgFocusTime = Math.round(totalFocusTime / history.length);
    const avgDistractions = Math.round(totalDistractions / history.length);

    let bestDay = null;
    let maxFocus = 0;
    history.forEach(day => {
      if ((day.focusTime || 0) > maxFocus) {
        maxFocus = day.focusTime || 0;
        bestDay = day.date;
      }
    });

    let trend = 'stable';
    if (history.length >= 2) {
      const recent = history[history.length - 1].focusTime || 0;
      const previous = history[history.length - 2].focusTime || 0;
      if (recent > previous * 1.2) trend = 'improving';
      else if (recent < previous * 0.8) trend = 'declining';
    }

    return {
      avgFocusTime,
      avgDistractions,
      bestDay,
      trend
    };
  },

  getMaterials() {
    try {
      const materialsData = localStorage.getItem('blockflow_materials');
      return materialsData ? JSON.parse(materialsData) : [];
    } catch (e) {
      return [];
    }
  },

  generateRecommendations(events, focusPatterns, materials) {
    const recommendations = [];
    
    if (events.length === 0) {
      recommendations.push({
        icon: '📅',
        text: 'No events scheduled today. Consider planning your day.',
        priority: 'medium'
      });
    } else if (events.length > 5) {
      recommendations.push({
        icon: '⚠️',
        text: `Busy day with ${events.length} events. Focus on one task at a time.`,
        priority: 'high'
      });
    }

    if (focusPatterns.trend === 'declining') {
      recommendations.push({
        icon: '📉',
        text: 'Focus time has been declining. Try shorter focus sessions today.',
        priority: 'high'
      });
    } else if (focusPatterns.trend === 'improving') {
      recommendations.push({
        icon: '📈',
        text: 'Great progress! Keep up the momentum.',
        priority: 'low'
      });
    }

    if (focusPatterns.avgDistractions > 3) {
      recommendations.push({
        icon: '🎯',
        text: 'Average distractions are high. Consider turning off notifications.',
        priority: 'medium'
      });
    }

    if (materials.length > 0) {
      recommendations.push({
        icon: '📚',
        text: `You have ${materials.length} materials. Review them during Personal block.`,
        priority: 'low'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        icon: '✨',
        text: 'Start with your most important task during peak focus hours.',
        priority: 'medium'
      });
    }

    return recommendations.slice(0, 3);
  },

  findPriorityTask(events) {
    if (!events || events.length === 0) return null;
    
    const highPriority = events.find(evt => evt.importance === 'high');
    if (highPriority) return highPriority;
    
    return events[0];
  },

  renderBriefingCard() {
    const container = document.getElementById('briefingContainer');
    if (!container || !this.briefingData) return;

    const data = this.briefingData;
    
    container.innerHTML = `
      <div class="briefing-card">
        <div class="briefing-header">
          <div class="briefing-greeting">${data.greeting}!</div>
          <div class="briefing-day">${data.dayOfWeek}</div>
        </div>
        
        <div class="briefing-summary">
          <div class="briefing-stat">
            <span class="briefing-stat-icon">📅</span>
            <span class="briefing-stat-value">${data.eventCount}</span>
            <span class="briefing-stat-label">events today</span>
          </div>
          <div class="briefing-stat">
            <span class="briefing-stat-icon">⏱️</span>
            <span class="briefing-stat-value">${data.focusPatterns.avgFocusTime}</span>
            <span class="briefing-stat-label">avg focus min</span>
          </div>
          <div class="briefing-stat">
            <span class="briefing-stat-icon">📚</span>
            <span class="briefing-stat-value">${data.materialsCount}</span>
            <span class="briefing-stat-label">materials</span>
          </div>
        </div>

        ${data.priorityTask ? `
          <div class="briefing-priority">
            <div class="briefing-priority-label">Priority Task</div>
            <div class="briefing-priority-task">
              <span class="briefing-priority-time">${data.priorityTask.time || 'All day'}</span>
              <span class="briefing-priority-title">${data.priorityTask.title}</span>
            </div>
          </div>
        ` : ''}

        <div class="briefing-recommendations">
          <div class="briefing-rec-title">Recommendations</div>
          ${data.recommendations.map(rec => `
            <div class="briefing-rec-item priority-${rec.priority}">
              <span class="briefing-rec-icon">${rec.icon}</span>
              <span class="briefing-rec-text">${rec.text}</span>
            </div>
          `).join('')}
        </div>

        <div class="briefing-footer">
          <button class="briefing-refresh-btn" onclick="DailyBriefing.refreshBriefing()">
            🔄 Refresh
          </button>
        </div>
      </div>
    `;
  },

  refreshBriefing() {
    this.loadBriefingData();
    this.renderBriefingCard();
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Briefing updated!', 'success');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    DailyBriefing.init();
  }, 100);
});

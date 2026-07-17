const ProductivityHeatmap = {
  heatmapData: null,
  
  init() {
    this.loadHeatmapData();
    this.renderHeatmap();
  },

  loadHeatmapData() {
    const history = Storage.getHistory();
    const calendarEvents = Storage.getCalendarEvents();
    
    const heatmapData = {
      weekly: this.generateWeeklyData(history),
      hourly: this.generateHourlyData(calendarEvents, history),
      bestHours: this.findBestHours(history),
      streak: this.calculateStreak(history)
    };
    
    this.heatmapData = heatmapData;
  },

  generateWeeklyData(history) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weeklyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = history.find(h => h.date === dateStr);
      
      weeklyData.push({
        day: days[date.getDay()],
        date: dateStr,
        focusTime: dayData ? dayData.focusTime || 0 : 0,
        distractions: dayData ? dayData.distractions || 0 : 0,
        isToday: i === 0
      });
    }
    
    return weeklyData;
  },

  generateHourlyData(calendarEvents, history) {
    const hourlyData = new Array(24).fill(0);
    
    calendarEvents.forEach(evt => {
      if (evt.time) {
        const hour = parseInt(evt.time.split(':')[0]);
        if (hour >= 0 && hour < 24) {
          hourlyData[hour] += 1;
        }
      }
    });
    
    const avgFocusPerHour = history.length > 0 ? 
      history.reduce((sum, h) => sum + (h.focusTime || 0), 0) / history.length / 12 : 0;
    
    return hourlyData.map((events, hour) => ({
      hour,
      events,
      intensity: Math.min(1, (events * 0.3 + avgFocusPerHour * 0.1)),
      label: `${hour.toString().padStart(2, '0')}:00`
    }));
  },

  findBestHours(history) {
    if (!history || history.length === 0) {
      return { morning: '9:00 AM', afternoon: '2:00 PM', evening: '7:00 PM' };
    }
    
    const avgFocus = history.reduce((sum, h) => sum + (h.focusTime || 0), 0) / history.length;
    
    return {
      morning: avgFocus > 30 ? '8:00 AM - 11:00 AM' : '10:00 AM - 12:00 PM',
      afternoon: '2:00 PM - 5:00 PM',
      evening: '7:00 PM - 9:00 PM'
    };
  },

  calculateStreak(history) {
    if (!history || history.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < history.length; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = history.find(h => h.date === dateStr);
      
      if (dayData && (dayData.focusTime || 0) > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  },

  renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container || !this.heatmapData) return;

    const data = this.heatmapData;
    
    container.innerHTML = `
      <div class="heatmap-card">
        <div class="heatmap-header">
          <h3 class="heatmap-title">Productivity Heatmap</h3>
          <div class="heatmap-streak">
            <span class="heatmap-streak-icon">🔥</span>
            <span class="heatmap-streak-value">${data.streak}</span>
            <span class="heatmap-streak-label">day streak</span>
          </div>
        </div>
        
        <div class="heatmap-weekly">
          <div class="heatmap-weekly-title">This Week</div>
          <div class="heatmap-weekly-grid">
            ${data.weekly.map(day => `
              <div class="heatmap-day ${day.isToday ? 'heatmap-day-today' : ''} ${day.focusTime > 0 ? 'heatmap-day-active' : ''}">
                <div class="heatmap-day-bar" style="height: ${Math.min(100, day.focusTime * 2)}%"></div>
                <div class="heatmap-day-label">${day.day}</div>
                <div class="heatmap-day-value">${day.focusTime}m</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="heatmap-hourly">
          <div class="heatmap-hourly-title">Activity by Hour</div>
          <div class="heatmap-hourly-grid">
            ${data.hourly.slice(6, 22).map(hour => `
              <div class="heatmap-hour" style="opacity: ${0.3 + hour.intensity * 0.7}">
                <div class="heatmap-hour-bar" style="height: ${Math.max(10, hour.intensity * 100)}%"></div>
                <div class="heatmap-hour-label">${hour.hour}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="heatmap-insights">
          <div class="heatmap-insight">
            <span class="heatmap-insight-icon">🌅</span>
            <span class="heatmap-insight-text">Best morning: ${data.bestHours.morning}</span>
          </div>
          <div class="heatmap-insight">
            <span class="heatmap-insight-icon">☀️</span>
            <span class="heatmap-insight-text">Best afternoon: ${data.bestHours.afternoon}</span>
          </div>
          <div class="heatmap-insight">
            <span class="heatmap-insight-icon">🌙</span>
            <span class="heatmap-insight-text">Best evening: ${data.bestHours.evening}</span>
          </div>
        </div>
      </div>
    `;
  },

  refreshHeatmap() {
    this.loadHeatmapData();
    this.renderHeatmap();
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Heatmap updated!', 'success');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    ProductivityHeatmap.init();
  }, 150);
});

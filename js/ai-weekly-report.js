const AIWeeklyReport = {
  reportData: null,
  
  init() {
    this.loadReportData();
    this.renderReportButton();
  },

  loadReportData() {
    const history = Storage.getHistory();
    const calendarEvents = Storage.getCalendarEvents();
    const materials = this.getMaterials();
    
    this.reportData = {
      weeklyStats: this.calculateWeeklyStats(history),
      topTasks: this.getTopTasks(calendarEvents),
      insights: this.generateInsights(history),
      recommendations: this.generateRecommendations(history),
      generatedAt: new Date().toLocaleString()
    };
  },

  calculateWeeklyStats(history) {
    const lastWeek = history.slice(-7);
    
    const totalFocusTime = lastWeek.reduce((sum, day) => sum + (day.focusTime || 0), 0);
    const totalDistractions = lastWeek.reduce((sum, day) => sum + (day.distractions || 0), 0);
    const avgFocusTime = Math.round(totalFocusTime / Math.max(1, lastWeek.length));
    const completionRate = lastWeek.filter(day => {
      const blocks = day.blocks || {};
      return blocks.focus?.completed || blocks.personal?.completed || blocks.recovery?.completed;
    }).length / Math.max(1, lastWeek.length) * 100;
    
    return {
      totalFocusTime,
      totalDistractions,
      avgFocusTime,
      completionRate: Math.round(completionRate),
      daysTracked: lastWeek.length
    };
  },

  getTopTasks(calendarEvents) {
    const recentEvents = calendarEvents
      .filter(evt => {
        const evtDate = new Date(evt.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return evtDate >= weekAgo;
      })
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return (importanceOrder[b.importance] || 0) - (importanceOrder[a.importance] || 0);
      })
      .slice(0, 5);
    
    return recentEvents;
  },

  generateInsights(history) {
    const insights = [];
    
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const avgRecent = recent.reduce((sum, h) => sum + (h.focusTime || 0), 0) / 3;
      const avgPrevious = history.slice(-6, -3).reduce((sum, h) => sum + (h.focusTime || 0), 0) / 3;
      
      if (avgRecent > avgPrevious * 1.2) {
        insights.push({
          type: 'positive',
          icon: '📈',
          text: 'Focus time increased by 20% compared to last week!'
        });
      } else if (avgRecent < avgPrevious * 0.8) {
        insights.push({
          type: 'negative',
          icon: '📉',
          text: 'Focus time decreased. Consider adjusting your schedule.'
        });
      }
    }
    
    const totalDistractions = history.reduce((sum, h) => sum + (h.distractions || 0), 0);
    if (totalDistractions > 20) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        text: 'High distraction count. Try turning off notifications during focus blocks.'
      });
    }
    
    if (insights.length === 0) {
      insights.push({
        type: 'neutral',
        icon: '💡',
        text: 'Keep tracking your progress to get personalized insights.'
      });
    }
    
    return insights;
  },

  generateRecommendations(history) {
    const recommendations = [];
    
    const avgFocus = history.length > 0 ? 
      history.reduce((sum, h) => sum + (h.focusTime || 0), 0) / history.length : 0;
    
    if (avgFocus < 60) {
      recommendations.push('Try to increase your daily focus time to at least 1 hour.');
    }
    
    const avgDistractions = history.length > 0 ?
      history.reduce((sum, h) => sum + (h.distractions || 0), 0) / history.length : 0;
    
    if (avgDistractions > 3) {
      recommendations.push('Consider using the Pomodoro technique to reduce distractions.');
    }
    
    recommendations.push('Review your materials regularly to reinforce learning.');
    recommendations.push('Set specific goals for each focus block.');
    
    return recommendations.slice(0, 3);
  },

  getMaterials() {
    try {
      const materialsData = localStorage.getItem('blockflow_materials');
      return materialsData ? JSON.parse(materialsData) : [];
    } catch (e) {
      return [];
    }
  },

  renderReportButton() {
    const container = document.getElementById('reportContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="report-card">
        <div class="report-header">
          <h3 class="report-title">Weekly Report</h3>
          <button class="report-generate-btn" onclick="AIWeeklyReport.generateReport()">
            📊 Generate Report
          </button>
        </div>
        
        <div class="report-preview">
          <div class="report-stat">
            <span class="report-stat-icon">⏱️</span>
            <span class="report-stat-value">${this.reportData?.weeklyStats?.totalFocusTime || 0}</span>
            <span class="report-stat-label">total focus min</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-icon">🚫</span>
            <span class="report-stat-value">${this.reportData?.weeklyStats?.totalDistractions || 0}</span>
            <span class="report-stat-label">distractions</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-icon">✅</span>
            <span class="report-stat-value">${this.reportData?.weeklyStats?.completionRate || 0}%</span>
            <span class="report-stat-label">completion</span>
          </div>
        </div>

        <div class="report-insights">
          ${(this.reportData?.insights || []).map(insight => `
            <div class="report-insight report-insight-${insight.type}">
              <span class="report-insight-icon">${insight.icon}</span>
              <span class="report-insight-text">${insight.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  generateReport() {
    if (!this.reportData) {
      this.loadReportData();
    }
    
    const reportContent = this.formatReportContent();
    this.downloadReport(reportContent);
    
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Report downloaded!', 'success');
    }
  },

  formatReportContent() {
    const data = this.reportData;
    const stats = data.weeklyStats;
    
    return `
BlockFlow Weekly Report
Generated: ${data.generatedAt}

═══════════════════════════════════════

WEEKLY STATISTICS
─────────────────
Total Focus Time: ${stats.totalFocusTime} minutes
Average Daily Focus: ${stats.avgFocusTime} minutes
Total Distractions: ${stats.totalDistractions}
Completion Rate: ${stats.completionRate}%
Days Tracked: ${stats.daysTracked}

═══════════════════════════════════════

TOP TASKS THIS WEEK
───────────────────
${data.topTasks.map((task, i) => `${i + 1}. ${task.title} (${task.importance || 'medium'} priority)`).join('\n') || 'No tasks recorded'}

═══════════════════════════════════════

INSIGHTS
────────
${data.insights.map(insight => `${insight.icon} ${insight.text}`).join('\n')}

═══════════════════════════════════════

RECOMMENDATIONS
───────────────
${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

═══════════════════════════════════════

Keep up the great work! 🚀
    `.trim();
  },

  downloadReport(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockflow-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  refreshReport() {
    this.loadReportData();
    this.renderReportButton();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    AIWeeklyReport.init();
  }, 200);
});

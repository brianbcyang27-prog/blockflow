const UI = {
  elements: {},

  init() {
    this.cacheElements();
    this.setCurrentDate();
    this.renderTodayEvents();
  },

  cacheElements() {
    this.elements = {
      currentDate: document.getElementById('currentDate'),
      blocksContainer: document.getElementById('blocksContainer'),
      timerTime: document.getElementById('timerTime'),
      startTimer: document.getElementById('startTimer'),
      pauseTimer: document.getElementById('pauseTimer'),
      resetTimer: document.getElementById('resetTimer'),
      skipBreak: document.getElementById('skipBreak'),
      timerStatus: document.getElementById('timerStatus'),
      focusTime: document.getElementById('focusTime'),
      focusRatio: document.getElementById('focusRatio'),
      sleepTime: document.getElementById('sleepTime'),
      wakeTime: document.getElementById('wakeTime'),
      saveSleep: document.getElementById('saveSleep'),
      sleepDuration: document.getElementById('sleepDuration'),
      sleepStat: document.getElementById('sleepStat'),
      sleepPopover: document.getElementById('sleepPopover'),
      dailyReset: document.getElementById('dailyReset'),
      blockSettingsModal: document.getElementById('blockSettingsModal'),
      blockDuration: document.getElementById('blockDuration'),
      saveBlockSettings: document.getElementById('saveBlockSettings'),
      cancelBlockSettings: document.getElementById('cancelBlockSettings'),
      historyContainer: document.getElementById('historyContainer'),
      timerCard: document.getElementById('timerCard'),
      eventsList: document.getElementById('eventsList'),
      eventCount: document.getElementById('eventCount'),
      distractionCount: document.getElementById('distractionCount'),
      logDistraction: document.getElementById('logDistraction')
    };
  },

  setCurrentDate() {
    if (!this.elements.currentDate) return;
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.elements.currentDate.textContent = 'Today: ' + today.toLocaleDateString('en-US', options);
  },

  renderTodayEvents() {
    if (!this.elements.eventsList) return;

    const events = Storage.getCalendarEvents();
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events
      .filter(e => e.date === today)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    if (this.elements.eventCount) {
      this.elements.eventCount.textContent = todayEvents.length + ' event' + (todayEvents.length !== 1 ? 's' : '');
    }

    if (todayEvents.length === 0) {
      this.elements.eventsList.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon">📅</div>' +
        '<div class="empty-state-title">No events today</div>' +
        '<div class="empty-state-text">Add events in the calendar to see them here</div>' +
        '<div class="empty-state-actions">' +
        '<button class="btn btn-primary" onclick="window.location.href=\'calendar.html\'">Add Event</button>' +
        '</div>' +
        '</div>';
      return;
    }

    let html = '';
    todayEvents.forEach(evt => {
      const dotClass = evt.importance === 'high' ? 'dc-event-dot-high' : evt.importance === 'low' ? 'dc-event-dot-low' : 'dc-event-dot-medium';
      const blockClass = evt.block === 'personal' ? 'dc-event-block-p' : evt.block === 'recovery' ? 'dc-event-block-r' : 'dc-event-block-f';
      const timeStr = evt.time || '--:--';
      if (evt.endTime) timeStr += ' - ' + evt.endTime;

      html +=
        '<div class="dc-event-row dc-event-row-' + evt.block + '">' +
        '<span class="dc-event-dot ' + dotClass + '"></span>' +
        '<span class="dc-event-time">' + timeStr + '</span>' +
        '<span class="dc-event-title">' + evt.title + '</span>' +
        '<span class="dc-event-block ' + blockClass + '">' + evt.block + '</span>' +
        '</div>';
    });

    this.elements.eventsList.innerHTML = html;
  },

  renderBlocks(blocks) {
    if (!this.elements.blocksContainer) return;
    const blockTypes = [
      { id: 'focus', icon: '🎯', title: 'Focus', sub: 'Work / Study' },
      { id: 'personal', icon: '📚', title: 'Personal', sub: 'Hobbies / Projects' },
      { id: 'recovery', icon: '🧘', title: 'Recovery', sub: 'Rest / Social' }
    ];

    this.elements.blocksContainer.innerHTML = blockTypes.map(b => {
      const data = blocks[b.id];
      const completed = data.completed;
      const timeSpent = data.timeSpent || 0;
      const duration = data.duration || 60;
      const progressPct = Math.min(100, Math.round((timeSpent / duration) * 100));
      const doneClass = completed ? ' dc-block-done' : '';
      const activeClass = timeSpent > 0 && !completed ? ' dc-block-active' : '';
      const typeClass = ' dc-block-' + b.id;
      const barHtml = !completed && timeSpent > 0
        ? '<div class="dc-block-bar dc-block-bar-' + b.id + '"><div class="dc-block-bar-fill" style="width:' + progressPct + '%;"></div></div>'
        : '';
      const timeLabel = completed ? '✓ Done' : (timeSpent > 0 ? timeSpent + ' / ' + duration + ' min' : duration + ' min');
      return '<div class="dc-block' + doneClass + activeClass + typeClass + '">' +
        '<div class="dc-block-header">' +
        '<span class="dc-block-icon">' + b.icon + '</span>' +
        '<span class="dc-block-name">' + b.title + '</span>' +
        '<span class="dc-block-dur">' + timeLabel + '</span>' +
        '</div>' +
        barHtml +
        '<div class="dc-block-footer">' +
        '<button class="dc-block-btn dc-block-btn-set" onclick="App.openBlockSettings(\'' + b.id + '\')">Set</button>' +
        '<button class="dc-block-btn' + (completed ? '' : ' dc-block-btn-done') + '" onclick="App.toggleBlockComplete(\'' + b.id + '\')">' +
        (completed ? 'Redo' : 'Done') +
        '</button>' +
        '</div>' +
        '</div>';
    }).join('');
  },

  updateTimerDisplay(time) {
    if (!this.elements.timerTime) return;
    this.elements.timerTime.textContent = time;
  },

  updateTimerButtons(isRunning) {
    if (!this.elements.startTimer) return;
    this.elements.startTimer.disabled = isRunning;
    this.elements.startTimer.textContent = isRunning ? 'Focusing...' : 'Start';
    if (this.elements.pauseTimer) {
      this.elements.pauseTimer.disabled = !isRunning;
    }
  },

  updateTimerMode(isBreak) {
    const card = this.elements.timerCard;
    if (!card) return;
    if (isBreak) {
      card.classList.add('timer-compact-break');
      if (this.elements.skipBreak) this.elements.skipBreak.style.display = 'inline-block';
    } else {
      card.classList.remove('timer-compact-break');
      if (this.elements.skipBreak) this.elements.skipBreak.style.display = 'none';
    }
  },

  updateTimerStatus(status) {
    if (!this.elements.timerStatus) return;
    this.elements.timerStatus.textContent = status;
  },

  updateFocusTime(minutes) {
    if (!this.elements.focusTime) return;
    this.elements.focusTime.textContent = minutes;
    const data = typeof Storage === 'object' ? Storage.getData() : null;
    const distractions = data ? (data.distractions || 0) : 0;
    const ratioEl = this.elements.focusRatio;
    if (ratioEl) {
      if (distractions === 0 && minutes === 0) {
        ratioEl.textContent = '--';
      } else if (distractions === 0) {
        ratioEl.textContent = minutes + 'm';
      } else {
        ratioEl.textContent = Math.round(minutes / distractions) + 'm';
      }
    }
  },

  updateSleepDuration(hours, minutes) {
    if (!this.elements.sleepDuration) return;
    this.elements.sleepDuration.textContent = hours + 'h ' + minutes + 'm';
  },

  showBlockSettingsModal(blockId, currentDuration) {
    if (!this.elements.blockSettingsModal) return;
    this.elements.blockSettingsModal.style.display = 'flex';
    this.elements.blockDuration.value = currentDuration;
    this.elements.blockSettingsModal.dataset.blockId = blockId;
  },

  hideBlockSettingsModal() {
    if (!this.elements.blockSettingsModal) return;
    this.elements.blockSettingsModal.style.display = 'none';
  },

  getBlockSettingsDuration() {
    if (!this.elements.blockDuration) return 60;
    return parseInt(this.elements.blockDuration.value) || 60;
  },

  getBlockSettingsBlockId() {
    if (!this.elements.blockSettingsModal) return null;
    return this.elements.blockSettingsModal.dataset.blockId;
  },

  toggleFocusMode(enable) {
    document.body.classList.toggle('focus-mode', enable);
  },

  toggleSleepPopover(show) {
    if (!this.elements.sleepPopover) return;
    this.elements.sleepPopover.classList.toggle('open', show);
  },

  renderHistory() {
    if (!this.elements.historyContainer) return;

    const history = Storage.getHistory();
    if (!history || history.length === 0) {
      this.elements.historyContainer.innerHTML = '<div class="history-empty">No history yet</div>';
      return;
    }

    let totalFocus = 0, totalDistractions = 0, completedBlocks = 0, totalBlocks = 0;
    history.forEach(day => {
      totalFocus += day.focusTime || 0;
      totalDistractions += day.distractions || 0;
      if (day.blocks) {
        Object.keys(day.blocks).forEach(k => {
          totalBlocks++;
          if (day.blocks[k].completed) completedBlocks++;
        });
      }
    });
    const blockRate = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
    const ratioStr = totalDistractions > 0
      ? Math.round(totalFocus / totalDistractions) + 'm / distraction'
      : totalFocus > 0 ? totalFocus + ':0' : '--';

    const aggHtml =
      '<div class="history-week-agg" style="background:#f9fafb;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">' +
      '<div><div style="font-size:1.2rem;font-weight:800;color:#667eea;">' + totalFocus + '</div><div style="font-size:0.7rem;color:#9ca3af;">total focus min</div></div>' +
      '<div><div style="font-size:1.2rem;font-weight:800;color:#ef4444;">' + totalDistractions + '</div><div style="font-size:0.7rem;color:#9ca3af;">distractions</div></div>' +
      '<div><div style="font-size:1.2rem;font-weight:800;color:#10b981;">' + blockRate + '%</div><div style="font-size:0.7rem;color:#9ca3af;">blocks done</div></div>' +
      '</div>';

    const sorted = [].concat(history).reverse();
    let html = '';
    sorted.forEach((day, index) => {
      const date = new Date(day.date + 'T12:00:00');
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const isToday = index === 0;
      const focusIcon = day.blocks.focus.completed ? '✅' : '⬜';
      const personalIcon = day.blocks.personal.completed ? '✅' : '⬜';
      const recoveryIcon = day.blocks.recovery.completed ? '✅' : '⬜';

      html +=
        '<div class="history-mini-row ' + (isToday ? 'today-row' : '') + '">' +
        '<div class="history-mini-date">' + dateStr + '</div>' +
        '<div class="history-mini-stats">' +
        '<span>🎯 ' + (day.focusTime || 0) + 'm</span>' +
        '</div>' +
        '<div class="history-mini-blocks">' +
        '<span title="Focus">' + focusIcon + '</span>' +
        '<span title="Personal">' + personalIcon + '</span>' +
        '<span title="Recovery">' + recoveryIcon + '</span>' +
        '</div>' +
        '</div>';
    });

    this.elements.historyContainer.innerHTML = aggHtml + html;
  },

  showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('toast-exit');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}

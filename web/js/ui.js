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
const today = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
this.elements.currentDate.textContent = 'Today: ' + today.toLocaleDateString('en-US', options);
},

renderTodayEvents() {
if (!this.elements.eventsList) return;

const events = Storage.getCalendarEvents();
const today = new Date().toISOString().split('T')[0];
const todayEvents = events
.filter(function(e) { return e.date === today; })
.sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });

if (this.elements.eventCount) {
this.elements.eventCount.textContent = todayEvents.length + ' event' + (todayEvents.length !== 1 ? 's' : '');
}

if (todayEvents.length === 0) {
this.elements.eventsList.innerHTML =
'<div class="events-empty">' +
'<div class="events-empty-icon">📅</div>' +
'No events today' +
'</div>';
return;
}

var html = '';
todayEvents.forEach(function(evt) {
var impClass = 'event-importance-medium';
if (evt.importance === 'high') impClass = 'event-importance-high';
else if (evt.importance === 'low') impClass = 'event-importance-low';

var blockClass = 'event-block-focus';
if (evt.block === 'personal') blockClass = 'event-block-personal';
else if (evt.block === 'recovery') blockClass = 'event-block-recovery';

var timeStr = evt.time || '--:--';
if (evt.endTime) timeStr += ' - ' + evt.endTime;

html +=
'<div class="event-row">' +
'<div class="event-importance ' + impClass + '"></div>' +
'<div class="event-time">' + timeStr + '</div>' +
'<div class="event-title">' + evt.title + '</div>' +
'<div class="event-block-tag ' + blockClass + '">' + evt.block + '</div>' +
'</div>';
});

this.elements.eventsList.innerHTML = html;
},

renderBlocks(blocks) {
  if (!this.elements.blocksContainer) return;
  var blockTypes = [
    { id: 'focus', icon: '🎯', title: 'Focus', sub: 'Work / Study' },
    { id: 'personal', icon: '📚', title: 'Personal', sub: 'Hobbies / Projects' },
    { id: 'recovery', icon: '🧘', title: 'Recovery', sub: 'Rest / Social' }
  ];

  this.elements.blocksContainer.innerHTML = blockTypes.map(function(b) {
var data = blocks[b.id];
var completed = data.completed;
var timeSpent = data.timeSpent || 0;
var duration = data.duration || 60;
var progressPct = Math.min(100, Math.round((timeSpent / duration) * 100));
var progressBar = !completed && timeSpent > 0
  ? '<div style="height:3px;background:#e5e7eb;border-radius:3px;margin-top:4px;overflow:hidden;"><div style="height:100%;width:' + progressPct + '%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:3px;transition:width 0.3s ease;"></div></div>'
  : '';
return '<div class="block-chip block-chip-' + b.id + ' ' + (completed ? 'block-chip-done' : '') + '">' +
'<div class="block-chip-icon">' + b.icon + '</div>' +
'<div class="block-chip-info">' +
'<div class="block-chip-name">' + b.title + '</div>' +
'<div class="block-chip-dur">' + (completed ? 'Done' : (timeSpent > 0 ? timeSpent + '/' + duration + ' min' : duration + ' min')) + '</div>' +
progressBar +
'</div>' +
'<div class="block-chip-actions">' +
'<button class="btn btn-outline" onclick="App.openBlockSettings(\'' + b.id + '\')">Set</button>' +
'<button class="btn ' + (completed ? 'btn-outline' : 'btn-primary') + '" onclick="App.toggleBlockComplete(\'' + b.id + '\')">' +
(completed ? 'Done' : 'Mark') +
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
  this.elements.pauseTimer.disabled = !isRunning;
},

updateTimerMode(isBreak) {
  var card = this.elements.timerCard;
  if (!card) return;
  if (isBreak) {
    card.classList.add('timer-compact-break');
    this.elements.skipBreak.style.display = 'inline-block';
  } else {
    card.classList.remove('timer-compact-break');
    this.elements.skipBreak.style.display = 'none';
  }
},

updateTimerStatus(status) {
  if (!this.elements.timerStatus) return;
  this.elements.timerStatus.textContent = status;
},

updateFocusTime(minutes) {
  if (!this.elements.focusTime) return;
  this.elements.focusTime.textContent = minutes;
  var data = typeof Storage !== 'undefined' ? Storage.getData() : null;
  var distractions = data ? (data.distractions || 0) : 0;
  var ratioEl = this.elements.focusRatio;
  if (ratioEl) {
    if (distractions === 0 && minutes === 0) {
      ratioEl.textContent = '--';
    } else if (distractions === 0) {
      ratioEl.textContent = minutes + ':0';
    } else {
      ratioEl.textContent = Math.round(minutes / distractions) + 'm';
    }
  }
  // Also update home essentials if present
  var homeEl = document.getElementById('homeFocusMin');
  if (homeEl) homeEl.textContent = minutes + ' min';
},

updateSleepDuration(hours, minutes) {
  if (!this.elements.sleepDuration) return;
  this.elements.sleepDuration.textContent = hours + 'h';
  // Also update home essentials if present
  var homeEl = document.getElementById('homeSleepVal');
  if (homeEl) homeEl.textContent = hours + 'h';
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

var history = Storage.getHistory();
if (!history || history.length === 0) {
this.elements.historyContainer.innerHTML = '<div class="history-empty">No history yet</div>';
return;
}

var totalFocus = 0, totalDistractions = 0, completedBlocks = 0, totalBlocks = 0;
history.forEach(function(day) {
  totalFocus += day.focusTime || 0;
  totalDistractions += day.distractions || 0;
  if (day.blocks) {
    Object.keys(day.blocks).forEach(function(k) {
      totalBlocks++;
      if (day.blocks[k].completed) completedBlocks++;
    });
  }
});
var blockRate = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
var ratioStr = totalDistractions > 0
  ? Math.round(totalFocus / totalDistractions) + 'm / distraction'
  : totalFocus > 0 ? totalFocus + ':0' : '--';

var aggHtml =
'<div class="history-week-agg" style="background:#f9fafb;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">' +
'<div><div style="font-size:1.2rem;font-weight:800;color:#667eea;">' + totalFocus + '</div><div style="font-size:0.7rem;color:#9ca3af;">total focus min</div></div>' +
'<div><div style="font-size:1.2rem;font-weight:800;color:#ef4444;">' + totalDistractions + '</div><div style="font-size:0.7rem;color:#9ca3af;">distractions</div></div>' +
'<div><div style="font-size:1.2rem;font-weight:800;color:#10b981;">' + blockRate + '%</div><div style="font-size:0.7rem;color:#9ca3af;">blocks done</div></div>' +
'</div>';

var sorted = [].concat(history).reverse();

var html = '';
sorted.forEach(function(day, index) {
var date = new Date(day.date + 'T12:00:00');
var dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
var isToday = index === 0;

var focusIcon = day.blocks.focus.completed ? '✅' : '⬜';
var personalIcon = day.blocks.personal.completed ? '✅' : '⬜';
var recoveryIcon = day.blocks.recovery.completed ? '✅' : '⬜';

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
}
};

if (typeof module !== 'undefined' && module.exports) {
module.exports = UI;
}

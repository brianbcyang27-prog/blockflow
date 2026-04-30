const Calendar = {
currentDate: new Date(),
events: [],
elements: {},

init() {
this.cacheElements();
this.render();
this.setupEventListeners();
Firebase.onAuthChange((user) => this.onAuthStateChange(user));
},

cacheElements() {
this.elements = {
calendarGrid: document.getElementById('calendarGrid'),
currentMonth: document.getElementById('currentMonth'),
prevMonth: document.getElementById('prevMonth'),
nextMonth: document.getElementById('nextMonth'),
todayBtn: document.getElementById('todayBtn'),
signInBtn: document.getElementById('signInBtn'),
signOutBtn: document.getElementById('signOutBtn'),
userEmail: document.getElementById('userEmail'),
userPhoto: document.getElementById('userPhoto'),
userInfo: document.getElementById('userInfo'),
eventModal: document.getElementById('eventModal'),
eventTitle: document.getElementById('eventTitle'),
eventTime: document.getElementById('eventTime'),
eventDescription: document.getElementById('eventDescription'),
openInGoogle: document.getElementById('openInGoogle'),
closeEventModal: document.getElementById('closeEventModal')
};
},

setupEventListeners() {
this.elements.prevMonth.addEventListener('click', () => this.changeMonth(-1));
this.elements.nextMonth.addEventListener('click', () => this.changeMonth(1));
this.elements.todayBtn.addEventListener('click', () => this.goToToday());
this.elements.signInBtn.addEventListener('click', () => this.signIn());
this.elements.signOutBtn.addEventListener('click', () => this.signOut());
this.elements.closeEventModal.addEventListener('click', () => this.hideEventModal());
this.elements.eventModal.addEventListener('click', (e) => {
if (e.target === this.elements.eventModal) {
this.hideEventModal();
}
});
},

onAuthStateChange(user) {
if (user) {
this.elements.signInBtn.style.display = 'none';
this.elements.signOutBtn.style.display = 'inline-block';
this.elements.userInfo.style.display = 'flex';
this.elements.userEmail.textContent = user.email;
if (user.photoURL) {
this.elements.userPhoto.src = user.photoURL;
} else {
this.elements.userPhoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236b7280"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
}
this.fetchEvents();
} else {
this.elements.signInBtn.style.display = 'inline-block';
this.elements.signOutBtn.style.display = 'none';
this.elements.userInfo.style.display = 'none';
this.events = [];
this.render();
}
},

async signIn() {
const result = await Firebase.signIn();
if (result.success) {
console.log('Signed in as:', result.user.email);
} else {
alert('Sign-in failed: ' + result.error);
}
},

async signOut() {
const result = await Firebase.signOut();
if (result.success) {
console.log('Signed out');
}
},

async fetchEvents() {
if (!Firebase.isSignedIn()) return;

this.elements.calendarGrid.innerHTML = `
<div class="calendar-loading">
<div class="spinner"></div>
<span>Loading your events...</span>
</div>
`;

const token = await Firebase.getIdToken();
if (!token) {
console.error('No ID token available');
return;
}

const year = this.currentDate.getFullYear();
const month = this.currentDate.getMonth();
const timeMin = new Date(year, month, 1).toISOString();
const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

try {
const response = await fetch('/api/calendar/events?timeMin=' + encodeURIComponent(timeMin) + '&timeMax=' + encodeURIComponent(timeMax), {
headers: {
'Authorization': 'Bearer ' + token
}
});

if (!response.ok) {
throw new Error('Failed to fetch events');
}

const data = await response.json();
this.events = data.items || [];
this.render();
} catch (error) {
console.error('Error fetching events:', error);
this.elements.calendarGrid.innerHTML = `
<div class="calendar-loading" style="color: #dc2626;">
<span>Failed to load events. Please try signing in again.</span>
</div>
`;
}
},

changeMonth(delta) {
this.currentDate.setMonth(this.currentDate.getMonth() + delta);
this.render();
if (Firebase.isSignedIn()) {
this.fetchEvents();
}
},

goToToday() {
this.currentDate = new Date();
this.render();
if (Firebase.isSignedIn()) {
this.fetchEvents();
}
},

render() {
this.renderHeader();
this.renderGrid();
},

renderHeader() {
const options = { month: 'long', year: 'numeric' };
this.elements.currentMonth.textContent = this.currentDate.toLocaleDateString('en-US', options);
},

renderGrid() {
const year = this.currentDate.getFullYear();
const month = this.currentDate.getMonth();
const firstDay = new Date(year, month, 1);
const lastDay = new Date(year, month + 1, 0);
const startDay = firstDay.getDay();
const daysInMonth = lastDay.getDate();

const today = new Date();
const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
const todayDate = today.getDate();

const prevMonth = new Date(year, month, 0);
const daysInPrevMonth = prevMonth.getDate();

let html = '';

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
dayHeaders.forEach(day => {
html += `<div class="calendar-day-header">${day}</div>`;
});

for (let i = startDay - 1; i >= 0; i--) {
const day = daysInPrevMonth - i;
html += this.renderDay(day, true, null, prevMonth.getMonth(), prevMonth.getFullYear());
}

for (let day = 1; day <= daysInMonth; day++) {
const isToday = isCurrentMonth && day === todayDate;
const dateStr = this.formatDateStr(year, month, day);
const dayEvents = this.getEventsForDate(dateStr);
html += this.renderDay(day, false, isToday, month, year, dayEvents);
}

const totalCells = startDay + daysInMonth;
const remainingCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
const nextMonth = new Date(year, month + 1, 1);

for (let day = 1; day <= remainingCells; day++) {
html += this.renderDay(day, true, null, nextMonth.getMonth(), nextMonth.getFullYear());
}

this.elements.calendarGrid.innerHTML = html;

document.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
dayEl.addEventListener('click', (e) => {
const dateStr = dayEl.dataset.date;
if (dateStr) {
this.showDayEvents(dateStr);
}
});
});
},

renderDay(day, isOther, isToday, month, year, events = []) {
const todayClass = isToday ? 'today' : '';
const otherClass = isOther ? 'other-month' : '';
const dateStr = this.formatDateStr(year, month, day);

let eventsHtml = '';
if (!isOther && events.length > 0) {
const displayEvents = events.slice(0, 3);
displayEvents.forEach(event => {
const eventClass = this.getEventClass(event);
const title = event.summary || 'Busy';
eventsHtml += `<div class="event-item ${eventClass}" title="${this.escapeHtml(title)}">${this.escapeHtml(title)}</div>`;
});
if (events.length > 3) {
eventsHtml += `<div class="event-item default">+${events.length - 3} more</div>`;
}
}

return `
<div class="calendar-day ${todayClass} ${otherClass}" data-date="${dateStr}">
<div class="day-number">${day}</div>
<div class="day-events">${eventsHtml}</div>
</div>
`;
},

formatDateStr(year, month, day) {
return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
},

getEventsForDate(dateStr) {
return this.events.filter(event => {
const start = event.start || {};
const eventDate = start.date || start.dateTime || '';
return eventDate.startsWith(dateStr);
});
},

getEventClass(event) {
const title = (event.summary || '').toLowerCase();
if (title.includes('work') || title.includes('meeting') || title.includes('project')) {
return 'work';
}
if (title.includes('personal') || title.includes('hobby') || title.includes('friend')) {
return 'personal';
}
if (title.includes('reminder') || title.includes('task') || title.includes('todo')) {
return 'reminder';
}
return 'default';
},

showDayEvents(dateStr) {
const events = this.getEventsForDate(dateStr);
if (events.length === 0) {
return;
}

if (events.length === 1) {
this.showEventModal(events[0]);
} else {
const date = new Date(dateStr + 'T12:00:00');
const options = { weekday: 'long', month: 'long', day: 'numeric' };
const formattedDate = date.toLocaleDateString('en-US', options);

let content = `<strong>${formattedDate}</strong><br><br>`;
events.forEach((event, index) => {
const time = this.formatEventTime(event);
content += `<strong>${index + 1}. ${this.escapeHtml(event.summary || 'Busy')}</strong><br>`;
content += `Time: ${time}<br><br>`;
});

this.elements.eventTitle.textContent = `${events.length} Events`;
this.elements.eventTime.textContent = formattedDate;
this.elements.eventDescription.innerHTML = content;
this.elements.openInGoogle.style.display = 'none';
this.elements.eventModal.style.display = 'flex';
}
},

showEventModal(event) {
const title = event.summary || 'Busy';
const time = this.formatEventTime(event);
const description = event.description || 'No description';
const link = event.htmlLink || '#';

this.elements.eventTitle.textContent = title;
this.elements.eventTime.textContent = time;
this.elements.eventDescription.textContent = description;
this.elements.openInGoogle.href = link;
this.elements.openInGoogle.style.display = link !== '#' ? 'inline-block' : 'none';
this.elements.eventModal.style.display = 'flex';
},

formatEventTime(event) {
const start = event.start || {};
const dateStr = start.date || start.dateTime || '';

if (!dateStr) return 'All day';

if (start.date) {
return 'All day';
}

const date = new Date(dateStr);
const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
return date.toLocaleDateString('en-US', options);
},

hideEventModal() {
this.elements.eventModal.style.display = 'none';
},

escapeHtml(text) {
const div = document.createElement('div');
div.textContent = text;
return div.innerHTML;
}
};

document.addEventListener('DOMContentLoaded', () => {
Firebase.init();
Calendar.init();
});

if (typeof module !== 'undefined' && module.exports) {
module.exports = Calendar;
}
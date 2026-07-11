const Calendar = {
    currentDate: new Date(),
    events: [],
    elements: {},
    editingEventId: null,
    pendingAiResult: null,
    pendingAiValues: null,
    NVIDIA_KEY: 'blockflow_nvidia_key',

    init() {
        this.cacheElements();
        this.loadEvents();
        this.render();
        this.setupEventListeners();
    },

    cacheElements() {
        this.elements = {
            calendarGrid: document.getElementById('calendarGrid'),
            currentMonth: document.getElementById('currentMonth'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            todayBtn: document.getElementById('todayBtn'),
            addEventBtn: document.getElementById('addEventBtn'),
            addEventDate: document.getElementById('addEventDate'),
            eventModal: document.getElementById('eventModal'),
            eventForm: document.getElementById('eventForm'),
            eventId: document.getElementById('eventId'),
            eventTitle: document.getElementById('eventTitle'),
            eventDate: document.getElementById('eventDate'),
            eventTime: document.getElementById('eventTime'),
            eventEndTime: document.getElementById('eventEndTime'),
            eventDescription: document.getElementById('eventDescription'),
            eventImportance: document.getElementById('eventImportance'),
            eventBlock: document.getElementById('eventBlock'),
            aiSkeleton: document.getElementById('aiSkeleton'),
            aiSuggestion: document.getElementById('aiSuggestion'),
            aiSuggestionText: document.getElementById('aiSuggestionText'),
            aiAccept: document.getElementById('aiAccept'),
            aiReject: document.getElementById('aiReject'),
            modalTitle: document.getElementById('modalTitle'),
            saveEvent: document.getElementById('saveEvent'),
            deleteEvent: document.getElementById('deleteEvent'),
            cancelEvent: document.getElementById('cancelEvent'),
            closeEventModal: document.getElementById('closeEventModal'),
            viewModal: document.getElementById('viewModal'),
            viewTitle: document.getElementById('viewTitle'),
            viewTime: document.getElementById('viewTime'),
            viewBlock: document.getElementById('viewBlock'),
            viewImportance: document.getElementById('viewImportance'),
            viewDescription: document.getElementById('viewDescription'),
            editFromView: document.getElementById('editFromView'),
            deleteFromView: document.getElementById('deleteFromView'),
            closeViewModal: document.getElementById('closeViewModal')
        };
    },

    setupEventListeners() {
        this.elements.prevMonth.addEventListener('click', () => this.changeMonth(-1));
        this.elements.nextMonth.addEventListener('click', () => this.changeMonth(1));
        this.elements.todayBtn.addEventListener('click', () => this.goToToday());
        this.elements.addEventBtn.addEventListener('click', () => this.openAddModal());
        this.elements.closeEventModal.addEventListener('click', () => {
            if (this.elements.saveEvent.disabled) return; // Don't close during AI analysis
            this.hideEventModal();
        });
        this.elements.cancelEvent.addEventListener('click', () => {
            if (this.elements.saveEvent.disabled) return; // Don't close during AI analysis
            this.hideEventModal();
        });
        this.elements.closeViewModal.addEventListener('click', () => this.hideViewModal());
        this.elements.saveEvent.addEventListener('click', () => this.saveCurrentEvent());
        this.elements.deleteEvent.addEventListener('click', () => this.deleteCurrentEvent());
        this.elements.editFromView.addEventListener('click', () => this.editFromViewModal());
        this.elements.deleteFromView.addEventListener('click', () => this.deleteFromViewModal());
        this.elements.aiAccept.addEventListener('click', () => { this.acceptAiSuggestion(); });
        this.elements.aiReject.addEventListener('click', () => { this.rejectAiSuggestion(); });
        this.elements.eventForm.addEventListener('submit', (e) => e.preventDefault());

        this.elements.eventModal.addEventListener('click', (e) => {
            if (e.target === this.elements.eventModal && !this.elements.saveEvent.disabled) this.hideEventModal();
        });
        this.elements.viewModal.addEventListener('click', (e) => {
            if (e.target === this.elements.viewModal) this.hideViewModal();
        });
    },

    loadEvents() {
        this.events = Storage.getCalendarEvents();
    },

    render() {
        this.renderHeader();
        this.renderGrid();
    },

    renderHeader() {
        const options = { month: 'long', year: 'numeric' };
        this.elements.currentMonth.textContent = this.currentDate.toLocaleDateString('en-US', options);
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        this.elements.addEventDate.textContent = 'Today: ' + todayStr;
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

        const prevMonthDate = new Date(year, month, 0);
        const daysInPrevMonth = prevMonthDate.getDate();

        let html = '';

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += this.renderDay(day, true, false, prevMonthDate.getMonth(), prevMonthDate.getFullYear());
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === todayDate;
            const dateStr = this.formatDateStr(year, month, day);
            const dayEvents = this.getEventsForDate(dateStr);
            html += this.renderDay(day, false, isToday, month, year, dayEvents);
        }

        const totalCells = startDay + daysInMonth;
        const remainingCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
        const nextMonthDate = new Date(year, month + 1, 1);

        for (let day = 1; day <= remainingCells; day++) {
            html += this.renderDay(day, true, false, nextMonthDate.getMonth(), nextMonthDate.getFullYear());
        }

        this.elements.calendarGrid.innerHTML = html;

        document.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                if (e.target.closest('.add-event-quick')) return;
                const dateStr = dayEl.dataset.date;
                if (dateStr) this.showDayEvents(dateStr);
            });
        });

        document.querySelectorAll('.add-event-quick').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dateStr = btn.dataset.date;
                if (dateStr) this.openAddModal(dateStr);
            });
        });
    },

    renderDay(day, isOther, isToday, month, year, events = []) {
        const todayClass = isToday ? 'today' : '';
        const otherClass = isOther ? 'other-month' : '';
        const dateStr = this.formatDateStr(year, month, day);

        let eventsHtml = '';
        if (!isOther && events.length > 0) {
            const displayEvents = events.slice(0, 2);
            displayEvents.forEach(event => {
                const impClass = event.importance || 'medium';
                const title = this.escapeHtml(event.title);
                const timeStr = event.time ? ' ' + this.escapeHtml(event.time) : '';
                eventsHtml += `<div class="event-item importance-${impClass}" title="${title}${timeStr}">${title}</div>`;
            });
            if (events.length > 2) {
                eventsHtml += `<div class="event-item importance-default">+${events.length - 2} more</div>`;
            }
        }

        return `
            <div class="calendar-day ${todayClass} ${otherClass}" data-date="${dateStr}">
                <div class="day-number">${day}</div>
                <div class="day-events">${eventsHtml}</div>
                ${!isOther ? '<button class="add-event-quick" data-date="' + dateStr + '" title="Add event">+</button>' : ''}
            </div>
        `;
    },

    formatDateStr(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    getEventsForDate(dateStr) {
        return this.events.filter(event => event.date === dateStr);
    },

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.render();
    },

    goToToday() {
        this.currentDate = new Date();
        this.render();
    },

    openAddModal(dateStr) {
        this.editingEventId = null;
        this.elements.modalTitle.textContent = 'Add Event';
        this.elements.saveEvent.textContent = 'Add Event';
        this.elements.deleteEvent.style.display = 'none';
        this.elements.aiSkeleton.style.display = 'none';
        this.elements.aiSuggestion.style.display = 'none';
        this.elements.eventForm.reset();
        this.elements.eventId.value = '';
        this.elements.eventImportance.value = 'medium';
        this.elements.eventBlock.value = 'focus';
        this.elements.eventDate.value = dateStr || this.formatDateStr(
            this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate()
        );
        this.elements.eventModal.style.display = 'flex';
    },

    openEditModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.editingEventId = eventId;
        this.elements.modalTitle.textContent = 'Edit Event';
        this.elements.saveEvent.textContent = 'Save Changes';
        this.elements.deleteEvent.style.display = 'inline-block';
        this.elements.aiSkeleton.style.display = 'none';
        this.elements.aiSuggestion.style.display = 'none';
        this.elements.eventId.value = eventId;
        this.elements.eventTitle.value = event.title || '';
        this.elements.eventDate.value = event.date || '';
        this.elements.eventTime.value = event.time || '';
        this.elements.eventEndTime.value = event.endTime || '';
        this.elements.eventDescription.value = event.description || '';
        this.elements.eventImportance.value = event.importance || 'medium';
        this.elements.eventBlock.value = event.block || 'focus';
        this.elements.eventModal.style.display = 'flex';
    },

    hideEventModal() {
        this.elements.eventModal.style.display = 'none';
        this.elements.saveEvent.disabled = false;
        this.elements.saveEvent.textContent = this.editingEventId ? 'Save Changes' : 'Add Event';
        this.editingEventId = null;
        this.elements.aiSkeleton.style.display = 'none';
        this.elements.aiSuggestion.style.display = 'none';
        this.pendingAiResult = null;
        this.pendingAiValues = null;
    },

    saveCurrentEvent() {
        const title = this.elements.eventTitle.value.trim();
        if (!title) {
            alert('Please enter an event title.');
            return;
        }

        const eventData = {
            title: title,
            date: this.elements.eventDate.value,
            time: this.elements.eventTime.value,
            endTime: this.elements.eventEndTime.value,
            description: this.elements.eventDescription.value,
            importance: this.elements.eventImportance.value,
            block: this.elements.eventBlock.value
        };

        const eventId = this.elements.eventId.value;

        if (eventId) {
            Storage.updateCalendarEvent(eventId, eventData);
            this.loadEvents();
            this.render();
            this.hideEventModal();
        } else {
            const saved = Storage.addCalendarEvent(eventData);
            this.elements.eventId.value = saved.id; // Set hidden id for accept/reject flow
            this.loadEvents();
            this.render();
            this.elements.saveEvent.disabled = true;
            this.elements.saveEvent.textContent = 'Analyzing...';
            this.runAiAnalysis(saved, eventData);
        }
    },

    deleteCurrentEvent() {
        const eventId = this.elements.eventId.value;
        if (!eventId) return;
        if (!confirm('Delete this event?')) return;
        Storage.deleteCalendarEvent(eventId);
        this.loadEvents();
        this.render();
        this.hideEventModal();
    },

    showDayEvents(dateStr) {
        const events = this.getEventsForDate(dateStr);
        if (events.length === 0) {
            this.openAddModal(dateStr);
            return;
        }

        if (events.length === 1) {
            this.showViewModal(events[0]);
        } else {
            const date = new Date(dateStr + 'T12:00:00');
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            const formattedDate = date.toLocaleDateString('en-US', options);

            let content = '';
            events.forEach((event, index) => {
                const timeStr = this.formatEventTimeDisplay(event);
                const imp = event.importance || 'medium';
                const block = event.block || 'focus';
                content += '<div style="padding:12px 16px;background:#f9fafb;border-radius:12px;margin-bottom:8px;cursor:pointer;border-left:4px solid ' + this.importanceColor(imp) + '" onclick="Calendar.showViewModal(Calendar.events.find(e=>e.id===\'' + event.id + '\'))">';
                content += '<strong>' + (index + 1) + '. ' + this.escapeHtml(event.title) + '</strong><br>';
                content += '<span style="font-size:0.85rem;color:#6b7280;">' + this.escapeHtml(timeStr) + '</span>';
                content += '</div>';
            });

            this.elements.viewTitle.textContent = events.length + ' Events on ' + formattedDate;
            this.elements.viewTime.textContent = '';
            this.elements.viewBlock.textContent = '';
            this.elements.viewImportance.textContent = '';
            this.elements.viewDescription.innerHTML = content;
            this.elements.editFromView.style.display = 'none';
            this.elements.deleteFromView.style.display = 'none';
            this.elements.viewModal.style.display = 'flex';
        }
    },

    showViewModal(event) {
        const title = event.title || 'Untitled';
        const timeStr = this.formatEventTimeDisplay(event);
        const blockMap = { focus: 'Focus', personal: 'Personal', recovery: 'Recovery' };
        const impMap = { high: 'High', medium: 'Medium', low: 'Low' };

        this.elements.viewTitle.textContent = title;
        this.elements.viewTime.textContent = timeStr;
        this.elements.viewBlock.textContent = 'Block: ' + (blockMap[event.block] || event.block);
        this.elements.viewImportance.style.color = event.importance === 'high' ? '#dc2626' : event.importance === 'low' ? '#10b981' : '#d97706';
        this.elements.viewImportance.textContent = 'Importance: ' + (impMap[event.importance] || event.importance);
        this.elements.viewDescription.textContent = event.description || 'No description';
        this.elements.editFromView.dataset.eventId = event.id;
        this.elements.deleteFromView.dataset.eventId = event.id;
        this.elements.editFromView.style.display = 'inline-block';
        this.elements.deleteFromView.style.display = 'inline-block';
        this.elements.viewModal.style.display = 'flex';
    },

    hideViewModal() {
        this.elements.viewModal.style.display = 'none';
    },

    editFromViewModal() {
        const eventId = this.elements.editFromView.dataset.eventId;
        this.hideViewModal();
        this.openEditModal(eventId);
    },

    deleteFromViewModal() {
        const eventId = this.elements.deleteFromView.dataset.eventId;
        if (!eventId || !confirm('Delete this event?')) return;
        Storage.deleteCalendarEvent(eventId);
        this.loadEvents();
        this.render();
        this.hideViewModal();
    },

    formatEventTimeDisplay(event) {
        if (!event.time) return 'All day';
        let str = event.time;
        if (event.endTime) str += ' - ' + event.endTime;
        const date = new Date(event.date + 'T12:00:00');
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options) + ' ' + str;
    },

    importanceColor(imp) {
        return imp === 'high' ? '#dc2626' : imp === 'low' ? '#10b981' : '#d97706';
    },

    async runAiAnalysis(savedEvent, rawData) {
        const apiKey = localStorage.getItem(this.NVIDIA_KEY);
        const noAi = (timedOut) => {
            this.showAiSkeleton(false);
            if (this.elements.aiSuggestion) {
                this.elements.aiSuggestion.style.display = 'none';
            }
            this.hideEventModal();
            this.elements.saveEvent.disabled = false;
            this.elements.saveEvent.textContent = 'Add Event';
            this.pendingAiResult = null;
            this.pendingAiValues = null;
            if (timedOut) {
                console.warn('AI analysis timed out');
            }
        };
        if (!apiKey) { noAi(); return; }

        const systemPrompt = 'You are a productivity assistant. Analyze an event and respond with ONLY valid JSON (no markdown):\n{\n  "importance": "high|medium|low",\n  "suggestedBlock": "focus|personal|recovery",\n  "reason": "one short sentence"\n}\n\nGuidelines:\n- high: deadlines, meetings, exams, work\n- medium: regular tasks, appointments\n- low: optional activities, leisure\n- focus: work, study, deep work\n- personal: hobbies, projects\n- recovery: rest, social, exercise';

        const userPrompt = 'Title: ' + (rawData.title || savedEvent.title) + '\nDate: ' + (rawData.date || savedEvent.date) + '\nTime: ' + (rawData.time || 'all day') + '\nDescription: ' + (rawData.description || savedEvent.description || 'N/A');

        const model = typeof NvidiaConfig !== 'undefined'
            ? NvidiaConfig.getStoredModel()
            : 'meta/llama-3.1-8b-instruct';

        this.showAiSkeleton(true);
        this.pendingAiResult = savedEvent.id;
        const controller = new AbortController();
        this._aiTimeoutId = setTimeout(function() {
            controller.abort();
        }, 15000);

        const unlockModal = function() {
            controller.abort();
            clearTimeout(this._aiTimeoutId);
            noAi(false);
        }.bind(this);
        this.elements.closeEventModal._aiUnlock = unlockModal;
        this.elements.cancelEvent._aiUnlock = unlockModal;
        const origClose = this.elements.closeEventModal.click;
        if (!origClose._patched) {
            this.elements.closeEventModal.addEventListener('click', function(e) {
                if (this.elements.saveEvent.disabled && this.elements.closeEventModal._aiUnlock) {
                    this.elements.closeEventModal._aiUnlock();
                }
            }.bind(this));
            this.elements.closeEventModal._patched = true;
        }
        const origCancel = this.elements.cancelEvent.click;
        if (!origCancel._patched) {
            this.elements.cancelEvent.addEventListener('click', function(e) {
                if (this.elements.saveEvent.disabled && this.elements.cancelEvent._aiUnlock) {
                    this.elements.cancelEvent._aiUnlock();
                }
            }.bind(this));
            this.elements.cancelEvent._patched = true;
        }

        try {
            const completion = typeof NvidiaConfig !== 'undefined'
                ? await NvidiaConfig.postChatCompletion({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 200
                }, { apiKey: apiKey, signal: controller.signal })
                : {
                    response: await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + apiKey
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
                            ],
                            temperature: 0.1,
                            max_tokens: 200
                        }),
                        signal: controller.signal
                    })
                };

            const response = completion.response;

            clearTimeout(this._aiTimeoutId);

            if (!response.ok) {
                throw new Error('API error: ' + response.status);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            const result = JSON.parse(content);

            if (result.importance && result.suggestedBlock) {
                this.pendingAiValues = {
                    importance: result.importance,
                    block: result.suggestedBlock,
                    aiAnalyzed: true
                };
                this.showAiSuggestion(result.importance, result.suggestedBlock, result.reason);
            } else {
                noAi();
            }
        } catch (error) {
            clearTimeout(this._aiTimeoutId);
            if (error.name === 'AbortError') { noAi(true); return; }
            console.error('AI analysis failed:', error);
            noAi();
        }
    },

    showAiSkeleton(show) {
        const el = this.elements.aiSkeleton;
        if (!el) return;
        el.style.display = show ? 'flex' : 'none';
        if (show && !el.querySelector('.ai-skeleton-dismiss')) {
            const dismissBtn = document.createElement('button');
            dismissBtn.className = 'ai-skeleton-dismiss';
            dismissBtn.textContent = '×';
            dismissBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#9ca3af;line-height:1;z-index:10;';
            dismissBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.elements.cancelEvent && this.elements.cancelEvent._aiUnlock) {
                    this.elements.cancelEvent._aiUnlock();
                }
            });
            el.style.position = 'relative';
            el.appendChild(dismissBtn);
        }
        if (!show) {
            const dismiss = el.querySelector('.ai-skeleton-dismiss');
            if (dismiss) dismiss.remove();
        }
    },

    showAiSuggestion(importance, block, reason) {
        this.showAiSkeleton(false);
        this.elements.saveEvent.disabled = false;
        this.elements.saveEvent.textContent = 'Add Event';

        const suggestion = this.elements.aiSuggestion;
        if (!suggestion) return;

        const impMap = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
        const blockMap = { focus: '🎯 Focus', personal: '📚 Personal', recovery: '🧘 Recovery' };

        const el = this.elements.aiSuggestionText;
        if (el) {
            el.innerHTML = '<span style="background:#f3f4f6;padding:4px 12px;border-radius:6px;font-weight:600;">' + (impMap[importance] || importance) + '</span> <span style="background:#f3f4f6;padding:4px 12px;border-radius:6px;font-weight:600;">' + (blockMap[block] || block) + '</span> <span style="color:#6b7280;font-size:0.85rem;">' + (reason || '') + '</span>';
        }

        // Pre-fill the form fields with AI suggestion for preview
        if (this.elements.eventImportance.value !== importance) {
            this.elements.eventImportance.value = importance;
        }
        if (this.elements.eventBlock.value !== block) {
            this.elements.eventBlock.value = block;
        }

        suggestion.style.display = 'block';
    },

    acceptAiSuggestion() {
        const eventId = this.elements.eventId.value;
        if (eventId && this.pendingAiValues) {
            Storage.updateCalendarEvent(eventId, this.pendingAiValues);
            this.loadEvents();
            this.render();
        }
        this.elements.aiSuggestion.style.display = 'none';
        this.pendingAiResult = null;
        this.pendingAiValues = null;
        this.hideEventModal();
        this.elements.saveEvent.disabled = false;
        this.elements.saveEvent.textContent = 'Add Event';
    },

    rejectAiSuggestion() {
        const eventId = this.elements.eventId.value;
        if (eventId) {
            Storage.updateCalendarEvent(eventId, { aiAnalyzed: false });
        }
        this.elements.aiSuggestion.style.display = 'none';
        this.pendingAiResult = null;
        this.pendingAiValues = null;
        this.hideEventModal();
        this.elements.saveEvent.disabled = false;
        this.elements.saveEvent.textContent = 'Add Event';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Calendar.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
}
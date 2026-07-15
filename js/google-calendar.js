const GoogleCalendar = {
  CLIENT_ID: '255025772243-nmsk5afr14rgitlv3uj64goo0r8fuc90.apps.googleusercontent.com',
  SCOPE: 'https://www.googleapis.com/auth/calendar',
  accessToken: null,
  tokenExpiry: null,
  tokenClient: null,
  elements: {},
  importInProgress: false,

  init() {
    const btn = document.getElementById('importGoogleCalendar');
    const status = document.getElementById('googleCalStatus');
    if (!btn) return;
    this.elements = { btn, status };
    btn.addEventListener('click', () => this.startImport());
    this.updateStatus('Ready', 'idle');
    SyncEngine.onChanges(() => this.updateSyncStatusUI());
    this.updateSyncStatusUI();
  },

  initTokenClient() {
    if (typeof google === 'undefined' || !google.accounts) {
      this.updateStatus('Google API not loaded. Refresh the page.', 'error');
      return false;
    }
    if (this.tokenClient) return true;
    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPE,
        callback: (response) => this.handleTokenResponse(response),
        error_callback: (error) => {
          this.updateStatus('Authentication failed. Please try again.', 'error');
          this.importInProgress = false;
          this.elements.btn.disabled = false;
          this.elements.btn.textContent = 'Import from Google Calendar';
        }
      });
      return true;
    } catch (e) {
      this.updateStatus('Failed to initialize Google Calendar.', 'error');
      return false;
    }
  },

  handleTokenResponse(response) {
    if (response.error) {
      this.updateStatus('Access denied: ' + response.error, 'error');
      this.importInProgress = false;
      this.elements.btn.disabled = false;
      this.elements.btn.textContent = 'Import from Google Calendar';
      return;
    }
    this.accessToken = response.access_token;
    this.tokenExpiry = Date.now() + (response.expires_in * 1000);
    SyncEngine.updateSyncStatus('google', { status: 'synced' });
    this.updateSyncStatusUI();
    this.fetchAndImportEvents();
    this.replayOfflineQueue();
  },

  isTokenValid() {
    return this.accessToken && Date.now() < this.tokenExpiry - 60000;
  },

  async startImport() {
    if (this.importInProgress) return;
    this.importInProgress = true;
    this.elements.btn.disabled = true;
    this.elements.btn.textContent = 'Connecting...';

    if (!this.initTokenClient()) {
      this.importInProgress = false;
      this.elements.btn.disabled = false;
      this.elements.btn.textContent = 'Import from Google Calendar';
      return;
    }

    if (this.isTokenValid()) {
      this.elements.btn.textContent = 'Fetching events...';
      await this.fetchAndImportEvents();
    } else {
      this.elements.btn.textContent = 'Sign in to Google...';
      this.tokenClient.requestAccessToken();
    }
  },

  async fetchAndImportEvents() {
    if (!this.isTokenValid()) {
      this.updateStatus('Session expired. Please try again.', 'error');
      this.importInProgress = false;
      this.elements.btn.disabled = false;
      this.elements.btn.textContent = 'Import from Google Calendar';
      return;
    }

    this.elements.btn.textContent = 'Importing...';
    this.updateStatus('Fetching your events...', 'loading');

    try {
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 7);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 30);

      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('maxResults', '100');
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('timeMin', timeMin.toISOString());
      url.searchParams.set('timeMax', timeMax.toISOString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'HTTP ' + response.status);
      }

      const data = await response.json();
      const items = data.items || [];
      this.importEvents(items);
    } catch (error) {
      this.updateStatus('Failed to import: ' + error.message, 'error');
      this.importInProgress = false;
      this.elements.btn.disabled = false;
      this.elements.btn.textContent = 'Import from Google Calendar';
    }
  },

  async fetchCalendarList() {
    if (!this.isTokenValid()) return [];
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': 'Bearer ' + this.accessToken }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      return (data.items || []).map(function(cal) {
        return { id: cal.id, summary: cal.summary, accessRole: cal.accessRole, primary: cal.primary || false };
      });
    } catch (e) {
      return [];
    }
  },

  async syncDown(calendarId) {
    if (!this.isTokenValid()) return { events: [], nextSyncToken: null };
    calendarId = calendarId || 'primary';

    const syncToken = SyncEngine.getSyncToken('google', calendarId);
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events');
    url.searchParams.set('maxResults', '250');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('showDeleted', 'true');
    if (syncToken) url.searchParams.set('syncToken', syncToken);

    let allEvents = [];
    let pageToken = null;

    do {
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      else url.searchParams.delete('pageToken');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + this.accessToken }
      });

      if (!response.ok) {
        if (response.status === 410) {
          SyncEngine.saveSyncToken('google', calendarId, null);
          return this.syncDown(calendarId);
        }
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();
      allEvents = allEvents.concat(data.items || []);
      pageToken = data.nextPageToken || null;

      if (!pageToken && data.nextSyncToken) {
        SyncEngine.saveSyncToken('google', calendarId, data.nextSyncToken);
      }
    } while (pageToken);

    for (const ge of allEvents) {
      const localEvent = SyncEngine.getEvents({ provider: 'google', providerEventId: ge.id })[0];
      if (ge.status === 'cancelled') {
        if (localEvent) SyncEngine.deleteEvent(localEvent.id);
        continue;
      }
      if (localEvent) {
        const remoteUpdated = new Date(ge.updated).getTime();
        if (SyncEngine.detectConflict(localEvent, { updatedAt: remoteUpdated })) {
          SyncEngine.updateEvent(localEvent.id, {
            syncState: 'conflict',
            remoteSnapshot: {
              title: ge.summary || 'Untitled',
              description: ge.description || '',
              location: ge.location || '',
              start: ge.start.dateTime || ge.start.date + 'T00:00:00',
              end: ge.end.dateTime || (ge.end.date || ge.start.date) + 'T23:59:59',
              allDay: !!ge.start.date
            }
          });
        } else {
          SyncEngine.updateEvent(localEvent.id, {
            title: ge.summary || 'Untitled',
            description: ge.description || '',
            location: ge.location || '',
            start: ge.start.dateTime || ge.start.date + 'T00:00:00',
            end: ge.end.dateTime || (ge.end.date || ge.start.date) + 'T23:59:59',
            allDay: !!ge.start.date,
            syncState: 'synced',
            lastSynced: Date.now()
          });
        }
      } else {
        const event = SyncEngine.createEvent({
          provider: 'google',
          providerEventId: ge.id,
          calendarId: calendarId,
          title: ge.summary || 'Untitled',
          description: ge.description || '',
          location: ge.location || '',
          start: ge.start.dateTime || ge.start.date + 'T00:00:00',
          end: ge.end.dateTime || (ge.end.date || ge.start.date) + 'T23:59:59',
          allDay: !!ge.start.date,
          syncState: 'synced'
        });
        SyncEngine.addEvent(event);
      }
    }

    return { events: allEvents, nextSyncToken: SyncEngine.getSyncToken('google', 'primary') };
  },

  async syncUp(events, calendarId) {
    if (!this.isTokenValid()) throw new Error('Not authenticated');
    calendarId = calendarId || 'primary';

    const results = [];
    for (const event of events) {
      try {
        if (event.deleted && event.providerEventId) {
          await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events/' + event.providerEventId,
            { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + this.accessToken } }
          );
          results.push({ id: event.id, status: 'deleted' });
        } else if (event.providerEventId) {
          const body = this.toGoogleEvent(event);
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events/' + event.providerEventId,
            {
              method: 'PUT',
              headers: { 'Authorization': 'Bearer ' + this.accessToken, 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            }
          );
          if (response.ok) results.push({ id: event.id, status: 'updated' });
        } else {
          const body = this.toGoogleEvent(event);
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events',
            {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + this.accessToken, 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            }
          );
          if (response.ok) {
            const created = await response.json();
            results.push({ id: event.id, providerEventId: created.id, status: 'created' });
          }
        }
      } catch (e) {
        results.push({ id: event.id, status: 'error', error: e.message });
      }
    }
    return results;
  },

  toGoogleEvent(event) {
    const body = {
      summary: event.title,
      description: event.description || '',
      extendedProperties: { private: { blockflowId: event.id } }
    };
    if (event.allDay) {
      body.start = { date: event.start.split('T')[0] };
      body.end = { date: event.end.split('T')[0] };
    } else {
      body.start = { dateTime: event.start };
      body.end = { dateTime: event.end };
    }
    return body;
  },

  importEvents(googleEvents) {
    if (googleEvents.length === 0) {
      this.updateStatus('No events found in your Google Calendar for the next 30 days.', 'idle');
      this.importInProgress = false;
      this.elements.btn.disabled = false;
      this.elements.btn.textContent = 'Import from Google Calendar';
      return;
    }

    const existing = SyncEngine.getEvents({ provider: 'google' });
    const existingIds = new Set();
    existing.forEach(function(e) { if (e.providerEventId) existingIds.add(e.providerEventId); });

    let imported = 0;
    let skipped = 0;

    googleEvents.forEach(function(ge) {
      if (existingIds.has(ge.id)) { skipped++; return; }

      let start, end, allDay = false;
      if (ge.start && ge.start.dateTime) {
        start = ge.start.dateTime;
        end = ge.end && ge.end.dateTime ? ge.end.dateTime : new Date(new Date(start).getTime() + 3600000).toISOString();
      } else if (ge.start && ge.start.date) {
        start = ge.start.date + 'T00:00:00';
        end = (ge.end && ge.end.date ? ge.end.date : ge.start.date) + 'T23:59:59';
        allDay = true;
      } else {
        return;
      }

      var event = SyncEngine.createEvent({
        provider: 'google',
        providerEventId: ge.id,
        calendarId: 'primary',
        title: ge.summary || 'Untitled',
        description: ge.description || '',
        location: ge.location || '',
        start: start,
        end: end,
        allDay: allDay,
        importance: 'medium',
        block: 'focus',
        syncState: 'synced'
      });

      SyncEngine.addEvent(event);
      imported++;
    });

    const msg = imported + ' event' + (imported !== 1 ? 's' : '') + ' imported' +
      (skipped > 0 ? ' (' + skipped + ' already imported)' : '') +
      ' from your Google Calendar.';
    this.updateStatus(msg, 'success');
    this.importInProgress = false;
    this.elements.btn.disabled = false;
    this.elements.btn.textContent = 'Import from Google Calendar';

    if (typeof Calendar !== 'undefined' && Calendar.loadEvents) {
      Calendar.loadEvents();
      Calendar.render();
    }
  },

  async replayOfflineQueue() {
    if (!this.isTokenValid()) return;
    const pending = SyncEngine.getPendingOperations('google');
    if (pending.length === 0) return;

    for (const op of pending) {
      try {
        const event = SyncEngine.getEvent(op.eventId);
        if (!event) { SyncEngine.completeOperation(op.id); continue; }
        const calId = event.calendarId || 'primary';

        if (op.type === 'delete' || (op.type === 'update' && event.deleted)) {
          if (event.providerEventId) {
            await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events/' + event.providerEventId,
              { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + this.accessToken } }
            );
          }
          SyncEngine.hardDeleteEvent(op.eventId);
        } else if (op.type === 'update') {
          if (event.providerEventId) {
            const body = this.toGoogleEvent(event);
            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events/' + event.providerEventId,
              {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + this.accessToken, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              }
            );
            if (response.ok) {
              SyncEngine.updateEvent(op.eventId, { syncState: 'synced', lastSynced: Date.now() });
            }
          }
        } else if (op.type === 'create') {
          const body = this.toGoogleEvent(event);
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events',
            {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + this.accessToken, 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            }
          );
          if (response.ok) {
            const created = await response.json();
            SyncEngine.updateEvent(op.eventId, {
              providerEventId: created.id,
              syncState: 'synced',
              lastSynced: Date.now()
            });
          }
        }
        SyncEngine.completeOperation(op.id);
      } catch (e) {
        SyncEngine.failOperation(op.id);
      }
    }
  },

  updateStatus(text, type) {
    const el = this.elements.status;
    if (!el) return;
    el.textContent = text;
    el.className = 'google-cal-status';
    if (type === 'success') el.className += ' google-cal-success';
    else if (type === 'error') el.className += ' google-cal-error';
    else if (type === 'loading') el.className += ' google-cal-loading';
  },

  updateSyncStatusUI() {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const status = SyncEngine.getSyncStatus('google');
    const conflicts = SyncEngine.getConflicts();
    const pending = SyncEngine.getPendingOperations('google');

    let statusClass = 'sync-status';
    let statusText = 'Disconnected';
    let statusTime = '';

    if (conflicts.length > 0) {
      statusClass += ' conflict';
      statusText = conflicts.length + ' conflict' + (conflicts.length !== 1 ? 's' : '') + ' need resolution';
    } else if (pending.length > 0) {
      statusClass += ' syncing';
      statusText = 'Syncing ' + pending.length + ' change' + (pending.length !== 1 ? 's' : '') + '...';
    } else if (status.status === 'synced') {
      statusClass += ' synced';
      statusText = 'Synced';
    } else if (status.status === 'error') {
      statusClass += ' error';
      statusText = 'Sync error';
    } else if (!navigator.onLine) {
      statusClass += ' offline';
      statusText = 'Offline — changes will sync when reconnected';
    } else {
      statusClass += ' synced';
      statusText = 'Ready to sync';
    }

    if (status.lastSynced) {
      const diff = Date.now() - status.lastSynced;
      if (diff < 60000) statusTime = 'Just now';
      else if (diff < 3600000) statusTime = Math.floor(diff / 60000) + 'm ago';
      else statusTime = Math.floor(diff / 3600000) + 'h ago';
    }

    el.className = statusClass;
    el.style.display = 'flex';
    el.querySelector('.sync-status-text').textContent = statusText;
    el.querySelector('.sync-status-time').textContent = statusTime;
  },

  async syncAllCalendars() {
    if (!this.isTokenValid()) return;
    const calendars = this.getSelectedCalendars();
    for (const cal of calendars) {
      await this.syncDown(cal.id);
    }
    this.updateSyncStatusUI();
    if (typeof Calendar !== 'undefined' && Calendar.loadEvents) {
      Calendar.loadEvents();
      Calendar.render();
    }
  },

  getSelectedCalendars() {
    try {
      return JSON.parse(localStorage.getItem('blockflow_selected_calendars') || '[]');
    } catch (e) {
      return [];
    }
  },

  saveSelectedCalendars(calendars) {
    localStorage.setItem('blockflow_selected_calendars', JSON.stringify(calendars));
  },

  async renderCalendarSelector() {
    const container = document.getElementById('calendarSelector');
    if (!container) return;

    const calendars = await this.fetchCalendarList();
    const selected = this.getSelectedCalendars();
    const selectedIds = new Set(selected.map(function(c) { return c.id; }));

    let html = '<div class="calendar-selector-header"><span>Select calendars to sync</span></div>';
    html += '<div class="calendar-selector-list">';

    for (const cal of calendars) {
      const checked = selectedIds.has(cal.id) ? 'checked' : '';
      html += '<label class="calendar-selector-item">' +
        '<input type="checkbox" value="' + cal.id + '" data-name="' + (cal.summary || '') + '" ' + checked + '>' +
        '<span class="calendar-selector-name">' + (cal.summary || cal.id) + '</span>' +
        (cal.primary ? '<span class="calendar-selector-badge">Primary</span>' : '') +
        '</label>';
    }

    html += '</div>';
    html += '<div class="calendar-selector-actions">' +
      '<button id="saveCalendarSelection" class="btn btn-primary btn-sm">Save Selection</button>' +
      '</div>';

    container.innerHTML = html;

    var self = this;
    document.getElementById('saveCalendarSelection').addEventListener('click', function() {
      var checkboxes = container.querySelectorAll('input[type="checkbox"]');
      var newSelected = [];
      checkboxes.forEach(function(cb) {
        if (cb.checked) {
          newSelected.push({ id: cb.value, name: cb.dataset.name });
        }
      });
      self.saveSelectedCalendars(newSelected);
      self.updateStatus('Calendar selection saved. Click "Sync with Google" to sync selected calendars.', 'success');
    });

    container.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('importGoogleCalendar')) {
    GoogleCalendar.init();
  }
});

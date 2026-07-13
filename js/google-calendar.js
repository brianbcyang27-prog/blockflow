const GoogleCalendar = {
  CLIENT_ID: '255025772243-nmsk5afr14rgitlv3uj64goo0r8fuc90.apps.googleusercontent.com',
  SCOPE: 'https://www.googleapis.com/auth/calendar.readonly',
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
    this.fetchAndImportEvents();
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

  importEvents(googleEvents) {
    if (googleEvents.length === 0) {
      this.updateStatus('No events found in your Google Calendar for the next 30 days.', 'idle');
      this.importInProgress = false;
      this.elements.btn.disabled = false;
      this.elements.btn.textContent = 'Import from Google Calendar';
      return;
    }

    const existing = Storage.getCalendarEvents();
    const existingIds = new Set();
    existing.forEach(e => {
      if (e.googleEventId) existingIds.add(e.googleEventId);
    });

    let imported = 0;
    let skipped = 0;

    googleEvents.forEach(ge => {
      if (existingIds.has(ge.id)) {
        skipped++;
        return;
      }

      let eventDate, eventTime, eventEndTime;

      if (ge.start?.dateTime) {
        const d = new Date(ge.start.dateTime);
        eventDate = d.toISOString().split('T')[0];
        eventTime = d.toTimeString().slice(0, 5);
        if (ge.end?.dateTime) {
          const ed = new Date(ge.end.dateTime);
          eventEndTime = ed.toTimeString().slice(0, 5);
        }
      } else if (ge.start?.date) {
        eventDate = ge.start.date;
        eventTime = '';
        eventEndTime = '';
      }

      if (!eventDate) return;

      const now = Date.now();
      const newEvent = {
        id: 'gcal_' + now + '_' + Math.random().toString(36).slice(2, 6),
        title: ge.summary || 'Untitled',
        date: eventDate,
        time: eventTime || '',
        endTime: eventEndTime || '',
        description: ge.description || '',
        importance: 'medium',
        block: 'focus',
        aiAnalyzed: false,
        googleEventId: ge.id,
        googleLink: ge.htmlLink || '',
        createdAt: now
      };

      existing.push(newEvent);
      imported++;
    });

    Storage.saveCalendarEvents(existing);

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

  updateStatus(text, type) {
    const el = this.elements.status;
    if (!el) return;
    el.textContent = text;
    el.className = 'google-cal-status';
    if (type === 'success') el.className += ' google-cal-success';
    else if (type === 'error') el.className += ' google-cal-error';
    else if (type === 'loading') el.className += ' google-cal-loading';
  }
};

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('importGoogleCalendar')) {
    GoogleCalendar.init();
  }
});

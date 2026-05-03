// Google Calendar integration using GIS (Google Identity Services)

const WEB_CLIENT_ID = '8236214312-3hv3idbm089p7ierbl83f946g65eeju7.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

let tokenClient = null;
let accessToken = null;

// Load gapi calendar
export function loadGapi() {
  return new Promise((resolve) => {
    if (typeof gapi === 'undefined') { resolve(false); return; }
    gapi.load('client', async () => {
      try {
        await gapi.client.init({ discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'] });
        resolve(true);
      } catch { resolve(false); }
    });
  });
}

// Initialize the GIS token client
export function initGoogleAuth(callback) {
  if (typeof google === 'undefined') return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: WEB_CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.access_token) {
        accessToken = resp.access_token;
        localStorage.setItem('gc_token', resp.access_token);
        localStorage.setItem('gc_token_expiry', Date.now() + (resp.expires_in - 60) * 1000);
        callback && callback(true, resp.access_token);
      } else {
        callback && callback(false);
      }
    },
  });
}

export function signIn(callback) {
  const stored = localStorage.getItem('gc_token');
  const expiry = parseInt(localStorage.getItem('gc_token_expiry') || '0');
  if (stored && Date.now() < expiry) {
    accessToken = stored;
    callback && callback(true, stored);
    return;
  }
  if (!tokenClient) { initGoogleAuth(callback); }
  tokenClient?.requestAccessToken({ prompt: '' });
}

export function signOut() {
  if (accessToken) google.accounts.oauth2.revoke(accessToken);
  accessToken = null;
  localStorage.removeItem('gc_token');
  localStorage.removeItem('gc_token_expiry');
}

export function isSignedIn() {
  const token = localStorage.getItem('gc_token');
  const expiry = parseInt(localStorage.getItem('gc_token_expiry') || '0');
  return !!(token && Date.now() < expiry);
}

async function apiCall(method, path, body) {
  const token = accessToken || localStorage.getItem('gc_token');
  if (!token) throw new Error('Not authenticated');
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${CALENDAR_API}${path}`, opts);
  if (method === 'DELETE' && res.status === 204) return {};
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ──────────────── FIND EXISTING STUDY REMINDERS ────────────────

const STUDY_EVENT_MARKER = '📚 Study Time';

// Search for existing StudySync reminders in the calendar
export async function findExistingReminder() {
  const now = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const path = `/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${future.toISOString()}&q=${encodeURIComponent(STUDY_EVENT_MARKER)}&singleEvents=false&maxResults=10`;
  const result = await apiCall('GET', path);
  return (result.items || []).filter(e =>
    e.summary && e.summary.includes(STUDY_EVENT_MARKER)
  );
}

// Delete a calendar event by ID
export async function deleteCalendarEvent(eventId) {
  return apiCall('DELETE', `/calendars/primary/events/${eventId}`);
}

// ──────────────── CREATE STUDY REMINDER ────────────────

// durationDays: 7, 14, 30, 60, 90, or custom number
// durationDays: 7, 14, 30, 60, 90, or custom number
// startDate/endDate: optional ISO strings for custom date range (e.g. '2026-06-01' to '2027-05-31')
export async function createDailyStudyReminder({ studyTime, quotaHours, durationDays = 30, startDate, endDate }) {
  const [hours, minutes] = studyTime.split(':').map(Number);

  let start, untilDate;

  if (startDate && endDate) {
    // Custom date range mode
    start = new Date(startDate);
    start.setHours(hours, minutes, 0, 0);
    untilDate = new Date(endDate);
    untilDate.setHours(23, 59, 59, 0);
  } else {
    // Duration mode (from today)
    start = new Date();
    start.setHours(hours, minutes, 0, 0);
    if (start < new Date()) start.setDate(start.getDate() + 1);
    untilDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  const end = new Date(start.getTime() + quotaHours * 60 * 60 * 1000);
  const until = untilDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const totalDays = Math.round((untilDate - start) / (24 * 60 * 60 * 1000));
  const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const endLabel = untilDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const event = {
    summary: `${STUDY_EVENT_MARKER} — ${quotaHours}hr Goal`,
    description: `Daily study session (${totalDays} days). Target: ${quotaHours} hours.\nPeriod: ${startLabel} → ${endLabel}.\nCreated by StudySync.`,
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    recurrence: [`RRULE:FREQ=DAILY;UNTIL=${until}`],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 5 },
        { method: 'email', minutes: 30 },
      ],
    },
    colorId: '11',
  };

  const result = await apiCall('POST', '/calendars/primary/events', event);
  localStorage.setItem('studysync_reminder_id', result.id);
  return result;
}

// ──────────────── ONE-OFF REMINDER ────────────────

export async function createStudyReminder({ title, description, dateTime, reminderMinutes = 10 }) {
  const start = new Date(dateTime);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const event = {
    summary: title,
    description,
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes },
        { method: 'email', minutes: reminderMinutes + 5 },
      ],
    },
    colorId: '9',
  };

  return apiCall('POST', '/calendars/primary/events', event);
}

// ──────────────── LOG STUDY SESSION ────────────────

export async function logStudySession({ subject, duration, notes }) {
  const now = new Date();
  const start = new Date(now.getTime() - duration * 1000);

  const event = {
    summary: `✅ Studied: ${subject || 'General Study'} (${formatDuration(duration)})`,
    description: notes ? `Notes: ${notes}` : 'Study session completed via StudySync.',
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: now.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    colorId: '2',
  };

  return apiCall('POST', '/calendars/primary/events', event);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// LocalStorage helpers
const LS = {
  get: (key, def = null) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
};

// Date helpers
export const todayKey = () => new Date().toISOString().split('T')[0];
export const dateKey = (d) => new Date(d).toISOString().split('T')[0];

// ===== SETTINGS =====
const DEFAULT_SETTINGS = {
  quotaHours: 2,
  studyDays: [1,2,3,4,5], // Mon-Fri
  defaultSubject: '',
  reminderTime: '09:00',
  theme: 'dark',
  gcConnected: false,
};

export function getSettings() { return { ...DEFAULT_SETTINGS, ...LS.get('settings', {}) }; }
export function saveSettings(s) { LS.set('settings', s); }

// ===== STUDY SESSIONS =====
export function getSessions(dateStr = todayKey()) {
  const all = LS.get('sessions', {});
  return all[dateStr] || [];
}

export function getAllSessions() { return LS.get('sessions', {}); }

export function addSession(session) {
  const all = LS.get('sessions', {});
  const key = dateKey(session.startTime);
  if (!all[key]) all[key] = [];
  all[key].push({ id: Date.now(), ...session });
  LS.set('sessions', all);
  return all[key];
}

export function getTodayStudySeconds() {
  const sessions = getSessions();
  return sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
}

export function getStreakDays() {
  const all = LS.get('sessions', {});
  const settings = getSettings();
  let streak = 0;
  const d = new Date();
  // Check yesterday first (today might not be done yet)
  d.setDate(d.getDate() - 1);
  while (true) {
    const key = dateKey(d);
    const daySessions = all[key] || [];
    const daySeconds = daySessions.reduce((a, s) => a + (s.duration || 0), 0);
    const quotaSeconds = settings.quotaHours * 3600;
    if (daySeconds >= quotaSeconds) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

export function getWeeklyStats() {
  const all = LS.get('sessions', {});
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const sessions = all[key] || [];
    const seconds = sessions.reduce((a, s) => a + (s.duration || 0), 0);
    result.push({ date: key, label: d.toLocaleDateString('en', { weekday: 'short' }), seconds });
  }
  return result;
}

// ===== CHECKLIST =====
export function getChecklist(dateStr = todayKey()) {
  const all = LS.get('checklists', {});
  return all[dateStr] || [];
}

export function saveChecklist(items, dateStr = todayKey()) {
  const all = LS.get('checklists', {});
  all[dateStr] = items;
  LS.set('checklists', all);
}

export function addChecklistItem(text, dateStr = todayKey()) {
  const items = getChecklist(dateStr);
  const newItem = { id: Date.now(), text, done: false, createdAt: new Date().toISOString() };
  items.push(newItem);
  saveChecklist(items, dateStr);
  return items;
}

export function toggleChecklistItem(id, dateStr = todayKey()) {
  const items = getChecklist(dateStr).map(i => i.id === id ? { ...i, done: !i.done } : i);
  saveChecklist(items, dateStr);
  return items;
}

export function deleteChecklistItem(id, dateStr = todayKey()) {
  const items = getChecklist(dateStr).filter(i => i.id !== id);
  saveChecklist(items, dateStr);
  return items;
}

// ===== REMINDERS =====
export function getReminders() { return LS.get('reminders', []); }
export function addReminder(r) {
  const list = getReminders();
  const newR = { id: Date.now(), ...r, createdAt: new Date().toISOString() };
  list.push(newR);
  LS.set('reminders', list);
  return list;
}
export function deleteReminder(id) {
  const list = getReminders().filter(r => r.id !== id);
  LS.set('reminders', list);
  return list;
}

// ===== JOURNAL =====
export function getJournalEntry(dateStr = todayKey()) {
  const all = LS.get('journal', {});
  return all[dateStr] || { text: '', subject: '', mood: null, tags: [] };
}

export function saveJournalEntry(entry, dateStr = todayKey()) {
  const all = LS.get('journal', {});
  all[dateStr] = { ...entry, updatedAt: new Date().toISOString() };
  LS.set('journal', all);
}

export function getAllJournalEntries() { return LS.get('journal', {}); }

// ===== NOTES (files stored as base64 in localStorage) =====
export function getNotes() { return LS.get('notes', []); }

export function addNote(note) {
  const notes = getNotes();
  const newNote = { id: Date.now(), ...note, createdAt: new Date().toISOString() };
  notes.unshift(newNote);
  LS.set('notes', notes);
  return notes;
}

export function deleteNote(id) {
  const notes = getNotes().filter(n => n.id !== id);
  LS.set('notes', notes);
  return notes;
}

// ===== EXPORT ALL DATA =====
export function exportData() {
  const data = {
    settings: getSettings(),
    sessions: getAllSessions(),
    checklists: LS.get('checklists', {}),
    reminders: getReminders(),
    journal: getAllJournalEntries(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `studysync-backup-${todayKey()}.json`;
  a.click(); URL.revokeObjectURL(url);
}

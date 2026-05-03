import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../services/storage'
import { signIn, signOut, isSignedIn, createDailyStudyReminder, findExistingReminder, deleteCalendarEvent } from '../services/googleCalendar'
import { syncStudyDataToDrive, restoreStudyDataFromDrive, initFolderStructure } from '../services/googleDrive'
import { useToast } from '../context/ToastContext'
import { Save, Calendar, LogOut, Bell, Clock, Trash2, Download, Cloud, RefreshCw, AlertTriangle } from 'lucide-react'
import { exportData } from '../services/storage'
import './Settings.css'

const DURATION_OPTIONS = [
  { value: 7, label: '1 Week' },
  { value: 14, label: '2 Weeks' },
  { value: 30, label: '1 Month' },
  { value: 60, label: '2 Months' },
  { value: 90, label: '3 Months' },
  { value: 0, label: 'Custom' },
]

function toDateStr(d) { return d.toISOString().split('T')[0] }
function addMonths(d, m) { const n = new Date(d); n.setMonth(n.getMonth() + m); return n }

export default function Settings() {
  const [settings, setSettings] = useState(getSettings())
  const [gcConnected, setGcConnected] = useState(isSignedIn())
  const [studyTime, setStudyTime] = useState('09:00')
  const [durationDays, setDurationDays] = useState(30)
  const [customDays, setCustomDays] = useState(30)
  const [reminderMode, setReminderMode] = useState('duration') // 'duration' or 'daterange'
  const [rangeStart, setRangeStart] = useState(toDateStr(new Date()))
  const [rangeEnd, setRangeEnd] = useState(toDateStr(addMonths(new Date(), 1)))
  const [existingReminders, setExistingReminders] = useState([])
  const [loadingReminders, setLoadingReminders] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setGcConnected(isSignedIn())
    if (isSignedIn()) checkExistingReminders()
  }, [])

  const checkExistingReminders = async () => {
    setLoadingReminders(true)
    try {
      const reminders = await findExistingReminder()
      setExistingReminders(reminders)
    } catch { /* ignore */ }
    setLoadingReminders(false)
  }

  const handleDeleteReminder = async (eventId) => {
    try {
      await deleteCalendarEvent(eventId)
      setExistingReminders(r => r.filter(e => e.id !== eventId))
      toast('Reminder deleted from Google Calendar', 'info')
    } catch (e) { toast('Failed to delete: ' + e.message, 'error') }
  }

  const save = () => {
    saveSettings(settings)
    toast('Settings saved!', 'success')
  }

  const connectGoogle = () => {
    signIn((success) => {
      if (success) {
        setGcConnected(true)
        saveSettings({ ...settings, gcConnected: true })
        toast('Google Calendar connected! 🎉', 'success')
      } else {
        toast('Google sign-in failed', 'error')
      }
    })
  }

  const disconnectGoogle = () => {
    signOut()
    setGcConnected(false)
    toast('Disconnected from Google Calendar', 'info')
  }

  const setupDailyReminder = async () => {
    if (!gcConnected) { toast('Connect Google Calendar first', 'error'); return }

    if (reminderMode === 'daterange') {
      if (!rangeStart || !rangeEnd) { toast('Select both start and end dates', 'error'); return }
      if (new Date(rangeEnd) <= new Date(rangeStart)) { toast('End date must be after start date', 'error'); return }
      try {
        await createDailyStudyReminder({ studyTime, quotaHours: settings.quotaHours, startDate: rangeStart, endDate: rangeEnd })
        const totalDays = Math.round((new Date(rangeEnd) - new Date(rangeStart)) / (24*60*60*1000))
        toast(`Reminder set for ${totalDays} days (${rangeStart} → ${rangeEnd})! 📅`, 'success')
        checkExistingReminders()
      } catch (e) { toast('Failed: ' + e.message, 'error') }
    } else {
      const days = durationDays === 0 ? customDays : durationDays
      if (days < 1 || days > 365) { toast('Duration must be 1–365 days', 'error'); return }
      try {
        await createDailyStudyReminder({ studyTime, quotaHours: settings.quotaHours, durationDays: days })
        toast(`Daily reminder created for ${days} days! 📅`, 'success')
        checkExistingReminders()
      } catch (e) { toast('Failed: ' + e.message, 'error') }
    }
  }

  const clearAll = () => {
    if (!confirm('Are you sure? This will delete ALL your study data!')) return
    localStorage.clear()
    toast('All data cleared', 'info')
    setTimeout(() => window.location.reload(), 1000)
  }

  return (
    <div className="page settings-page animate-fade">
      <h1 className="page-title">⚙️ Settings</h1>
      <p className="page-subtitle">Configure your study goals and integrations.</p>

      <div className="settings-grid">
        {/* Study Goals */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Clock size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="settings-card-title">Study Goals</h2>
          </div>

          <div className="setting-item">
            <div className="setting-label">Daily Study Quota</div>
            <div className="setting-desc">How many hours you want to study per day</div>
            <div className="quota-slider-wrap">
              <input type="range" min="0.5" max="8" step="0.5"
                value={settings.quotaHours}
                onChange={e => setSettings(s => ({...s, quotaHours: parseFloat(e.target.value)}))}
                className="quota-slider"
              />
              <span className="quota-value">{settings.quotaHours}h</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">Default Study Days</div>
            <div className="setting-desc">Which days do you normally study?</div>
            <div className="day-picker">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => (
                <button key={d}
                  className={`day-btn ${settings.studyDays?.includes(i) ? 'day-active' : ''}`}
                  onClick={() => setSettings(s => ({
                    ...s,
                    studyDays: s.studyDays?.includes(i)
                      ? s.studyDays.filter(x=>x!==i)
                      : [...(s.studyDays||[]), i]
                  }))}
                >{d}</button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={save}><Save size={16}/> Save Goals</button>
        </div>

        {/* Google Calendar */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Calendar size={18} style={{ color: 'var(--emerald)' }} />
            <h2 className="settings-card-title">Google Calendar</h2>
            {gcConnected && <span className="badge badge-emerald">Connected</span>}
          </div>

          <div className="setting-desc" style={{marginBottom:16}}>
            Connect your Google account to receive study reminders on your phone and sync files to your GATE PREPARATION folder in Google Drive.
          </div>

          {!gcConnected ? (
            <button className="btn btn-primary" onClick={connectGoogle}>
              <Calendar size={16}/> Connect Google Calendar
            </button>
          ) : (
            <>
              {/* Existing reminders */}
              {loadingReminders ? (
                <div className="setting-desc">Checking for existing reminders…</div>
              ) : existingReminders.length > 0 && (
                <div className="existing-reminders">
                  <div className="flex items-center gap-2" style={{marginBottom:8}}>
                    <AlertTriangle size={16} style={{color:'var(--amber)'}}/>
                    <span className="setting-label" style={{color:'var(--amber)',margin:0}}>Existing reminder{existingReminders.length > 1 ? 's' : ''} found</span>
                  </div>
                  {existingReminders.map(r => (
                    <div key={r.id} className="reminder-item">
                      <div className="reminder-info">
                        <div className="reminder-title">{r.summary}</div>
                        <div className="reminder-meta">
                          {r.recurrence?.[0]?.includes('UNTIL') && (
                            <span>Ends: {new Date(r.recurrence[0].match(/UNTIL=([^;]+)/)?.[1]?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3')).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReminder(r.id)}>
                        <Trash2 size={12}/> Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="setting-item">
                <div className="setting-label">Set Daily Study Reminder</div>
                <div className="setting-desc">Creates a recurring daily event in your Google Calendar</div>

                {/* Time picker */}
                <div className="flex gap-3 items-center" style={{marginTop:10}}>
                  <label className="setting-desc" style={{margin:0,whiteSpace:'nowrap'}}>Study time:</label>
                  <input type="time" className="input" style={{width:'140px',colorScheme:'dark'}} value={studyTime} onChange={e=>setStudyTime(e.target.value)} />
                </div>

                {/* Duration picker */}
                <div style={{marginTop:10}}>
                  <label className="setting-desc" style={{margin:0,marginBottom:6,display:'block'}}>Reminder schedule:</label>
                  <div className="view-toggle" style={{marginBottom:10,display:'inline-flex'}}>
                    <button className={`tab-btn ${reminderMode==='duration'?'tab-active':''}`} onClick={()=>setReminderMode('duration')} style={{padding:'6px 14px',fontSize:'0.78rem'}}>⏱ Duration</button>
                    <button className={`tab-btn ${reminderMode==='daterange'?'tab-active':''}`} onClick={()=>setReminderMode('daterange')} style={{padding:'6px 14px',fontSize:'0.78rem'}}>📅 Date Range</button>
                  </div>

                  {reminderMode === 'duration' ? (
                    <>
                      <div className="duration-pills">
                        {DURATION_OPTIONS.map(opt => (
                          <button key={opt.value}
                            className={`filter-pill ${durationDays===opt.value?'filter-active':''}`}
                            onClick={() => setDurationDays(opt.value)}
                          >{opt.label}</button>
                        ))}
                      </div>
                      {durationDays === 0 && (
                        <div className="flex gap-2 items-center" style={{marginTop:8}}>
                          <input type="number" className="input" min="1" max="365" value={customDays} onChange={e=>setCustomDays(parseInt(e.target.value)||1)} style={{width:80}} />
                          <span className="setting-desc" style={{margin:0}}>days</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="date-range-picker">
                      <div className="flex gap-3 items-center">
                        <div className="date-field">
                          <label className="setting-desc" style={{margin:0,fontSize:'0.72rem'}}>Start date</label>
                          <input type="date" className="input" value={rangeStart} onChange={e=>setRangeStart(e.target.value)} style={{colorScheme:'dark'}} />
                        </div>
                        <span style={{color:'var(--text-muted)',marginTop:16}}>→</span>
                        <div className="date-field">
                          <label className="setting-desc" style={{margin:0,fontSize:'0.72rem'}}>End date</label>
                          <input type="date" className="input" value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} style={{colorScheme:'dark'}} />
                        </div>
                      </div>
                      {rangeStart && rangeEnd && new Date(rangeEnd) > new Date(rangeStart) && (
                        <div className="setting-desc" style={{marginTop:6}}>
                          📅 {Math.round((new Date(rangeEnd) - new Date(rangeStart)) / (24*60*60*1000))} days total
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" style={{marginTop:12}} onClick={setupDailyReminder}>
                  <Bell size={16}/> {existingReminders.length > 0 ? 'Add Another Reminder' : 'Create Daily Reminder'}
                </button>
              </div>

              <button className="btn btn-ghost" onClick={disconnectGoogle} style={{marginTop:8}}>
                <LogOut size={16}/> Disconnect
              </button>
            </>
          )}
        </div>

        {/* Cloud Sync */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Cloud size={18} style={{ color: 'var(--cyan)' }} />
            <h2 className="settings-card-title">Cloud Sync</h2>
            {gcConnected && <span className="badge badge-emerald">Active</span>}
          </div>

          <div className="setting-desc" style={{marginBottom:12}}>
            Sync your study data to Google Drive so you can access it from any device. Files go to <strong>GATE PREPARATION</strong> folder.
          </div>

          {gcConnected ? (
            <>
              <div className="flex gap-2" style={{flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-sm" disabled={syncing} onClick={async () => {
                  setSyncing(true)
                  try {
                    await syncStudyDataToDrive()
                    toast('Study data synced to Google Drive! ☁️', 'success')
                  } catch (e) { toast('Sync failed: ' + e.message, 'error') }
                  setSyncing(false)
                }}>
                  <RefreshCw size={14} className={syncing?'animate-spin':''}/> Sync Data to Drive
                </button>
                <button className="btn btn-ghost btn-sm" disabled={syncing} onClick={async () => {
                  setSyncing(true)
                  try {
                    const data = await restoreStudyDataFromDrive()
                    if (data) {
                      toast('Data restored from Drive! Reloading…', 'success')
                      setTimeout(() => window.location.reload(), 1500)
                    } else {
                      toast('No backup found in Drive', 'info')
                    }
                  } catch (e) { toast('Restore failed: ' + e.message, 'error') }
                  setSyncing(false)
                }}>
                  <Download size={14}/> Restore from Drive
                </button>
                <button className="btn btn-ghost btn-sm" disabled={syncing} onClick={async () => {
                  setSyncing(true)
                  try {
                    await initFolderStructure()
                    toast('All subject folders created! 📁', 'success')
                  } catch (e) { toast(e.message, 'error') }
                  setSyncing(false)
                }}>
                  📁 Create All Folders
                </button>
              </div>
            </>
          ) : (
            <div className="setting-desc">Connect Google Calendar above to enable cloud sync.</div>
          )}
        </div>

        {/* Data Management */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Download size={18} style={{ color: 'var(--violet)' }} />
            <h2 className="settings-card-title">Data Management</h2>
          </div>

          <div className="setting-item">
            <div className="setting-label">Export All Data</div>
            <div className="setting-desc">Download all your study data as a JSON backup</div>
            <button className="btn btn-ghost" style={{marginTop:8}} onClick={exportData}>
              <Download size={16}/> Export Backup
            </button>
          </div>

          <div className="divider" />

          <div className="setting-item">
            <div className="setting-label" style={{color:'var(--rose)'}}>Danger Zone</div>
            <div className="setting-desc">This will permanently delete all your sessions, journal entries, and notes</div>
            <button className="btn btn-danger" style={{marginTop:8}} onClick={clearAll}>
              <Trash2 size={16}/> Clear All Data
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <span style={{fontSize:'1.2rem'}}>ℹ️</span>
            <h2 className="settings-card-title">About StudySync</h2>
          </div>
          <div className="about-grid">
            <div className="about-item"><span>Version</span><strong>1.0.0</strong></div>
            <div className="about-item"><span>Storage</span><strong>Local + Google Drive</strong></div>
            <div className="about-item"><span>Cloud Folder</span><strong>GATE PREPARATION</strong></div>
          </div>
          <div className="setting-desc" style={{marginTop:12}}>
            Data is stored locally and can be synced to your Google Drive. Files are organized by subject inside the GATE PREPARATION folder.
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Plus, Trash2, Bell, Calendar } from 'lucide-react'
import { getReminders, addReminder, deleteReminder } from '../services/storage'
import { createStudyReminder, isSignedIn } from '../services/googleCalendar'
import { useToast } from '../context/ToastContext'
import './ReminderManager.css'

export default function ReminderManager() {
  const [reminders, setReminders] = useState([])
  const [title, setTitle] = useState('')
  const [datetime, setDatetime] = useState('')
  const [syncGC, setSyncGC] = useState(false)
  const toast = useToast()

  useEffect(() => { setReminders(getReminders()) }, [])

  const add = async () => {
    if (!title.trim() || !datetime) { toast('Please fill in title and time', 'error'); return }
    const r = { title: title.trim(), datetime, syncedToGC: false }
    if (syncGC && isSignedIn()) {
      try {
        await createStudyReminder({ title: `🔔 ${title}`, description: 'StudySync Reminder', dateTime: datetime, reminderMinutes: 10 })
        r.syncedToGC = true
        toast('Reminder created & synced to Google Calendar!', 'success')
      } catch {
        toast('Saved locally (Calendar sync failed)', 'error')
      }
    } else if (syncGC && !isSignedIn()) {
      toast('Connect Google Calendar in Settings first', 'error')
    } else {
      toast('Reminder saved!', 'success')
    }
    setReminders(addReminder(r))
    setTitle(''); setDatetime('')
  }

  const remove = (id) => setReminders(deleteReminder(id))

  const now = new Date()
  const upcoming = reminders.filter(r => new Date(r.datetime) > now)
  const past = reminders.filter(r => new Date(r.datetime) <= now)

  return (
    <div className="card reminder-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title" style={{ margin:0 }}>Reminders</h3>
        <span className="badge badge-accent">{upcoming.length} upcoming</span>
      </div>

      {/* Add Reminder */}
      <div className="reminder-form">
        <input className="input" placeholder="Reminder title…" value={title} onChange={e=>setTitle(e.target.value)} />
        <input className="input" type="datetime-local" value={datetime} onChange={e=>setDatetime(e.target.value)}
          style={{ colorScheme:'dark' }} />
        <div className="reminder-sync">
          <label className="toggle-label">
            <input type="checkbox" checked={syncGC} onChange={e=>setSyncGC(e.target.checked)} />
            <span>📅 Sync to Google Calendar</span>
          </label>
          <button className="btn btn-primary btn-sm" onClick={add}><Plus size={15}/> Add</button>
        </div>
      </div>

      {/* Reminder List */}
      <div className="reminder-list">
        {reminders.length === 0 && (
          <div className="empty-state" style={{ padding: '20px 16px' }}>
            <Bell size={24} />
            <p>No reminders yet.</p>
          </div>
        )}
        {[...upcoming, ...past].map(r => {
          const dt = new Date(r.datetime)
          const isPast = dt <= now
          return (
            <div key={r.id} className={`reminder-item ${isPast ? 'reminder-past' : ''}`}>
              <div className="reminder-icon"><Bell size={14} /></div>
              <div className="reminder-body">
                <div className="reminder-title">{r.title}</div>
                <div className="reminder-time">
                  {dt.toLocaleDateString('en-IN', { day:'numeric', month:'short' })} at {dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  {r.syncedToGC && <span className="badge badge-emerald" style={{marginLeft:6}}>📅 GCal</span>}
                </div>
              </div>
              <button className="btn-icon" style={{ padding:'4px', opacity:.5 }} onClick={() => remove(r.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

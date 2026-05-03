import { useState, useEffect } from 'react'
import { getAllJournalEntries, getJournalEntry, saveJournalEntry, getAllSessions, getSettings } from '../services/storage'
import { Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import './Journal.css'

const MOODS = ['😊 Great','😐 Okay','😔 Tough','🔥 Productive','😴 Tired']

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

function formatHours(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60)
  return h>0 ? `${h}h ${m}m` : `${m}m`
}

export default function Journal() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [entry, setEntry] = useState({ text:'', subject:'', mood:null, tags:[] })
  const [allEntries, setAllEntries] = useState({})
  const [allSessions, setAllSessions] = useState({})
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const toast = useToast()

  useEffect(() => {
    setAllEntries(getAllJournalEntries())
    setAllSessions(getAllSessions())
  }, [])

  useEffect(() => {
    setEntry(getJournalEntry(selectedDate))
  }, [selectedDate])

  const save = () => {
    saveJournalEntry(entry, selectedDate)
    setAllEntries(getAllJournalEntries())
    toast('Journal saved!', 'success')
  }

  const changeDate = (delta) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // Navigate months
  const changeMonth = (delta) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  const goToToday = () => {
    const now = new Date()
    setViewMonth(now.getMonth())
    setViewYear(now.getFullYear())
    setSelectedDate(now.toISOString().split('T')[0])
  }

  const todaySessions = allSessions[selectedDate] || []
  const daySeconds = todaySessions.reduce((a,s) => a+(s.duration||0), 0)
  const settings = getSettings()

  // Calendar heat map — viewed month
  const now = new Date()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthDays = Array.from({length:daysInMonth}, (_,i) => {
    const d = new Date(viewYear, viewMonth, i + 1)
    const key = d.toISOString().split('T')[0]
    const secs = (allSessions[key]||[]).reduce((a,s)=>a+(s.duration||0),0)
    const isFuture = d > now
    return { key, label: i + 1, secs, met: secs >= settings.quotaHours*3600, isFuture }
  })

  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear()

  return (
    <div className="page journal-page animate-fade">
      <h1 className="page-title">📖 Study Journal</h1>
      <p className="page-subtitle">Record what you learned and track your progress.</p>

      {/* Heat Map */}
      <div className="card p-5 mb-5">
        {/* Month/Year Navigation */}
        <div className="heatmap-nav">
          <button className="btn-icon" onClick={() => changeMonth(-1)}><ChevronLeft size={16}/></button>
          <div className="heatmap-title">
            {new Date(viewYear, viewMonth).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
          </div>
          <button className="btn-icon" onClick={() => changeMonth(1)} disabled={isCurrentMonth}><ChevronRight size={16}/></button>
          {!isCurrentMonth && (
            <button className="btn btn-ghost btn-sm" onClick={goToToday} style={{marginLeft:8}}>Today</button>
          )}
        </div>

        <div className="heatmap">
          {monthDays.map(d => (
            <div key={d.key} className={`heat-cell ${d.isFuture?'heat-future':d.met?'heat-met':d.secs>0?'heat-partial':'heat-none'} ${d.key===selectedDate?'heat-selected':''}`}
              title={`${formatDate(d.key)}: ${d.secs>0?formatHours(d.secs):'No study'}`}
              onClick={() => !d.isFuture && setSelectedDate(d.key)}
            >
              {d.label}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span className="heat-none heat-legend">No study</span>
          <span className="heat-partial heat-legend">Partial</span>
          <span className="heat-met heat-legend">Goal met ✓</span>
        </div>
      </div>

      <div className="journal-grid">
        {/* Editor */}
        <div className="card p-6 journal-editor">
          {/* Date Nav */}
          <div className="date-nav">
            <button className="btn-icon" onClick={() => changeDate(-1)}><ChevronLeft size={16}/></button>
            <div className="date-nav-label">{formatDate(selectedDate)}</div>
            <button className="btn-icon" onClick={() => changeDate(1)} disabled={selectedDate >= new Date().toISOString().split('T')[0]}>
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* Stats for that day */}
          {daySeconds > 0 && (
            <div className="day-stats">
              <span>⏱ {formatHours(daySeconds)} studied</span>
              <span>·</span>
              <span>{todaySessions.length} session{todaySessions.length!==1?'s':''}</span>
              {todaySessions[0]?.subject && <span>· {todaySessions.map(s=>s.subject).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}</span>}
            </div>
          )}

          {/* Mood */}
          <div className="journal-section">
            <div className="section-title">How was your study session?</div>
            <div className="mood-row">
              {MOODS.map(m => (
                <button key={m} className={`mood-btn ${entry.mood===m?'mood-active':''}`} onClick={() => setEntry(e=>({...e, mood: e.mood===m?null:m}))}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* What I learned */}
          <div className="journal-section">
            <div className="section-title">What did I learn today?</div>
            <textarea
              className="input journal-textarea"
              placeholder="Write about what you studied, key concepts learned, challenges faced…"
              value={entry.text}
              onChange={e => setEntry(v => ({...v, text: e.target.value}))}
            />
          </div>

          <button className="btn btn-primary" style={{ alignSelf:'flex-start' }} onClick={save}>
            <Save size={16} /> Save Entry
          </button>
        </div>

        {/* Session Log */}
        <div className="journal-sidebar">
          <div className="card p-5">
            <div className="section-title">Study Sessions</div>
            {todaySessions.length === 0 ? (
              <div className="empty-state" style={{ padding:'20px 0' }}><p>No sessions on this day.</p></div>
            ) : (
              <div className="session-list">
                {todaySessions.map((s,i) => (
                  <div key={i} className="session-item">
                    <div className="session-subject">{s.subject || 'General Study'}</div>
                    <div className="session-meta">
                      {formatHours(s.duration)} · {new Date(s.startTime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                    {s.notes && <div className="session-notes">"{s.notes}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past entries list */}
          <div className="card p-5 mt-4">
            <div className="section-title">Recent Entries</div>
            <div className="entry-list">
              {Object.entries(allEntries).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,10).map(([date,e]) => (
                <div key={date} className={`entry-item ${date===selectedDate?'entry-active':''}`} onClick={() => setSelectedDate(date)}>
                  <div className="entry-date">{new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                  <div className="entry-preview">{e.mood || ''} {e.text?.slice(0,50) || '(no notes)'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, BookOpen } from 'lucide-react'
import { addSession, getSettings } from '../services/storage'
import { useToast } from '../context/ToastContext'
import { logStudySession, isSignedIn } from '../services/googleCalendar'
import './StudyTimer.css'

const SUBJECTS = ['Biochemistry','Molecular Biology','Genetics','Bioprocess Engineering','Microbiology','Immunology','Plant and Animal Biology','Engineering Mathematics','General Aptitude']

export default function StudyTimer({ onSessionSaved }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    if (running) {
      startTimeRef.current = startTimeRef.current || (Date.now() - elapsed * 1000)
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const handleStart = () => {
    if (!running) {
      startTimeRef.current = Date.now() - elapsed * 1000
      setRunning(true)
    }
  }

  const handlePause = () => setRunning(false)

  const handleStop = async () => {
    if (elapsed < 10) { toast('Study at least 10 seconds!', 'error'); return; }
    setRunning(false)
    clearInterval(intervalRef.current)

    const session = {
      subject: subject || 'General Study',
      duration: elapsed,
      notes,
      startTime: new Date(Date.now() - elapsed * 1000).toISOString(),
      endTime: new Date().toISOString(),
    }
    addSession(session)

    // Log to Google Calendar if connected
    if (isSignedIn()) {
      try {
        await logStudySession(session)
        toast(`Session saved & logged to Google Calendar!`, 'success')
      } catch {
        toast(`Session saved locally.`, 'success')
      }
    } else {
      toast(`Study session saved! (${formatTime(elapsed)})`, 'success')
    }

    setElapsed(0)
    startTimeRef.current = null
    setNotes('')
    onSessionSaved?.()
  }

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return [h, m, s].map(n => String(n).padStart(2,'0')).join(':')
  }

  const settings = getSettings()
  const quotaSec = settings.quotaHours * 3600

  return (
    <div className="card timer-card">
      {/* Timer Display */}
      <div className={`timer-display ${running ? 'timer-running' : ''}`}>
        <div className="timer-time">{formatTime(elapsed)}</div>
        <div className="timer-status">{running ? '● Recording' : elapsed > 0 ? '⏸ Paused' : 'Ready to study'}</div>
      </div>

      {/* Subject Selector */}
      <div className="timer-field">
        <label className="timer-label"><BookOpen size={13} /> Subject</label>
        <select className="input" value={subject} onChange={e => setSubject(e.target.value)} disabled={running}>
          <option value="">General Study</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        {!running ? (
          <button className="btn btn-primary timer-btn-main" onClick={handleStart}>
            <Play size={18} fill="currentColor" /> {elapsed > 0 ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button className="btn btn-ghost timer-btn-main" onClick={handlePause}>
            <Pause size={18} /> Pause
          </button>
        )}
        {elapsed > 0 && (
          <button className="btn btn-danger" onClick={handleStop}>
            <Square size={16} fill="currentColor" /> Save Session
          </button>
        )}
      </div>

      {/* Optional Notes */}
      {elapsed > 0 && (
        <div className="timer-notes-toggle">
          <button className="btn-ghost" style={{ fontSize:'0.78rem', padding:'4px 8px', borderRadius: 6 }} onClick={() => setShowNotes(v => !v)}>
            {showNotes ? '− Hide notes' : '+ Add session notes'}
          </button>
          {showNotes && (
            <textarea className="input" style={{ marginTop: 8, resize:'vertical', minHeight: 72 }}
              placeholder="What did you study? Any notes…"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import StudyTimer from '../components/StudyTimer'
import QuotaRing from '../components/QuotaRing'
import Checklist from '../components/Checklist'
import ReminderManager from '../components/ReminderManager'
import { getSettings, getTodayStudySeconds, getWeeklyStats, getStreakDays } from '../services/storage'
import { Clock, Flame, TrendingUp, CheckSquare, Target, Calendar } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)' }) {
  return (
    <div className="card stat-card animate-fade">
      <div className="stat-icon" style={{ background: `${color}18`, color }}><Icon size={18} /></div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

function formatHours(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function Dashboard() {
  const [settings, setSettings] = useState(getSettings())
  const [studiedSeconds, setStudiedSeconds] = useState(getTodayStudySeconds())
  const [streak, setStreak] = useState(getStreakDays())
  const [weeklyStats, setWeeklyStats] = useState(getWeeklyStats())
  const [activeTab, setActiveTab] = useState('timer')

  const refresh = () => {
    setStudiedSeconds(getTodayStudySeconds())
    setStreak(getStreakDays())
    setWeeklyStats(getWeeklyStats())
    setSettings(getSettings())
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const quotaSec = settings.quotaHours * 3600
  const progress = Math.min(1, studiedSeconds / quotaSec)
  const weekTotal = weeklyStats.reduce((a, d) => a + d.seconds, 0)
  const maxDay = Math.max(...weeklyStats.map(d => d.seconds), 1)

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page dashboard animate-fade">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">{greeting} 👋</h1>
          <p className="page-subtitle">{dateStr} · Let's hit your {settings.quotaHours}h study goal!</p>
        </div>
        {progress >= 1 && (
          <div className="badge badge-emerald" style={{ fontSize: '0.875rem', padding: '8px 16px' }}>
            🎉 Quota Complete!
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid-4 mb-6">
        <StatCard icon={Clock} label="Today" value={formatHours(studiedSeconds)} sub={`of ${settings.quotaHours}h goal`} color="var(--accent)" />
        <StatCard icon={Flame} label="Streak" value={`${streak} days`} sub="consecutive" color="var(--amber)" />
        <StatCard icon={TrendingUp} label="This Week" value={formatHours(weekTotal)} sub="total study time" color="var(--emerald)" />
        <StatCard icon={Target} label="Quota" value={`${Math.round(progress * 100)}%`} sub="completed today" color={progress >= 1 ? 'var(--emerald)' : 'var(--rose)'} />
      </div>

      {/* Main Grid */}
      <div className="dash-main">
        {/* Left: Quota Ring + Timer/Checklist/Reminders */}
        <div className="dash-left">
          <div className="card p-6 mb-4">
            <QuotaRing progress={progress} studiedSeconds={studiedSeconds} quotaHours={settings.quotaHours} />
          </div>

          {/* Tab Switcher */}
          <div className="tab-bar mb-4">
            {[['timer','⏱ Timer'],['checklist','✅ Checklist'],['reminders','🔔 Reminders']].map(([k,l]) => (
              <button key={k} className={`tab-btn ${activeTab===k?'tab-active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
            ))}
          </div>

          {activeTab === 'timer' && <StudyTimer onSessionSaved={refresh} />}
          {activeTab === 'checklist' && <Checklist />}
          {activeTab === 'reminders' && <ReminderManager />}
        </div>

        {/* Right: Weekly Chart */}
        <div className="dash-right">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title" style={{ margin: 0 }}>Weekly Progress</h3>
              <span className="badge badge-accent">{formatHours(weekTotal)} total</span>
            </div>
            <div className="week-chart">
              {weeklyStats.map((day, i) => {
                const h = Math.min(1, day.seconds / maxDay)
                const met = day.seconds >= quotaSec
                return (
                  <div key={i} className="week-bar-wrap">
                    <div className="week-bar-outer">
                      <div className="week-bar-fill" style={{ height: `${h * 100}%`, background: met ? 'var(--emerald)' : 'var(--accent)' }} />
                    </div>
                    <div className="week-bar-label">{day.label}</div>
                    <div className="week-bar-val">{day.seconds > 0 ? formatHours(day.seconds) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick motivational quote */}
          <div className="card p-5 quote-card mt-4">
            <div className="quote-text">"The secret of getting ahead is getting started."</div>
            <div className="quote-author">— Mark Twain</div>
          </div>
        </div>
      </div>
    </div>
  )
}

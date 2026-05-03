import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FileText, Settings, GraduationCap, Zap } from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><GraduationCap size={20} /></div>
        <div>
          <div className="logo-title">StudySync</div>
          <div className="logo-sub">Focus · Track · Grow</div>
        </div>
      </div>

      <div className="sidebar-section-label">Navigation</div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-tip">
          <Zap size={14} style={{ color: 'var(--amber)' }} />
          <span>Stay consistent — every day counts!</span>
        </div>
      </div>
    </aside>
  )
}

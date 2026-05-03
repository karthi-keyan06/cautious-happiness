import '../pages/Dashboard.css'

export default function QuotaRing({ progress, studiedSeconds, quotaHours }) {
  const size = 200
  const stroke = 14
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress)

  const pct = Math.round(progress * 100)
  const color = progress >= 1 ? '#10b981' : progress >= 0.6 ? '#f59e0b' : '#6366f1'

  const h = Math.floor(studiedSeconds / 3600)
  const m = Math.floor((studiedSeconds % 3600) / 60)
  const s = studiedSeconds % 60
  const timeStr = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 16 }}>
      <div style={{ position:'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          {/* Background track */}
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {/* Progress arc */}
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease', filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>
        {/* Center text */}
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 4 }}>
          <div style={{ fontSize:'2rem', fontWeight:800, fontFamily:'var(--font-heading)', color, lineHeight:1 }}>
            {pct}%
          </div>
          <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{timeStr}</div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>of {quotaHours}h goal</div>
        </div>
      </div>
      {progress >= 1 && (
        <div style={{ color:'var(--emerald)', fontWeight:700, fontSize:'0.95rem', animation:'bounce 1s ease infinite' }}>
          🎉 Daily Quota Met!
        </div>
      )}
    </div>
  )
}

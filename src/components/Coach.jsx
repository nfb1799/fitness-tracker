import { useState, useMemo } from 'react'
import './Coach.css'
import { generateInsights } from '../lib/coachInsights'

const KIND_ICON = {
  win:   (c) => <polyline points="4,10 8,14 16,5" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  warn:  (c) => <><path d="M10 3 L17 16 L3 16 Z" stroke={c} strokeWidth="1.6" fill="none" strokeLinejoin="round"/><line x1="10" y1="8" x2="10" y2="11.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><circle cx="10" cy="13.5" r="0.9" fill={c}/></>,
  info:  (c) => <><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" fill="none" /><line x1="10" y1="9" x2="10" y2="14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><circle cx="10" cy="6.5" r="0.9" fill={c}/></>,
  nudge: (c) => <><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" fill="none" /><polyline points="7,10 10,13 14,7" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
}

const KIND_COLOR = {
  win:   'var(--success-color)',
  warn:  'var(--accent-primary)',
  info:  'var(--text-muted)',
  nudge: 'var(--accent-primary)',
}

function Coach({ exercises, meals, weighIns, settings }) {
  const [expanded, setExpanded] = useState(false)

  const insights = useMemo(
    () => generateInsights({ exercises, meals, weighIns, settings }),
    [exercises, meals, weighIns, settings]
  )

  if (insights.length === 0) return null

  const visible = expanded ? insights : insights.slice(0, 3)
  const lead = insights[0]
  const hidden = insights.length - visible.length

  return (
    <div className="hy-card coach-card">
      <div className="coach-head">
        <div className="coach-badge">
          <svg width="14" height="14" viewBox="0 0 20 20">
            <path d="M10 2 L12 8 L18 8 L13.5 12 L15.5 18 L10 14 L4.5 18 L6.5 12 L2 8 L8 8 Z"
              fill="var(--accent-primary)" stroke="var(--accent-primary)" strokeWidth="0.5" strokeLinejoin="round" />
          </svg>
          <span className="hy-sub-label">COACH</span>
        </div>
        <span className="coach-tagline mono">{insights.length} insight{insights.length === 1 ? '' : 's'}</span>
      </div>

      <div className="coach-lead">{lead.headline}</div>
      {lead.detail && <div className="coach-lead-detail">{lead.detail}</div>}

      {visible.length > 1 && (
        <div className="coach-list">
          {visible.slice(1).map((ins) => {
            const color = KIND_COLOR[ins.kind] || 'var(--text-muted)'
            return (
              <div key={ins.id} className="coach-row">
                <span className="coach-icon" style={{ color }}>
                  <svg width="16" height="16" viewBox="0 0 20 20">{KIND_ICON[ins.kind](color)}</svg>
                </span>
                <div className="coach-row-text">
                  <div className="coach-row-head">{ins.headline}</div>
                  {ins.detail && <div className="coach-row-detail">{ins.detail}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hidden > 0 && (
        <button className="coach-more" onClick={() => setExpanded(true)}>
          Show {hidden} more
        </button>
      )}
      {expanded && insights.length > 3 && (
        <button className="coach-more" onClick={() => setExpanded(false)}>
          Show less
        </button>
      )}
    </div>
  )
}

export default Coach

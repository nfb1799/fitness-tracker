// Single source of truth for inline SVG icons.
// All paths share the same stroke style as the bottom-tab and log-sheet
// icons so the visual language is consistent.
//
// Usage:  <Icon name="dumbbell" size={18} />

const PATHS = {
  // Section / nav glyphs
  palette: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17 A 7 7 0 1 1 17 10 c0 2 -2 2 -3 3 c-1 1 0 3 -2 3 a 1 1 0 0 1 -2 1 z"/>
      <circle cx="6.5" cy="9" r="0.9" fill="currentColor"/>
      <circle cx="9" cy="5.5" r="0.9" fill="currentColor"/>
      <circle cx="13" cy="6" r="0.9" fill="currentColor"/>
    </g>
  ),
  sun: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3.2"/>
      <line x1="10" y1="2.5" x2="10" y2="4.5"/>
      <line x1="10" y1="15.5" x2="10" y2="17.5"/>
      <line x1="2.5" y1="10" x2="4.5" y2="10"/>
      <line x1="15.5" y1="10" x2="17.5" y2="10"/>
      <line x1="4.8" y1="4.8" x2="6.2" y2="6.2"/>
      <line x1="13.8" y1="13.8" x2="15.2" y2="15.2"/>
      <line x1="4.8" y1="15.2" x2="6.2" y2="13.8"/>
      <line x1="13.8" y1="6.2" x2="15.2" y2="4.8"/>
    </g>
  ),
  moon: (
    <path d="M15.5 12 A 6.5 6.5 0 1 1 8 4.5 a 5 5 0 0 0 7.5 7.5 z"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  user: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="3"/>
      <path d="M3.5 17 c0 -3 3 -5 6.5 -5 s 6.5 2 6.5 5"/>
    </g>
  ),
  target: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7"/>
      <circle cx="10" cy="10" r="3.5"/>
      <circle cx="10" cy="10" r="0.8" fill="currentColor"/>
    </g>
  ),
  database: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="10" cy="5" rx="6" ry="2.2"/>
      <path d="M4 5 v 10 c 0 1.2 2.7 2.2 6 2.2 s 6 -1 6 -2.2 v -10"/>
      <path d="M4 10 c 0 1.2 2.7 2.2 6 2.2 s 6 -1 6 -2.2"/>
    </g>
  ),
  alert: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3 L17 16 L3 16 Z"/>
      <line x1="10" y1="8" x2="10" y2="11.5"/>
      <circle cx="10" cy="13.5" r="0.9" fill="currentColor"/>
    </g>
  ),
  // Activity / data glyphs
  dumbbell: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2"  y="8" width="2.5" height="4" rx="0.5"/>
      <rect x="15.5" y="8" width="2.5" height="4" rx="0.5"/>
      <line x1="4.5" y1="10" x2="15.5" y2="10" strokeWidth="1.7"/>
      <rect x="5.5" y="6.5" width="1.7" height="7" rx="0.5" fill="currentColor" stroke="none"/>
      <rect x="12.8" y="6.5" width="1.7" height="7" rx="0.5" fill="currentColor" stroke="none"/>
    </g>
  ),
  apple: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6.5 c -2 -2 -5 -1 -5 2 c 0 4 3 8 5 8 s 5 -4 5 -8 c 0 -3 -3 -4 -5 -2 z"/>
      <path d="M10 6.5 v -2"/>
      <path d="M10.5 4.5 c 1.5 0 2.5 -1 2.5 -2.5 c -1.5 0 -2.5 1 -2.5 2.5 z"/>
    </g>
  ),
  scale: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="11" rx="2"/>
      <path d="M10 7 v 4"/>
      <circle cx="10" cy="13" r="0.9" fill="currentColor" stroke="none"/>
    </g>
  ),
  copy: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="10" height="11" rx="1.6"/>
      <path d="M4 14 V 5 a 1.6 1.6 0 0 1 1.6 -1.6 H 12"/>
    </g>
  ),
  pencil: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16 L 5 12 L 13 4 L 16 7 L 8 15 Z"/>
      <line x1="11" y1="6" x2="14" y2="9"/>
    </g>
  ),
  check: (
    <polyline points="4,10 8,14 16,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  bolt: (
    <path d="M11 2 L4 12 H 9 L 9 18 L 16 8 H 11 Z"
      fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round"/>
  ),
}

function Icon({ name, size = 16, className = '', style }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={`app-icon ${className}`}
      style={style}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export default Icon

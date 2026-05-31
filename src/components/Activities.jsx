import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Activities.css'

import { useAuth } from '../contexts/AuthContext'
import {
  getActivities, addActivity, deleteActivity, getUserSettings,
} from '../firebase/firestoreService'
import {
  haversine, trackDistance, bounds,
  formatDuration, formatDistance, distanceUnit,
  formatPace, paceUnit, formatSpeed, speedUnit,
} from '../lib/geo'

// Fix Leaflet's default marker icons not loading via Vite bundle.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const LS_KEY = 'fittrack:activeRecording'
const ACTIVITY_TYPES = [
  { id: 'run',  label: 'Run',  metric: 'pace'  },
  { id: 'ride', label: 'Ride', metric: 'speed' },
]
const localDate = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

// Auto-fit map to a polyline.
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const b = bounds(points)
    if (b) map.fitBounds(b, { padding: [30, 30] })
  }, [points.length, map])
  return null
}

// Resolve the current --accent-primary CSS variable to an actual hex/rgb
// string. Leaflet's SVG path attributes don't resolve CSS vars, so we
// have to plug in a concrete color.
function useAccentColor() {
  return useMemo(() => {
    if (typeof window === 'undefined') return '#6fb6a6'
    const c = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-primary')
      .trim()
    return c || '#6fb6a6'
  }, [
    // Re-evaluate when the theme toggles.
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme'),
  ])
}

// Pan/zoom imperatively when center changes (MapContainer's `center` is
// initial-only — subsequent changes are ignored without this helper).
function CenterOn({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (!center) return
    map.setView(center, zoom ?? map.getZoom(), { animate: true })
  }, [center?.[0], center?.[1], zoom, map])
  return null
}

function Activities() {
  const { currentUser } = useAuth()
  const accent = useAccentColor()
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState([])
  const [unit, setUnit] = useState('mi') // 'mi' or 'km'
  const [selected, setSelected] = useState(null)

  // Recording state (persisted to localStorage so a reload doesn't lose it)
  const [type, setType] = useState('run')
  const [recording, setRecording] = useState(false)   // GPS watcher active
  const [paused, setPaused] = useState(false)         // points still in, timer frozen
  const [points, setPoints] = useState([])            // recorded GPS points
  const [startedAt, setStartedAt] = useState(null)
  const [elapsedSec, setElapsedSec] = useState(0)     // ticks while !paused
  const [error, setError] = useState('')
  const watchIdRef = useRef(null)
  const lastTickRef = useRef(null)

  // Live preview map center
  const [center, setCenter] = useState(null) // null = haven't located yet
  const [centerZoom, setCenterZoom] = useState(4)
  const [locating, setLocating] = useState(false)

  // One-shot location fetch. Used on mount (silently if already granted)
  // and again when the user hits Start so the map snaps to them.
  const fetchCurrentLocation = useCallback((opts = {}) => {
    if (!('geolocation' in navigator)) return Promise.resolve(null)
    setLocating(true)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = [pos.coords.latitude, pos.coords.longitude]
          setCenter(c)
          setCenterZoom(16)
          setLocating(false)
          resolve(c)
        },
        () => { setLocating(false); resolve(null) },
        { enableHighAccuracy: true, maximumAge: opts.maxAge ?? 30000, timeout: opts.timeout ?? 8000 }
      )
    })
  }, [])

  // Load history + settings + restore in-progress recording
  useEffect(() => {
    if (!currentUser) return
    const load = async () => {
      try {
        const [data, settings] = await Promise.all([
          getActivities(currentUser.uid),
          getUserSettings(currentUser.uid),
        ])
        setActivities(data)
        if (settings?.distanceUnit) setUnit(settings.distanceUnit)
        else if (settings?.weightUnit === 'kg') setUnit('km')
      } catch (err) {
        console.error('Error loading activities:', err)
      }
      setLoading(false)
    }
    load()

    // Restore in-progress recording
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        setType(saved.type || 'run')
        setPoints(saved.points || [])
        setStartedAt(saved.startedAt || null)
        setElapsedSec(saved.elapsedSec || 0)
        setPaused(true) // restored sessions are paused until user resumes
      }
    } catch { /* ignore */ }

    // If the user has already authorized geolocation, silently center the
    // map on them on mount. If permission is 'prompt' we don't probe —
    // we wait for them to hit Start so the browser prompt is tied to a
    // clear user gesture.
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((res) => {
        if (res.state === 'granted') fetchCurrentLocation()
      }).catch(() => { /* Safari etc. — skip silently */ })
    }
  }, [currentUser, fetchCurrentLocation])

  // Tick the elapsed timer while recording and not paused
  useEffect(() => {
    if (!recording || paused) {
      lastTickRef.current = null
      return
    }
    lastTickRef.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const dt = (now - (lastTickRef.current || now)) / 1000
      lastTickRef.current = now
      setElapsedSec(prev => prev + dt)
    }, 1000)
    return () => clearInterval(id)
  }, [recording, paused])

  // Persist in-progress recording on every meaningful change
  useEffect(() => {
    if (points.length === 0 && !startedAt) {
      localStorage.removeItem(LS_KEY)
      return
    }
    localStorage.setItem(LS_KEY, JSON.stringify({
      type, points, startedAt, elapsedSec,
    }))
  }, [type, points, startedAt, elapsedSec])

  // Subscribe to GPS while recording
  useEffect(() => {
    if (!recording || paused) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support location tracking.')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        if (accuracy && accuracy > 35) return // drop noisy fixes
        const newPt = { lat: latitude, lon: longitude, t: Date.now() }
        setCenter([latitude, longitude])
        setPoints(prev => {
          // skip if hasn't moved at least 3m to keep stationary jitter out
          if (prev.length > 0) {
            const last = prev[prev.length - 1]
            if (haversine(last, newPt) < 3) return prev
          }
          return [...prev, newPt]
        })
      },
      (err) => {
        setError(err.message || 'Could not get your location.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    )
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [recording, paused])

  const handleStart = useCallback(() => {
    setError('')
    // Snap the map to the user's location ASAP, regardless of permission
    // state. If geolocation was never granted, this triggers the prompt.
    fetchCurrentLocation({ maxAge: 0, timeout: 12000 })
    if (points.length === 0) {
      setStartedAt(Date.now())
      setElapsedSec(0)
    }
    setRecording(true)
    setPaused(false)
  }, [points.length, fetchCurrentLocation])

  const handlePause = useCallback(() => setPaused(true), [])
  const handleResume = useCallback(() => {
    setError('')
    setPaused(false)
    setRecording(true)
  }, [])

  const handleDiscard = useCallback(() => {
    setRecording(false)
    setPaused(false)
    setPoints([])
    setStartedAt(null)
    setElapsedSec(0)
    localStorage.removeItem(LS_KEY)
  }, [])

  const handleSave = useCallback(async () => {
    if (!currentUser) return
    const distanceM = trackDistance(points)
    const durationSec = Math.round(elapsedSec)
    const startDate = startedAt ? new Date(startedAt) : new Date()
    const activity = {
      type,
      date: localDate(startDate),
      startedAt: startedAt || Date.now(),
      durationSec,
      distanceM,
      points: points.map(p => ({ lat: p.lat, lon: p.lon, t: p.t })),
      unit, // mi or km user was using
    }
    try {
      const id = await addActivity(currentUser.uid, activity)
      setActivities(prev => [{ id, ...activity, timestamp: { toDate: () => new Date() } }, ...prev])
      handleDiscard()
    } catch (err) {
      console.error('Error saving activity:', err)
      setError('Could not save. Try again.')
    }
  }, [currentUser, points, elapsedSec, startedAt, type, unit, handleDiscard])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteActivity(currentUser.uid, id)
      setActivities(prev => prev.filter(a => a.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Error deleting activity:', err)
    }
  }, [currentUser, selected])

  if (loading) return <div className="activities-page"><p className="muted">Loading…</p></div>

  const liveDist = trackDistance(points)
  const isRun = type === 'run'
  const metricVal = isRun
    ? formatPace(liveDist, elapsedSec, unit)
    : formatSpeed(liveDist, elapsedSec, unit)
  const metricUnit = isRun ? paceUnit(unit) : speedUnit(unit)
  const hasActiveSession = recording || points.length > 0

  return (
    <div className="activities-page">
      <div className="hy-sub-label" style={{ padding: '4px 0 12px' }}>RUN · RIDE · TRACK YOUR ROUTE</div>

      {/* Type segment */}
      <div className="hy-segment" style={{ marginBottom: 12 }}>
        {ACTIVITY_TYPES.map(t => (
          <button
            key={t.id}
            className={type === t.id ? 'active' : ''}
            onClick={() => !recording && setType(t.id)}
            disabled={recording}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live tracker card */}
      <div className="hy-card activity-tracker">
        <div className="tracker-stats">
          <div className="tracker-stat">
            <span className="hy-sub-label">{distanceUnit(unit).toUpperCase()}</span>
            <span className="hy-numeric tracker-value">{formatDistance(liveDist, unit)}</span>
          </div>
          <div className="tracker-stat tracker-stat-time">
            <span className="hy-sub-label">TIME</span>
            <span className="hy-numeric tracker-value">{formatDuration(elapsedSec)}</span>
          </div>
          <div className="tracker-stat">
            <span className="hy-sub-label">{(isRun ? 'PACE' : 'SPEED')}</span>
            <span className="hy-numeric tracker-value tracker-value-sm">
              {metricVal}<span className="mono tracker-unit"> {metricUnit}</span>
            </span>
          </div>
        </div>

        <div className="tracker-map">
          <MapContainer
            center={center || [39.5, -98.35]}
            zoom={center ? centerZoom : 4}
            scrollWheelZoom
            className="leaflet-host"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.length > 1 && (
              <Polyline
                positions={points.map(p => [p.lat, p.lon])}
                pathOptions={{ color: accent, weight: 4, opacity: 0.95 }}
              />
            )}
            {points.length > 0 && (
              <Marker position={[points[points.length - 1].lat, points[points.length - 1].lon]} />
            )}
            {/* When the route has 2+ points, fit to the route. Otherwise
                keep the map centered on the user's current location. */}
            {points.length > 1
              ? <FitBounds points={points} />
              : <CenterOn center={center} zoom={centerZoom} />}
          </MapContainer>
          {!hasActiveSession && (
            <div className="tracker-map-hint">
              {locating
                ? 'Finding your location…'
                : (<>Tap <strong>Start</strong> and grant location access to begin recording your route.</>)}
            </div>
          )}
        </div>

        {error && <div className="tracker-error">{error}</div>}

        <div className="tracker-controls">
          {!recording && points.length === 0 && (
            <button className="add-btn" onClick={handleStart}>● Start {isRun ? 'run' : 'ride'}</button>
          )}
          {recording && !paused && (
            <>
              <button className="tracker-btn-secondary" onClick={handlePause}>Pause</button>
              <button className="tracker-btn-finish" onClick={handleSave}>Finish</button>
            </>
          )}
          {(paused || (!recording && points.length > 0)) && (
            <>
              <button className="tracker-btn-secondary" onClick={handleDiscard}>Discard</button>
              <button className="add-btn" onClick={handleResume}>Resume</button>
              <button className="tracker-btn-finish" onClick={handleSave}>Save</button>
            </>
          )}
        </div>
      </div>

      {/* History */}
      <div className="hy-section-label" style={{ marginTop: 22, marginBottom: 10 }}>History</div>

      {activities.length === 0 ? (
        <div className="hy-card dashed" style={{ padding: '24px 16px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No activities yet. Start your first run or ride above.</span>
        </div>
      ) : (
        <div className="activities-list">
          {activities.map((a, i) => (
            <ActivityCard
              key={a.id}
              activity={a}
              unit={unit}
              accent={accent}
              tilt={i % 2 === 0 ? 'tilt-l-sm' : 'tilt-r-sm'}
              isOpen={selected?.id === a.id}
              onToggle={() => setSelected(selected?.id === a.id ? null : a)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityCard({ activity, unit, accent, tilt, isOpen, onToggle, onDelete }) {
  const isRun = activity.type === 'run'
  const distM = activity.distanceM || 0
  const dur = activity.durationSec || 0
  const metric = isRun ? formatPace(distM, dur, unit) : formatSpeed(distM, dur, unit)
  const mUnit  = isRun ? paceUnit(unit) : speedUnit(unit)
  const pts = activity.points || []
  const date = new Date((activity.startedAt) || (activity.timestamp?.toDate?.() || Date.now()))

  return (
    <div className={`hy-card activity-card ${tilt}`}>
      <button className="activity-card-head" onClick={onToggle}>
        <div className="activity-card-meta">
          <span className="hy-sub-label" style={{ color: 'var(--accent-primary)' }}>{activity.type.toUpperCase()}</span>
          <span className="mono activity-date">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
            {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className="activity-card-stats">
          <span className="hy-numeric activity-stat-val">{formatDistance(distM, unit)}<span className="activity-stat-unit"> {distanceUnit(unit)}</span></span>
          <span className="activity-dot">·</span>
          <span className="hy-numeric activity-stat-val">{formatDuration(dur)}</span>
          <span className="activity-dot">·</span>
          <span className="hy-numeric activity-stat-val">{metric}<span className="activity-stat-unit"> {mUnit}</span></span>
        </div>
        <span className="activity-card-chev">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <div className="activity-card-body">
          {pts.length > 1 ? (
            <div className="activity-card-map">
              <MapContainer
                center={[pts[0].lat, pts[0].lon]}
                zoom={14}
                scrollWheelZoom={false}
                className="leaflet-host"
              >
                <TileLayer
                  attribution='&copy; OSM'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline positions={pts.map(p => [p.lat, p.lon])} pathOptions={{ color: accent || '#6fb6a6', weight: 4, opacity: 0.95 }} />
                <FitBounds points={pts} />
              </MapContainer>
            </div>
          ) : (
            <div className="activity-card-nomap mono">No route data recorded.</div>
          )}
          <div className="activity-card-actions">
            <button className="delete-btn" onClick={onDelete}>Delete activity</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Activities

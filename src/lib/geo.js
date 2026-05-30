// Geo + formatting utilities for the Activities tracker.

const R = 6371000 // earth radius in meters

// Haversine distance between two lat/lon points, in meters.
export function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Cumulative distance over a track of points {lat, lon}, in meters.
export function trackDistance(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1], points[i])
  }
  return total
}

// Bounding box for a polyline. Returns null if empty.
export function bounds(points) {
  if (points.length === 0) return null
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lon < minLon) minLon = p.lon
    if (p.lon > maxLon) maxLon = p.lon
  }
  return [[minLat, minLon], [maxLat, maxLon]]
}

// ─── formatting ───────────────────────────────────────────────────

export function formatDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function formatDistance(meters, unit = 'mi') {
  if (unit === 'km') return `${(meters / 1000).toFixed(2)}`
  return `${(meters / 1609.344).toFixed(2)}`
}

export function distanceUnit(unit = 'mi') {
  return unit === 'km' ? 'km' : 'mi'
}

// Pace = min per km/mi
export function formatPace(meters, seconds, unit = 'mi') {
  if (meters <= 0 || seconds <= 0) return '—'
  const perUnit = unit === 'km' ? 1000 : 1609.344
  const totalSec = seconds / (meters / perUnit)
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function paceUnit(unit = 'mi') {
  return unit === 'km' ? '/km' : '/mi'
}

// Speed in km/h or mph
export function formatSpeed(meters, seconds, unit = 'mi') {
  if (seconds <= 0) return '—'
  const hours = seconds / 3600
  const dist = unit === 'km' ? meters / 1000 : meters / 1609.344
  return (dist / hours).toFixed(1)
}

export function speedUnit(unit = 'mi') {
  return unit === 'km' ? 'km/h' : 'mph'
}

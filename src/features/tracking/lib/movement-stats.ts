import type { TrackingLog } from '@/features/tracking/types'

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * Haversine distance in kilometres between two coordinates. Used to derive
 * speed and to keep breadcrumb segments comparable.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/**
 * Initial bearing (0-360°) from p1 → p2. 0 = north, 90 = east, etc. Used to
 * rotate the marker chevron so it points the direction of travel.
 */
export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const λ1 = toRad(lon1)
  const λ2 = toRad(lon2)
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export interface MovementStats {
  /** Direction of travel (0-360°). Undefined when there's only one ping. */
  headingDeg?: number
  /** Speed in km/h derived from the latest two pings. Undefined when there's
   * only one ping or the elapsed time is negligible. */
  speedKmh?: number
}

/**
 * Compute heading + speed from a tag's recent history. `history` must be
 * sorted **newest first**. Reads only the last two pings; older entries are
 * ignored so the value reflects current motion, not average.
 */
export function movementFor(history: TrackingLog[]): MovementStats {
  if (history.length < 2) return {}
  const cur = history[0]
  const prev = history[1]
  if (
    cur.latitude == null ||
    cur.longitude == null ||
    prev.latitude == null ||
    prev.longitude == null
  ) {
    return {}
  }
  const km = haversineKm(prev.latitude, prev.longitude, cur.latitude, cur.longitude)
  const elapsedH = (new Date(cur.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3_600_000
  const heading = bearingDeg(prev.latitude, prev.longitude, cur.latitude, cur.longitude)
  if (elapsedH <= 0 || km < 0.01) {
    // Effectively stationary — keep heading from the geometry but suppress speed.
    return { headingDeg: heading }
  }
  return { headingDeg: heading, speedKmh: km / elapsedH }
}

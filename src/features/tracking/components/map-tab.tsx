import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapIcon, MapPin, Search, X, Route as RouteIcon, AlertTriangle, Maximize2, Moon, Sun, Building2 } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, Circle, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getModulePath } from '@/config/modules'
import { useTags, useTrackingLogs } from '@/features/tracking'
import { useVehicles, useTrips } from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAssets } from '@/features/assets'
import { useInventoryItems } from '@/features/inventory'
import type { TrackingEntityType, TrackingLog } from '@/features/tracking/types'
import { Avatar } from '@/shared/ui/avatar'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { EntityLabel } from './entity-label'
import { movementFor } from '@/features/tracking/lib/movement-stats'
import { cn } from '@/shared/utils/cn'

/**
 * Fleet-tracking freshness thresholds. A fix newer than `LIVE` is "moving /
 * just reported"; between `LIVE` and `IDLE` it's "stationary but recently
 * checked in"; older than `IDLE` is offline / stale.
 */
const LIVE_THRESHOLD_MS = 5 * 60 * 1000      // 5 min
const IDLE_THRESHOLD_MS = 30 * 60 * 1000     // 30 min

type PingStatus = 'live' | 'idle' | 'offline'

function pingStatus(p: TrackingLog): PingStatus {
  const age = Date.now() - new Date(p.timestamp).getTime()
  if (age < LIVE_THRESHOLD_MS) return 'live'
  if (age < IDLE_THRESHOLD_MS) return 'idle'
  return 'offline'
}

const STATUS_COLOR: Record<PingStatus, string> = {
  live: '#10b981',     // emerald-500
  idle: '#f59e0b',     // amber-500
  offline: '#a1a1aa',  // zinc-400
}

const STATUS_LABEL: Record<PingStatus, string> = {
  live: 'Live',
  idle: 'Idle',
  offline: 'Offline',
}

const STATUS_PILL: Record<PingStatus, string> = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  idle: 'bg-amber-50 text-amber-700 border-amber-200',
  offline: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

/**
 * SVG chevron marker, rotated to the direction of travel. We use this instead
 * of CircleMarker when we have a heading + recent movement, so dispatchers
 * can see direction at a glance. Stationary / offline vehicles keep the
 * round CircleMarker since rotation would be meaningless.
 */
function chevronIcon(color: string, headingDeg: number, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 32 : 26
  const stroke = isSelected ? '#18181b' : '#ffffff'
  const strokeWidth = isSelected ? 2 : 1.5
  // The path draws a chevron pointing up (north); the wrapper div rotates
  // it to the actual heading. Rotation pivots around the icon centre.
  const html = `
    <div style="width:${size}px;height:${size}px;transform:rotate(${headingDeg}deg);transform-origin:center;">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 L19 19 L12 15 L5 19 Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" />
      </svg>
    </div>
  `
  return L.divIcon({
    html,
    className: 'ems-chevron-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Philippines bounding box (with light padding so the user can pan to coastlines)
const PH_BOUNDS: L.LatLngBoundsExpression = [
  [4.0, 116.0],
  [22.0, 128.0],
]
const PH_CENTER: [number, number] = [12.8797, 121.7740]

/** Map tile presets — swappable from the controls overlay. Both are free
 * CARTO basemaps; "dark" matches the app's dark theme. */
const TILE_STYLES = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const

type TileStyle = keyof typeof TILE_STYLES

/** Demo geofences — operational sites that vehicles regularly visit. In a
 * production system these'd live on the backend; mocking inline keeps the
 * Phase 3 overlay self-contained until a Sites feature lands. */
interface Geofence {
  id: string
  name: string
  type: 'depot' | 'warehouse' | 'site'
  lat: number
  lng: number
  /** Radius in metres. Tuned to roughly cover the named area on the map. */
  radiusM: number
}

const DEMO_GEOFENCES: Geofence[] = [
  { id: 'GF-001', name: 'Clark Freeport HQ', type: 'depot',     lat: 15.1684, lng: 120.5868, radiusM: 4000 },
  { id: 'GF-002', name: 'BGC HQ',            type: 'depot',     lat: 14.5547, lng: 121.0509, radiusM: 1500 },
  { id: 'GF-003', name: 'Ortigas Hub',       type: 'site',      lat: 14.5879, lng: 121.0654, radiusM: 1800 },
  { id: 'GF-004', name: 'Cabuyao Warehouse', type: 'warehouse', lat: 14.2520, lng: 121.1280, radiusM: 1200 },
]

const GEOFENCE_COLOR: Record<Geofence['type'], string> = {
  depot:     '#3b82f6', // blue-500
  warehouse: '#a855f7', // purple-500
  site:      '#14b8a6', // teal-500
}

/** Sets initial bounds to cover all pings; subsequent `selectedTagId` changes
 * fly the map to that single ping's coordinates so click-to-locate works.
 * `fitAllNonce` is a bump-to-trigger counter from the parent — incrementing
 * it re-fits the map to all current pings. */
function MapViewController({
  pings,
  selectedTagId,
  fitAllNonce,
}: {
  pings: TrackingLog[]
  selectedTagId: string | null
  fitAllNonce: number
}) {
  const map = useMap()
  const initialFitDoneRef = useRef(false)

  const fitAll = () => {
    const valid = pings.filter((p) => p.latitude != null && p.longitude != null)
    if (valid.length === 0) return
    if (valid.length === 1) {
      map.setView([valid[0].latitude!, valid[0].longitude!], 13)
    } else {
      const bounds = L.latLngBounds(valid.map((p) => [p.latitude!, p.longitude!] as [number, number]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }

  useEffect(() => {
    if (initialFitDoneRef.current) return
    fitAll()
    initialFitDoneRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pings, map])

  useEffect(() => {
    if (fitAllNonce === 0) return
    fitAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitAllNonce])

  useEffect(() => {
    if (!selectedTagId) return
    const ping = pings.find((p) => p.tagId === selectedTagId)
    if (!ping || ping.latitude == null || ping.longitude == null) return
    map.flyTo([ping.latitude, ping.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 })
  }, [selectedTagId, pings, map])

  return null
}

interface MapTabProps {
  /** When set, the map and live-entities list show only this entity type. */
  entityFilter?: TrackingEntityType
}

export function MapTab({ entityFilter }: MapTabProps = {}) {
  const { data: tags = [], isLoading: tagsLoading } = useTags()
  const { data: logs = [], isLoading: logsLoading } = useTrackingLogs()
  const { data: vehicles = [] } = useVehicles()
  const { data: drivers = [] } = useDrivers()
  const { data: assets = [] } = useAssets()
  const { data: items = [] } = useInventoryItems()
  const { data: trips = [] } = useTrips()

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mapStyle, setMapStyle] = useState<TileStyle>('street')
  const [showGeofences, setShowGeofences] = useState(true)
  // Bump to imperatively trigger MapViewController.fitAll without rebuilding props.
  const [fitAllNonce, setFitAllNonce] = useState(0)

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers])
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const tagMap = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags])

  // Full per-tag history (only valid GPS pings, sorted newest first). Drives
  // the breadcrumb polyline when a vehicle is selected and the speed/heading
  // derivation for the current marker.
  const historyByTag = useMemo(() => {
    const map = new Map<string, TrackingLog[]>()
    for (const l of logs) {
      if (l.latitude == null || l.longitude == null) continue
      if (entityFilter && l.entityType !== entityFilter) continue
      const list = map.get(l.tagId) ?? []
      list.push(l)
      map.set(l.tagId, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    }
    return map
  }, [logs, entityFilter])

  const latestPings = useMemo(() => {
    const result: TrackingLog[] = []
    for (const history of historyByTag.values()) {
      if (history.length > 0) result.push(history[0])
    }
    return result
  }, [historyByTag])

  // For each ping, derive the searchable text + status. Sorted: live → idle →
  // offline, then by recency within each bucket, so the most actionable rows
  // float to the top of the sidebar.
  const enriched = useMemo(() => {
    const rank: Record<PingStatus, number> = { live: 0, idle: 1, offline: 2 }
    return latestPings
      .map((p) => {
        const status = pingStatus(p)
        const vehicle = p.entityType === 'vehicle' ? vehicleMap[p.entityId] : undefined
        const driver = vehicle?.assignedDriverId ? driverMap[vehicle.assignedDriverId] : undefined
        const asset = p.entityType === 'asset' ? assetMap[p.entityId] : undefined
        const item = p.entityType === 'item' ? itemMap[p.entityId] : undefined
        const history = historyByTag.get(p.tagId) ?? []
        const movement = movementFor(history)
        const activeTrip = vehicle
          ? trips.find((t) => t.vehicleId === vehicle.id && t.status === 'in_progress')
          : undefined
        const searchText = [
          vehicle?.plateNumber,
          vehicle?.model,
          driver?.name,
          asset?.name,
          asset?.assetCode,
          item?.name,
          item?.sku,
          p.locationName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return { ping: p, status, vehicle, driver, asset, item, history, movement, activeTrip, searchText }
      })
      .sort((a, b) => {
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        return b.ping.timestamp.localeCompare(a.ping.timestamp)
      })
  }, [latestPings, vehicleMap, driverMap, assetMap, itemMap, historyByTag, trips])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return enriched
    return enriched.filter((e) => e.searchText.includes(q))
  }, [enriched, search])

  const counts = useMemo(() => {
    const c: Record<PingStatus, number> = { live: 0, idle: 0, offline: 0 }
    for (const e of enriched) c[e.status]++
    return c
  }, [enriched])

  if (tagsLoading || logsLoading) return <TableSkeleton columns={2} rows={4} />

  if (latestPings.length === 0) {
    const subject = entityFilter === 'vehicle' ? 'vehicle' : entityFilter === 'asset' ? 'asset' : 'entity'
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={MapIcon}
          title={`No ${subject} GPS pings to display`}
          description={`Bind a GPS tag to a ${subject} and record a ping to see it on the map.`}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
          <div className="relative aspect-[4/3] min-h-[420px]">
            <MapContainer
              style={{ height: '100%', width: '100%' }}
              center={PH_CENTER}
              zoom={6}
              minZoom={5}
              maxZoom={18}
              maxBounds={PH_BOUNDS}
              maxBoundsViscosity={1}
              scrollWheelZoom
              attributionControl
            >
              <TileLayer
                key={mapStyle}
                attribution={TILE_STYLES[mapStyle].attribution}
                url={TILE_STYLES[mapStyle].url}
                subdomains={['a', 'b', 'c', 'd']}
              />

              {showGeofences && DEMO_GEOFENCES.map((g) => (
                <Circle
                  key={g.id}
                  center={[g.lat, g.lng]}
                  radius={g.radiusM}
                  pathOptions={{
                    color: GEOFENCE_COLOR[g.type],
                    weight: 1.5,
                    fillColor: GEOFENCE_COLOR[g.type],
                    fillOpacity: 0.08,
                    dashArray: '4 4',
                  }}
                >
                  <Popup>
                    <div className="space-y-0.5 text-[12px]">
                      <p className="font-medium text-zinc-900">{g.name}</p>
                      <p className="text-zinc-500 capitalize">{g.type} · {(g.radiusM / 1000).toFixed(1)} km radius</p>
                    </div>
                  </Popup>
                </Circle>
              ))}
              {/* Breadcrumb polyline for the selected tag — connects its last ~10
                  recent pings so dispatchers can see the recent path. Newest
                  fix is the marker itself, so we start the line at point #2. */}
              {selectedTagId && (() => {
                const selected = enriched.find((e) => e.ping.tagId === selectedTagId)
                if (!selected) return null
                const points = selected.history
                  .slice(0, 10)
                  .filter((p) => p.latitude != null && p.longitude != null)
                  .map((p) => [p.latitude!, p.longitude!] as [number, number])
                if (points.length < 2) return null
                return (
                  <Polyline
                    positions={points}
                    pathOptions={{
                      color: STATUS_COLOR[selected.status],
                      weight: 3,
                      opacity: 0.6,
                      dashArray: '6 6',
                    }}
                  />
                )
              })()}

              {enriched.map(({ ping, status, vehicle, driver, asset, item, movement, activeTrip }) => {
                const tag = tagMap[ping.tagId]
                const isSelected = selectedTagId === ping.tagId
                const fill = STATUS_COLOR[status]
                const isMoving = status !== 'offline' && movement.speedKmh != null && movement.speedKmh >= 2
                const center: [number, number] = [ping.latitude!, ping.longitude!]
                const eventHandlers = { click: () => setSelectedTagId(ping.tagId) }
                const popup = (
                  <Popup>
                    <div className="space-y-1.5 text-[12px] min-w-[210px]">
                      <div className="flex items-center justify-between gap-2">
                        <EntityLabel
                          type={ping.entityType}
                          id={ping.entityId}
                          vehicleMap={vehicleMap}
                          assetMap={assetMap}
                          itemMap={itemMap}
                        />
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium', STATUS_PILL[status])}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      {tag && <p className="font-mono text-[10px] text-zinc-400">{tag.code}</p>}
                      {driver && (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={driver.name} imageUrl={driver.photoUrl} size="sm" className="w-4 h-4 text-[8px]" />
                          <span className="text-[11.5px] text-zinc-700">{driver.name}</span>
                        </div>
                      )}
                      {movement.speedKmh != null && (
                        <p className="text-[11.5px] text-zinc-700">
                          {movement.speedKmh >= 2
                            ? <><span className="font-medium tabular-nums">{Math.round(movement.speedKmh)}</span> <span className="text-zinc-500">km/h</span></>
                            : <span className="text-zinc-500">Stationary</span>}
                          {movement.headingDeg != null && movement.speedKmh >= 2 && (
                            <span className="text-zinc-400"> · heading {Math.round(movement.headingDeg)}°</span>
                          )}
                        </p>
                      )}
                      {activeTrip && (
                        <p className="text-[11.5px] text-zinc-700 inline-flex items-center gap-1">
                          <RouteIcon className="w-3 h-3 text-blue-500" />
                          <span className="font-medium">On trip:</span>
                          <span className="truncate">{activeTrip.purpose ?? activeTrip.id}</span>
                        </p>
                      )}
                      {ping.locationName && <p className="text-zinc-700 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ping.locationName}</p>}
                      <p className="font-mono text-[11px] text-zinc-500">{ping.latitude!.toFixed(4)}, {ping.longitude!.toFixed(4)}</p>
                      <p className="text-zinc-400">{formatDistanceToNow(parseISO(ping.timestamp), { addSuffix: true })}</p>
                      {vehicle && (
                        <Link
                          to={`${getModulePath('fleet', 'vehicles')}?vehicle=${vehicle.id}`}
                          className="block pt-1 text-[11.5px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          Open vehicle →
                        </Link>
                      )}
                      {asset && (
                        <Link
                          to={`${getModulePath('assets', 'registry')}?asset=${asset.id}`}
                          className="block pt-1 text-[11.5px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          Open asset →
                        </Link>
                      )}
                      {item && (
                        <Link
                          to={`${getModulePath('inventory', 'items')}?item=${item.id}`}
                          className="block pt-1 text-[11.5px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          Open item →
                        </Link>
                      )}
                    </div>
                  </Popup>
                )
                if (isMoving && movement.headingDeg != null) {
                  return (
                    <Marker
                      key={ping.id}
                      position={center}
                      icon={chevronIcon(fill, movement.headingDeg, isSelected)}
                      eventHandlers={eventHandlers}
                    >
                      {popup}
                    </Marker>
                  )
                }
                return (
                  <CircleMarker
                    key={ping.id}
                    center={center}
                    radius={isSelected ? 12 : 9}
                    pathOptions={{
                      color: isSelected ? '#18181b' : '#ffffff',
                      weight: isSelected ? 3 : 2,
                      fillColor: fill,
                      fillOpacity: status === 'offline' ? 0.55 : 0.95,
                      dashArray: status === 'offline' ? '3 3' : undefined,
                    }}
                    eventHandlers={eventHandlers}
                  >
                    {popup}
                  </CircleMarker>
                )
              })}
              <MapViewController pings={latestPings} selectedTagId={selectedTagId} fitAllNonce={fitAllNonce} />
            </MapContainer>

            {/* Controls overlay — placed absolute in the same wrapper as
                MapContainer so Leaflet's own controls stay on the left while
                ours land top-right. z-[1000] beats Leaflet's panes. */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
              <ControlButton
                onClick={() => setFitAllNonce((n) => n + 1)}
                title="Fit all entities"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </ControlButton>
              <ControlButton
                onClick={() => setMapStyle((s) => (s === 'street' ? 'dark' : 'street'))}
                title={mapStyle === 'street' ? 'Switch to dark map' : 'Switch to street map'}
              >
                {mapStyle === 'street' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </ControlButton>
              <ControlButton
                onClick={() => setShowGeofences((v) => !v)}
                title={showGeofences ? 'Hide geofences' : 'Show geofences'}
                active={showGeofences}
              >
                <Building2 className="w-3.5 h-3.5" />
              </ControlButton>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-zinc-200/60 flex items-center justify-between text-[12px] text-zinc-500 flex-wrap gap-2">
            <span>Tiles by CARTO · Data &copy; OpenStreetMap contributors</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {counts.live} Live
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {counts.idle} Idle
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                {counts.offline} Offline
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Stale watchdog — only when there's a meaningful contrast (some live,
            some offline). All-offline doesn't need the warning; all-live
            doesn't either. */}
        {counts.offline > 0 && counts.live + counts.idle > 0 && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="w-full flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-left"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium text-amber-700">
                {counts.offline} {counts.offline === 1 ? 'entity hasn’t' : 'entities haven’t'} reported in 30+ min
              </p>
              <p className="text-[10.5px] text-amber-700 opacity-70">Filter cleared so you can scan offline rows.</p>
            </div>
          </button>
        )}

        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Live entities ({filtered.length})
          </p>
          {selectedTagId && (
            <button
              type="button"
              onClick={() => setSelectedTagId(null)}
              className="text-[10.5px] text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plate, model, driver…"
            className="w-full pl-8 pr-7 py-1.5 text-[12.5px] bg-white border border-zinc-200/60 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="text-[12px] text-zinc-400 text-center py-6">No entities match your search.</p>
          )}
          {filtered.map(({ ping, status, driver, movement, activeTrip }) => {
            const isSelected = selectedTagId === ping.tagId
            const isMoving = status !== 'offline' && movement.speedKmh != null && movement.speedKmh >= 2
            return (
              <button
                key={ping.id}
                type="button"
                onClick={() => setSelectedTagId(ping.tagId)}
                className={cn(
                  'w-full bg-white rounded-lg border px-3 py-2.5 flex items-center gap-3 text-left transition-colors',
                  isSelected
                    ? 'border-zinc-900 ring-1 ring-zinc-900/10'
                    : 'border-zinc-200/60 hover:border-zinc-300',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    status === 'live' && 'bg-emerald-500 animate-pulse',
                    status === 'idle' && 'bg-amber-500',
                    status === 'offline' && 'bg-zinc-300',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <EntityLabel
                        type={ping.entityType}
                        id={ping.entityId}
                        vehicleMap={vehicleMap}
                        assetMap={assetMap}
                        itemMap={itemMap}
                      />
                    </div>
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium flex-shrink-0', STATUS_PILL[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 min-w-0">
                    {driver && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Avatar name={driver.name} imageUrl={driver.photoUrl} size="sm" className="w-4 h-4 text-[8px]" />
                        <span className="truncate">{driver.name}</span>
                      </div>
                    )}
                    {isMoving && (
                      <span className="tabular-nums text-zinc-700 font-medium flex-shrink-0">{Math.round(movement.speedKmh!)} km/h</span>
                    )}
                    {activeTrip && (
                      <span title={activeTrip.purpose ?? activeTrip.id} className="inline-flex items-center gap-0.5 text-blue-600 flex-shrink-0">
                        <RouteIcon className="w-3 h-3" />
                        On trip
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {ping.locationName ?? `${ping.latitude!.toFixed(3)}, ${ping.longitude!.toFixed(3)}`}
                  </p>
                </div>
                <span
                  className="text-[10px] text-zinc-400 whitespace-nowrap flex-shrink-0"
                  title={parseISO(ping.timestamp).toLocaleString()}
                >
                  {formatDistanceToNow(parseISO(ping.timestamp), { addSuffix: true })}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-md border bg-white shadow-sm transition-colors',
        active
          ? 'border-zinc-900 text-zinc-900'
          : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900',
      )}
    >
      {children}
    </button>
  )
}

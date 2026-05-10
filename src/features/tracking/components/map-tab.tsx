import { useEffect, useMemo } from 'react'
import { Map as MapIcon, MapPin } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTags, useTrackingLogs } from '@/features/tracking'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import { useInventoryItems } from '@/features/inventory'
import type { TrackingEntityType, TrackingLog } from '@/features/tracking/types'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { EntityLabel } from './entity-label'
import { cn } from '@/shared/utils/cn'

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000

// Philippines bounding box (with light padding so the user can pan to coastlines)
const PH_BOUNDS: L.LatLngBoundsExpression = [
  [4.0, 116.0],
  [22.0, 128.0],
]
const PH_CENTER: [number, number] = [12.8797, 121.7740]

function isFreshPing(p: TrackingLog) {
  return Date.now() - new Date(p.timestamp).getTime() < FRESH_WINDOW_MS
}

/** Fits the map view to the bounding box of all valid pings. */
function FitToBounds({ pings }: { pings: TrackingLog[] }) {
  const map = useMap()
  useEffect(() => {
    const valid = pings.filter((p) => p.latitude != null && p.longitude != null)
    if (valid.length === 0) return
    if (valid.length === 1) {
      map.setView([valid[0].latitude!, valid[0].longitude!], 13)
    } else {
      const bounds = L.latLngBounds(valid.map((p) => [p.latitude!, p.longitude!] as [number, number]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [pings, map])
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
  const { data: assets = [] } = useAssets()
  const { data: items = [] } = useInventoryItems()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const tagMap = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags])

  const latestPings = useMemo(() => {
    const map = new Map<string, TrackingLog>()
    for (const l of logs) {
      if (l.latitude == null || l.longitude == null) continue
      if (entityFilter && l.entityType !== entityFilter) continue
      const existing = map.get(l.tagId)
      if (!existing || l.timestamp > existing.timestamp) map.set(l.tagId, l)
    }
    return Array.from(map.values())
  }, [logs, entityFilter])

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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains={['a', 'b', 'c', 'd']}
              />
              {latestPings.map((ping) => {
                const fresh = isFreshPing(ping)
                const tag = tagMap[ping.tagId]
                const fillColor = fresh ? '#10b981' : '#a1a1aa'
                return (
                  <CircleMarker
                    key={ping.id}
                    center={[ping.latitude!, ping.longitude!]}
                    radius={9}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor,
                      fillOpacity: 0.95,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-[12px]">
                        {tag && <p className="font-mono text-[10px] text-zinc-400">{tag.code}</p>}
                        <div>
                          <EntityLabel
                            type={ping.entityType}
                            id={ping.entityId}
                            vehicleMap={vehicleMap}
                            assetMap={assetMap}
                            itemMap={itemMap}
                          />
                        </div>
                        {ping.locationName && <p className="text-zinc-700 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ping.locationName}</p>}
                        <p className="font-mono text-[11px] text-zinc-500">{ping.latitude!.toFixed(4)}, {ping.longitude!.toFixed(4)}</p>
                        <p className="text-zinc-400">{formatDistanceToNow(parseISO(ping.timestamp), { addSuffix: true })}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
              <FitToBounds pings={latestPings} />
            </MapContainer>
          </div>
          <div className="px-4 py-3 border-t border-zinc-200/60 flex items-center justify-between text-[12px] text-zinc-500">
            <span>Tiles by CARTO · Data &copy; OpenStreetMap contributors</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Updated &lt; 24h
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Live entities ({latestPings.length})</p>
        {latestPings.map((ping) => {
          const fresh = isFreshPing(ping)
          return (
            <div key={ping.id} className="bg-white rounded-lg border border-zinc-200/60 px-3 py-2.5 flex items-center gap-3">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', fresh ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300')} />
              <div className="min-w-0 flex-1">
                <EntityLabel type={ping.entityType} id={ping.entityId} vehicleMap={vehicleMap} assetMap={assetMap} itemMap={itemMap} />
                <p className="text-[11px] text-zinc-400 mt-1 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {ping.locationName ?? `${ping.latitude!.toFixed(3)}, ${ping.longitude!.toFixed(3)}`}
                </p>
              </div>
              <span className="text-[10px] text-zinc-400 whitespace-nowrap flex-shrink-0">{formatDistanceToNow(parseISO(ping.timestamp), { addSuffix: true })}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

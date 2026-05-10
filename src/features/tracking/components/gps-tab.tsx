import { useMemo } from 'react'
import { MapPin, Satellite } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useTags, useTrackingLogs } from '@/features/tracking'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import { useInventoryItems } from '@/features/inventory'
import type { TrackingEntityType, TrackingLog } from '@/features/tracking/types'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { EntityLabel } from './entity-label'

interface GpsTabProps {
  /** When set, show only GPS-tagged entities of this type. */
  entityFilter?: TrackingEntityType
}

export function GpsTab({ entityFilter }: GpsTabProps = {}) {
  const { data: tags = [], isLoading: tagsLoading } = useTags()
  const { data: logs = [], isLoading: logsLoading } = useTrackingLogs()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()
  const { data: items = [] } = useInventoryItems()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const gpsTags = useMemo(
    () =>
      tags.filter(
        (t) =>
          t.type === 'gps' &&
          t.status === 'active' &&
          (!entityFilter || t.boundEntityType === entityFilter),
      ),
    [tags, entityFilter],
  )

  const latestByTag = useMemo(() => {
    const map: Record<string, TrackingLog> = {}
    for (const l of logs) {
      if (l.source !== 'gps') continue
      const existing = map[l.tagId]
      if (!existing || l.timestamp > existing.timestamp) {
        map[l.tagId] = l
      }
    }
    return map
  }, [logs])

  if (tagsLoading || logsLoading) return <TableSkeleton columns={4} rows={4} />

  if (gpsTags.length === 0) {
    const subject =
      entityFilter === 'vehicle' ? 'vehicles' : entityFilter === 'asset' ? 'assets' : 'entities'
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={Satellite}
          title={`No GPS-enabled ${subject}`}
          description={`Bind a GPS tag to a ${subject.replace(/s$/, '')} to start tracking it here.`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {gpsTags.map((tag) => {
        const ping = latestByTag[tag.id]
        return (
          <div key={tag.id} className="bg-white rounded-xl border border-zinc-200/60 px-5 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <Satellite className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-zinc-400">{tag.code}</span>
                <span className="text-zinc-300">·</span>
                <EntityLabel type={tag.boundEntityType} id={tag.boundEntityId} vehicleMap={vehicleMap} assetMap={assetMap} itemMap={itemMap} />
              </div>
              {ping ? (
                <div className="mt-2 flex items-center gap-3 flex-wrap text-[12px]">
                  {ping.latitude != null && ping.longitude != null && (
                    <span className="font-mono text-zinc-700 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {ping.latitude.toFixed(4)}, {ping.longitude.toFixed(4)}
                    </span>
                  )}
                  {ping.locationName && <span className="text-zinc-500">· {ping.locationName}</span>}
                  <span className="text-zinc-400">· {formatDistanceToNow(parseISO(ping.timestamp), { addSuffix: true })}</span>
                </div>
              ) : (
                <p className="text-[12px] text-zinc-400 mt-1">No GPS pings recorded yet</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { MapPin, Tag as TagIcon, Satellite, ScanLine, Inbox } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { useEntityTracking } from '@/shared/tracking/hooks/use-entity-tracking'
import type { TrackingEntityType, TagType, TrackingSource } from '@/features/tracking'
import { Spinner } from '@/shared/ui/spinner'
import { cn } from '@/shared/utils/cn'

interface TrackingPanelProps {
  entityType: TrackingEntityType
  entityId: string
  /** Optional override label for the empty state. */
  emptyMessage?: string
  /** Limit on logs shown (default 10). */
  logLimit?: number
}

const tagIconByType: Record<TagType, typeof TagIcon> = {
  rfid: TagIcon,
  qr: TagIcon,
  gps: Satellite,
}

const tagColorByType: Record<TagType, { bg: string; color: string; label: string }> = {
  rfid: { bg: 'bg-violet-50', color: 'text-violet-600', label: 'RFID' },
  qr: { bg: 'bg-blue-50', color: 'text-blue-600', label: 'QR' },
  gps: { bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'GPS' },
}

const sourceLabel: Record<TrackingSource, string> = {
  gps: 'GPS ping',
  scan: 'Scan',
}

const sourceColor: Record<TrackingSource, string> = {
  gps: 'bg-emerald-50 text-emerald-700',
  scan: 'bg-blue-50 text-blue-700',
}

/**
 * Reusable tracking surface for any owning module's entity detail (asset, vehicle, item).
 * Renders the bound tag(s), last-seen marker, and a recent activity log. Drop into a
 * modal or detail drawer; pulls its own data via useEntityTracking.
 */
export function TrackingPanel({ entityType, entityId, emptyMessage, logLimit = 10 }: TrackingPanelProps) {
  const { isLoading, tags, logs, latest, lastSeenAt } = useEntityTracking(entityType, entityId)

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (tags.length === 0 && logs.length === 0) {
    return (
      <div className="py-10 px-6 text-center">
        <MapPin className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-[14px] font-medium text-zinc-700">No tracking yet</p>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          {emptyMessage ?? 'This entity has no bound tags and no scan history.'}
        </p>
      </div>
    )
  }

  const visibleLogs = logs.slice(0, logLimit)

  return (
    <div className="space-y-5">
      {/* Tags */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Bound Tags</p>
        {tags.length === 0 ? (
          <p className="text-[12.5px] text-zinc-500">No tags bound to this entity.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const Icon = tagIconByType[tag.type]
              const colors = tagColorByType[tag.type]
              return (
                <div
                  key={tag.id}
                  className={cn(
                    'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border',
                    tag.status === 'active' ? 'border-zinc-200' : 'border-zinc-100 opacity-60',
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', colors.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', colors.color)} />
                  </div>
                  <div>
                    <p className="text-[12px] font-mono text-zinc-700">{tag.code}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      {colors.label} · {tag.status}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Last Seen */}
      {latest && (
        <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Last Seen</p>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-zinc-900">
                {latest.locationName ?? 'Unknown location'}
              </p>
              {latest.latitude !== undefined && latest.longitude !== undefined && (
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
                </p>
              )}
              <p className="text-[12px] text-zinc-500 mt-1">
                {lastSeenAt ? formatDistanceToNow(parseISO(lastSeenAt), { addSuffix: true }) : '—'}
                {' · '}
                {sourceLabel[latest.source]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
            Recent Activity
          </p>
          {logs.length > visibleLogs.length && (
            <span className="text-[11px] text-zinc-400">
              Showing {visibleLogs.length} of {logs.length}
            </span>
          )}
        </div>
        {visibleLogs.length === 0 ? (
          <div className="rounded-lg border border-zinc-200/60 px-4 py-6 text-center">
            <Inbox className="w-5 h-5 text-zinc-300 mx-auto mb-1.5" />
            <p className="text-[12.5px] text-zinc-500">No scans or pings yet</p>
          </div>
        ) : (
          <ul className="rounded-lg border border-zinc-200/60 overflow-hidden">
            {visibleLogs.map((log, i) => (
              <li
                key={log.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-2.5',
                  i !== visibleLogs.length - 1 && 'border-b border-zinc-100/60',
                )}
              >
                <div className="w-6 h-6 rounded-md bg-zinc-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ScanLine className="w-3 h-3 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-medium text-zinc-700 truncate">
                      {log.locationName ?? 'Unknown location'}
                    </span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider',
                        sourceColor[log.source],
                      )}
                    >
                      {sourceLabel[log.source]}
                    </span>
                  </div>
                  {log.latitude !== undefined && log.longitude !== undefined && (
                    <p className="text-[10.5px] font-mono text-zinc-400 mt-0.5">
                      {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-zinc-400 whitespace-nowrap flex-shrink-0">
                  {format(parseISO(log.timestamp), 'MMM d, HH:mm')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

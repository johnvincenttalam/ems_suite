import { useMemo } from 'react'
import { useTags, useTrackingLogs } from '@/features/tracking'
import type { TrackingEntityType, TrackingTag, TrackingLog } from '@/features/tracking'

export interface EntityTrackingResult {
  isLoading: boolean
  /** Tags currently bound to this entity (multiple if e.g. has both QR and GPS). */
  tags: TrackingTag[]
  /** Logs for this entity, newest first. */
  logs: TrackingLog[]
  /** Most recent log timestamp, undefined if none. */
  lastSeenAt?: string
  /** Most recent log entry — convenient for "where is it now" displays. */
  latest?: TrackingLog
}

/**
 * Read-only view of tracking data scoped to a single entity. Pulls from the
 * cross-cutting tracking module so any owning feature (assets, fleet, inventory)
 * can render location/scan information without duplicating queries.
 */
export function useEntityTracking(
  entityType: TrackingEntityType,
  entityId: string | undefined,
): EntityTrackingResult {
  const { data: allTags = [], isLoading: tagsLoading } = useTags()
  const { data: allLogs = [], isLoading: logsLoading } = useTrackingLogs()

  return useMemo(() => {
    if (!entityId) {
      return { isLoading: tagsLoading || logsLoading, tags: [], logs: [] }
    }
    const tags = allTags.filter(
      (t) => t.boundEntityType === entityType && t.boundEntityId === entityId,
    )
    const logs = allLogs
      .filter((l) => l.entityType === entityType && l.entityId === entityId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    const latest = logs[0]
    return {
      isLoading: tagsLoading || logsLoading,
      tags,
      logs,
      lastSeenAt: latest?.timestamp,
      latest,
    }
  }, [allTags, allLogs, entityType, entityId, tagsLoading, logsLoading])
}

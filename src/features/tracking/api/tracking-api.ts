import type { TrackingTag, TrackingLog } from '@/features/tracking/types'
import { mockTrackingTags, mockTrackingLogs } from '@/features/tracking/data/mock-tracking'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * Tracking API — swap with real HTTP when backend is ready:
 *   listTags:   () => http.get<TrackingTag[]>('/tracking/tags')
 *   bindTag:    (body) => http.post<TrackingTag>('/tracking/tags', body)
 *   listLogs:   (params?) => http.get<TrackingLog[]>('/tracking/logs', { search: params })
 *   ingestPing: (body) => http.post<TrackingLog>('/tracking/logs', body) // device callback
 */
export const trackingApi = {
  listTags: async (): Promise<TrackingTag[]> => {
    await delay()
    return mockTrackingTags
  },
  listLogs: async (): Promise<TrackingLog[]> => {
    await delay()
    return [...mockTrackingLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  },
}

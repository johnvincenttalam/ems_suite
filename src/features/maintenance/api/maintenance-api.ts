import type { WorkOrder } from '@/features/maintenance/types'
import { mockWorkOrders } from '@/features/maintenance/data/mock-maintenance'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * Maintenance API — swap with real HTTP when backend is ready:
 *   list:     () => http.get<WorkOrder[]>('/maintenance/work-orders')
 *   create:   (body) => http.post<WorkOrder>('/maintenance/work-orders', body)
 *   start:    (id) => http.post<WorkOrder>(`/maintenance/work-orders/${id}/start`)
 *   complete: (id) => http.post<WorkOrder>(`/maintenance/work-orders/${id}/complete`)
 */
export const maintenanceApi = {
  list: async (): Promise<WorkOrder[]> => {
    await delay()
    return [...mockWorkOrders].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  },
}

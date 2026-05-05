import type { QmsTemplate, QmsReport } from '@/features/qms/types'
import { mockQmsTemplates, mockQmsReports } from '@/features/qms/data/mock-qms'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * QMS API — swap with real HTTP when backend is ready:
 *   listTemplates:  () => http.get<QmsTemplate[]>('/qms/templates')
 *   listReports:    () => http.get<QmsReport[]>('/qms/reports')
 *   createReport:   (body) => http.post<QmsReport>('/qms/reports', body)
 *   publishReport:  (id) => http.post<QmsReport>(`/qms/reports/${id}/publish`)
 */
export const qmsApi = {
  listTemplates: async (): Promise<QmsTemplate[]> => {
    await delay()
    return mockQmsTemplates
  },
  listReports: async (): Promise<QmsReport[]> => {
    await delay()
    return [...mockQmsReports].sort((a, b) => b.periodStart.localeCompare(a.periodStart))
  },
}

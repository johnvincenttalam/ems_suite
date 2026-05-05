import type { ChecklistTemplate, ChecklistAssignment } from '@/features/checklists/types'
import { mockChecklistTemplates, mockChecklistAssignments } from '@/features/checklists/data/mock-checklists'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * Checklists API — swap with real HTTP when backend is ready:
 *   listTemplates:    () => http.get<ChecklistTemplate[]>('/checklists/templates')
 *   createTemplate:   (body) => http.post<ChecklistTemplate>('/checklists/templates', body)
 *   listAssignments:  () => http.get<ChecklistAssignment[]>('/checklists/assignments')
 *   assign:           (body) => http.post<ChecklistAssignment>('/checklists/assignments', body)
 *   submitResults:    (id, results) => http.post<ChecklistAssignment>(`/checklists/assignments/${id}/submit`, { results })
 */
export const checklistsApi = {
  listTemplates: async (): Promise<ChecklistTemplate[]> => {
    await delay()
    return mockChecklistTemplates
  },
  listAssignments: async (): Promise<ChecklistAssignment[]> => {
    await delay()
    return [...mockChecklistAssignments].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))
  },
}

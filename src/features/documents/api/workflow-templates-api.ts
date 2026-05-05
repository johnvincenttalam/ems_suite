import type { WorkflowTemplate } from '../types'
import { mockWorkflowTemplates } from '../data/mock-workflow-templates'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 200 + 100))

/**
 * Workflow templates API. Swap with real HTTP when backend is ready:
 *   list: () => http.get<WorkflowTemplate[]>('/workflow-templates')
 */
export const workflowTemplatesApi = {
  list: async (): Promise<WorkflowTemplate[]> => {
    await delay()
    return [...mockWorkflowTemplates]
  },
}

import { useQuery } from '@tanstack/react-query'
import { workflowTemplatesApi } from '../api/workflow-templates-api'

export function useWorkflowTemplates() {
  return useQuery({ queryKey: ['workflow-templates'], queryFn: workflowTemplatesApi.list })
}

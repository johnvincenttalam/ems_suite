import { useAssignments } from '@/features/checklists'
import { ResultsTab } from '@/features/checklists/components/results-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ResultsPage() {
  const { data: assignments = [] } = useAssignments()
  const completed = assignments.filter((a) => a.status === 'completed').length

  return (
    <div>
      <PageHeader
        title="Checklist Results"
        subtitle={`${completed} completed`}
      />
      <ResultsTab />
    </div>
  )
}

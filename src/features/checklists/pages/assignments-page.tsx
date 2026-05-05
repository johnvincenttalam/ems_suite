import { useAssignments } from '@/features/checklists'
import { AssignmentsTab } from '@/features/checklists/components/assignments-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function AssignmentsPage() {
  const { data: assignments = [] } = useAssignments()
  const active = assignments.filter((a) => a.status !== 'completed').length

  return (
    <div>
      <PageHeader
        title="Checklist Assignments"
        subtitle={`${active} active · ${assignments.length} total`}
      />
      <AssignmentsTab />
    </div>
  )
}

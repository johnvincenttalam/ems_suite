import { useAssetAssignments } from '@/features/assets'
import { AssignmentsTab } from '@/features/assets/components/assignments-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function AssignmentsPage() {
  const { data: assignments = [] } = useAssetAssignments()
  const active = assignments.filter((a) => !a.returnedDate).length

  return (
    <div>
      <PageHeader
        title="Asset Assignments"
        subtitle={`${assignments.length} total · ${active} currently assigned`}
      />
      <AssignmentsTab />
    </div>
  )
}

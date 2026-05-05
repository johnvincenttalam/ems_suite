import { useDocuments } from '@/features/documents'
import { WorkflowTab } from '@/features/documents/components/workflow-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function WorkflowPage() {
  const { data: documents = [] } = useDocuments()
  const inReview = documents.filter((d) => d.status === 'in_review').length

  return (
    <div>
      <PageHeader
        title="Workflow"
        subtitle={`${inReview} document${inReview === 1 ? '' : 's'} awaiting approval`}
      />
      <WorkflowTab />
    </div>
  )
}

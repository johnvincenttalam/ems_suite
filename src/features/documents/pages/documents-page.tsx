import { useDocuments } from '@/features/documents'
import { DocumentsTab } from '@/features/documents/components/documents-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function DocumentsPage() {
  const { data: documents = [] } = useDocuments()

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} document${documents.length === 1 ? '' : 's'}`}
      />
      <DocumentsTab />
    </div>
  )
}

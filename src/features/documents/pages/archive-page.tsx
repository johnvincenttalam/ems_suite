import { useDocuments } from '@/features/documents'
import { ArchiveTab } from '@/features/documents/components/archive-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ArchivePage() {
  const { data: documents = [] } = useDocuments()
  const archived = documents.filter((d) => d.status === 'archived').length

  return (
    <div>
      <PageHeader
        title="Archive"
        subtitle={`${archived} archived document${archived === 1 ? '' : 's'}`}
      />
      <ArchiveTab />
    </div>
  )
}

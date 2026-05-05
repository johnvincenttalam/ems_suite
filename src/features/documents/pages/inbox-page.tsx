import { useDocuments } from '@/features/documents'
import { InboxTab } from '@/features/documents/components/inbox-tab'
import { getLifecyclePhase } from '@/features/documents/types'
import { PageHeader } from '@/shared/ui/page-header'

export function InboxPage() {
  const { data: documents = [] } = useDocuments()
  const inbox = documents.filter((d) => getLifecyclePhase(d) === 'inbox').length

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle={`${inbox} document${inbox === 1 ? '' : 's'} pending classification`}
      />
      <InboxTab />
    </div>
  )
}

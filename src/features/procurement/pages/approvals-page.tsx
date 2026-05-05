import { useRequests } from '@/features/procurement'
import { ApprovalsTab } from '@/features/procurement/components/approvals-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ApprovalsPage() {
  const { data: requests = [] } = useRequests()
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={pending > 0 ? `${pending} pending` : 'All caught up'}
      />
      <ApprovalsTab />
    </div>
  )
}

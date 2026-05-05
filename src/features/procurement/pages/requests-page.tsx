import { useRequests } from '@/features/procurement'
import { RequestsTab } from '@/features/procurement/components/requests-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function RequestsPage() {
  const { data: requests = [] } = useRequests()
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div>
      <PageHeader
        title="Requests"
        subtitle={pending > 0 ? `${requests.length} total · ${pending} pending approval` : `${requests.length} total`}
      />
      <RequestsTab />
    </div>
  )
}

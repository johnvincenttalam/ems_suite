import { useWorkOrders } from '@/features/maintenance'
import { WorkOrdersTab } from '@/features/maintenance/components/work-orders-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function WorkOrdersPage() {
  const { data: workOrders = [] } = useWorkOrders()
  const active = workOrders.filter((w) => w.status === 'pending' || w.status === 'ongoing').length

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle={active > 0 ? `${workOrders.length} total · ${active} active` : `${workOrders.length} total`}
      />
      <WorkOrdersTab />
    </div>
  )
}

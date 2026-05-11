import { useWorkOrders } from '@/features/maintenance'
import { ScheduleTab } from '@/features/maintenance/components/schedule-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function SchedulePage() {
  const { data: workOrders = [] } = useWorkOrders()
  const active = workOrders.filter((w) => w.status === 'pending' || w.status === 'ongoing').length

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle={`${active} active work orders`}
      />
      <ScheduleTab />
    </div>
  )
}

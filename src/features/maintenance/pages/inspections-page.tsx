import { useWorkOrders } from '@/features/maintenance'
import { InspectionsTab } from '@/features/maintenance/components/inspections-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function InspectionsPage() {
  const { data: workOrders = [] } = useWorkOrders()
  const inspections = workOrders.filter((w) => w.type === 'inspection' && w.status !== 'cancelled')
  const pending = inspections.filter((w) => w.status !== 'completed').length

  return (
    <div>
      <PageHeader
        title="Inspections"
        subtitle={
          pending > 0
            ? `${inspections.length} total · ${pending} pending`
            : `${inspections.length} inspection${inspections.length === 1 ? '' : 's'}`
        }
      />
      <InspectionsTab />
    </div>
  )
}

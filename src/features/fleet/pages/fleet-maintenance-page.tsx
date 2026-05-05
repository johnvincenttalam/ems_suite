import { FleetMaintenanceTab } from '@/features/fleet/components/fleet-maintenance-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function FleetMaintenancePage() {
  return (
    <div>
      <PageHeader
        title="Vehicle Maintenance"
        subtitle="Work orders for vehicles in the fleet"
      />
      <FleetMaintenanceTab />
    </div>
  )
}

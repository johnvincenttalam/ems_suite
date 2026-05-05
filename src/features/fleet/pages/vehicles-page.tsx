import { useVehicles } from '@/features/fleet'
import { VehiclesTab } from '@/features/fleet/components/vehicles-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function VehiclesPage() {
  const { data: vehicles = [] } = useVehicles()
  const active = vehicles.filter((v) => v.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} vehicles · ${active} active`}
      />
      <VehiclesTab />
    </div>
  )
}

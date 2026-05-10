import { GpsTab } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function FleetTrackingGpsPage() {
  return (
    <div>
      <PageHeader
        title="GPS Real-Time"
        subtitle="Live telemetry from GPS-tagged vehicles"
      />
      <GpsTab entityFilter="vehicle" />
    </div>
  )
}

import { useTrips } from '@/features/fleet'
import { TripsTab } from '@/features/fleet/components/trips-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function TripsPage() {
  const { data: trips = [] } = useTrips()
  const inProgress = trips.filter((t) => t.status === 'in_progress').length

  return (
    <div>
      <PageHeader
        title="Trips"
        subtitle={inProgress > 0 ? `${trips.length} total · ${inProgress} in progress` : `${trips.length} total`}
      />
      <TripsTab />
    </div>
  )
}

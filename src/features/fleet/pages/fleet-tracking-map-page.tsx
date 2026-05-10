import { useTags } from '@/features/tracking'
import { MapTab } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function FleetTrackingMapPage() {
  const { data: tags = [] } = useTags()
  const gps = tags.filter(
    (t) => t.boundEntityType === 'vehicle' && t.type === 'gps' && t.status === 'active',
  ).length

  return (
    <div>
      <PageHeader
        title="Live Map"
        subtitle={`${gps} active GPS device${gps === 1 ? '' : 's'} on vehicles`}
      />
      <MapTab entityFilter="vehicle" />
    </div>
  )
}

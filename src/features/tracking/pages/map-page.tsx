import { useTags } from '@/features/tracking'
import { MapTab } from '@/features/tracking/components/map-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function MapPage() {
  const { data: tags = [] } = useTags()
  const gps = tags.filter((t) => t.type === 'gps' && t.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Live Map"
        subtitle={`${gps} active GPS device${gps === 1 ? '' : 's'}`}
      />
      <MapTab />
    </div>
  )
}

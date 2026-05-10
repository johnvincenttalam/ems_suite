import { MapTab, useTags } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function AssetsTrackingMapPage() {
  const { data: tags = [] } = useTags()
  const tagged = tags.filter((t) => t.boundEntityType === 'asset' && t.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Live Map"
        subtitle={`${tagged} active asset tag${tagged === 1 ? '' : 's'}`}
      />
      <MapTab entityFilter="asset" />
    </div>
  )
}

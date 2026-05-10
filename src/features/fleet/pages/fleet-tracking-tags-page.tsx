import { TagsTab, useTags } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function FleetTrackingTagsPage() {
  const { data: tags = [] } = useTags()
  const vehicleTags = tags.filter((t) => t.boundEntityType === 'vehicle')
  const active = vehicleTags.filter((t) => t.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Tags"
        subtitle={`${vehicleTags.length} vehicle tag${vehicleTags.length === 1 ? '' : 's'} · ${active} active`}
      />
      <TagsTab entityFilter="vehicle" />
    </div>
  )
}

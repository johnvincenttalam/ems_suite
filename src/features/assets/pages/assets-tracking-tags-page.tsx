import { TagsTab, useTags } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function AssetsTrackingTagsPage() {
  const { data: tags = [] } = useTags()
  const assetTags = tags.filter((t) => t.boundEntityType === 'asset')
  const active = assetTags.filter((t) => t.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Tags"
        subtitle={`${assetTags.length} asset tag${assetTags.length === 1 ? '' : 's'} · ${active} active`}
      />
      <TagsTab entityFilter="asset" />
    </div>
  )
}

import { useTags } from '@/features/tracking'
import { TagsTab } from '@/features/tracking/components/tags-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function TagsPage() {
  const { data: tags = [] } = useTags()
  const active = tags.filter((t) => t.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Tags"
        subtitle={`${tags.length} bound · ${active} active`}
      />
      <TagsTab />
    </div>
  )
}

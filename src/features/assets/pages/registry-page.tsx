import { useAssets } from '@/features/assets'
import { RegistryTab } from '@/features/assets/components/registry-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function RegistryPage() {
  const { data: assets = [] } = useAssets()
  const active = assets.filter((a) => a.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Asset Registry"
        subtitle={`${assets.length} registered · ${active} active`}
      />
      <RegistryTab />
    </div>
  )
}

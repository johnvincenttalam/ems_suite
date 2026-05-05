import { useTags } from '@/features/tracking'
import { GpsTab } from '@/features/tracking/components/gps-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function GpsPage() {
  const { data: tags = [] } = useTags()
  const gps = tags.filter((t) => t.type === 'gps' && t.status === 'active').length

  return (
    <div>
      <PageHeader
        title="GPS Devices"
        subtitle={`${gps} active GPS device${gps === 1 ? '' : 's'}`}
      />
      <GpsTab />
    </div>
  )
}

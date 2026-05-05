import { useTrackingLogs } from '@/features/tracking'
import { ScansTab } from '@/features/tracking/components/scans-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ScansPage() {
  const { data: logs = [] } = useTrackingLogs()

  return (
    <div>
      <PageHeader
        title="Scan History"
        subtitle={`${logs.length} events`}
      />
      <ScansTab />
    </div>
  )
}

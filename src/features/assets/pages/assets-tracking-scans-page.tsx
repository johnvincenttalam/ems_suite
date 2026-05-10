import { ScansTab, useTrackingLogs } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function AssetsTrackingScansPage() {
  const { data: logs = [] } = useTrackingLogs()
  const assetLogs = logs.filter((l) => l.entityType === 'asset').length

  return (
    <div>
      <PageHeader
        title="Scan History"
        subtitle={`${assetLogs.toLocaleString()} asset scan${assetLogs === 1 ? '' : 's'} recorded`}
      />
      <ScansTab entityFilter="asset" />
    </div>
  )
}

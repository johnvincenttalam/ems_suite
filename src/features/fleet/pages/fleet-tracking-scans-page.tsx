import { ScansTab, useTrackingLogs } from '@/features/tracking'
import { PageHeader } from '@/shared/ui/page-header'

export function FleetTrackingScansPage() {
  const { data: logs = [] } = useTrackingLogs()
  const vehicleLogs = logs.filter((l) => l.entityType === 'vehicle').length

  return (
    <div>
      <PageHeader
        title="Scan History"
        subtitle={`${vehicleLogs.toLocaleString()} vehicle scan${vehicleLogs === 1 ? '' : 's'} recorded`}
      />
      <ScansTab entityFilter="vehicle" />
    </div>
  )
}

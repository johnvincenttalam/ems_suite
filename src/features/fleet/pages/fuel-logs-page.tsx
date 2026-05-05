import { useFuelLogs } from '@/features/fleet'
import { FuelLogsTab } from '@/features/fleet/components/fuel-logs-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function FuelLogsPage() {
  const { data: fuelLogs = [] } = useFuelLogs()

  return (
    <div>
      <PageHeader
        title="Fuel Logs"
        subtitle={`${fuelLogs.length} entries`}
      />
      <FuelLogsTab />
    </div>
  )
}

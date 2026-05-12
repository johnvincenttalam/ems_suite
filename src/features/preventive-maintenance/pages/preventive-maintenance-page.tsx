import { format } from 'date-fns'
import { usePreventiveSchedules } from '@/features/preventive-maintenance/hooks/use-preventive-schedules'
import { PreventiveSchedulesTab } from '@/features/preventive-maintenance/components/preventive-schedules-tab'
import { isUsageInterval } from '@/features/preventive-maintenance/types'
import { useAssets } from '@/features/assets'
import { PageHeader } from '@/shared/ui/page-header'

export function PreventiveMaintenancePage() {
  const { data: schedules = [] } = usePreventiveSchedules()
  const { data: assets = [] } = useAssets()
  const assetById: Record<string, typeof assets[number]> = Object.fromEntries(assets.map((a) => [a.id, a]))
  const today = format(new Date(), 'yyyy-MM-dd')
  const active = schedules.filter((s) => s.status === 'active').length
  const due = schedules.filter((s) => {
    if (s.status !== 'active') return false
    if (isUsageInterval(s.intervalUnit)) {
      const asset = assetById[s.assetId]
      if (!asset || asset.currentMeter === undefined || s.lastServiceMeter === undefined) return false
      return asset.currentMeter >= s.lastServiceMeter + s.intervalValue
    }
    return s.nextServiceDate <= today
  }).length

  return (
    <div>
      <PageHeader
        title="Preventive Maintenance"
        subtitle={
          due > 0
            ? `${active} active · ${due} due now`
            : `${active} active schedule${active === 1 ? '' : 's'}`
        }
      />
      <PreventiveSchedulesTab />
    </div>
  )
}

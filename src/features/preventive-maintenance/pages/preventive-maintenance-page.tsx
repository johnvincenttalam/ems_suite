import { format } from 'date-fns'
import { usePreventiveSchedules } from '@/features/preventive-maintenance/hooks/use-preventive-schedules'
import { PreventiveSchedulesTab } from '@/features/preventive-maintenance/components/preventive-schedules-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function PreventiveMaintenancePage() {
  const { data: schedules = [] } = usePreventiveSchedules()
  const today = format(new Date(), 'yyyy-MM-dd')
  const active = schedules.filter((s) => s.status === 'active').length
  const due = schedules.filter((s) => s.status === 'active' && s.nextServiceDate <= today).length

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

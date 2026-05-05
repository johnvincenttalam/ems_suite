import { TechniciansTab } from '@/features/maintenance/components/technicians-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function TechniciansPage() {
  return (
    <div>
      <PageHeader
        title="Technicians"
        subtitle="Workload and assignments by technician"
      />
      <TechniciansTab />
    </div>
  )
}

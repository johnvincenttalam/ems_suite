import { ReportsTab } from '@/features/procurement/components/reports-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ProcurementReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Spend analytics, approval throughput, supplier breakdowns"
      />
      <ReportsTab />
    </div>
  )
}

import { ReportsTab } from '@/features/documents/components/reports-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function SdmsReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Document analytics, breakdowns, and CSV export"
      />
      <ReportsTab />
    </div>
  )
}

import { useQmsReports } from '@/features/qms'
import { ReportsTab } from '@/features/qms/components/reports-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ReportsPage() {
  const { data: reports = [] } = useQmsReports()
  const drafts = reports.filter((r) => r.status === 'draft').length

  return (
    <div>
      <PageHeader
        title="Quality Reports"
        subtitle={`${reports.length} reports · ${drafts} draft`}
      />
      <ReportsTab />
    </div>
  )
}

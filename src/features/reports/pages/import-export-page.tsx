import { ImportExportTab } from '@/features/reports/components/import-export-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ImportExportPage() {
  return (
    <div>
      <PageHeader
        title="Import / Export"
        subtitle="Bulk dataset download and CSV import preview"
      />
      <ImportExportTab />
    </div>
  )
}

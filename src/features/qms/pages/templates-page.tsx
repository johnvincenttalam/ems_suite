import { useQmsTemplates } from '@/features/qms'
import { TemplatesTab } from '@/features/qms/components/templates-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function TemplatesPage() {
  const { data: templates = [] } = useQmsTemplates()

  return (
    <div>
      <PageHeader
        title="Report Templates"
        subtitle={`${templates.length} reusable templates`}
      />
      <TemplatesTab />
    </div>
  )
}

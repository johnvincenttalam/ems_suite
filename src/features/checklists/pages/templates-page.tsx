import { useTemplates } from '@/features/checklists'
import { TemplatesTab } from '@/features/checklists/components/templates-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function TemplatesPage() {
  const { data: templates = [] } = useTemplates()

  return (
    <div>
      <PageHeader
        title="Checklist Templates"
        subtitle={`${templates.length} reusable templates`}
      />
      <TemplatesTab />
    </div>
  )
}

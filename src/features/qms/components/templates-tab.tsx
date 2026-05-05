import { Award, FileSpreadsheet, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useQmsTemplates, useQmsReports } from '@/features/qms'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'

export function TemplatesTab() {
  const { data: templates = [], isLoading } = useQmsTemplates()
  const { data: reports = [] } = useQmsReports()

  const usageCount = (templateId: string) => reports.filter((r) => r.templateId === templateId).length

  if (isLoading) return <TableSkeleton columns={3} rows={3} />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-zinc-500">Reusable report definitions. New reports inherit the template's sections and KPI targets.</p>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => toast.info('Template editor coming soon')}>New Template</Button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200/60">
          <EmptyState icon={Award} title="No templates yet" description="Create your first QMS template to start running monthly reports." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const totalMetrics = tpl.sections.reduce((s, sec) => s + sec.metrics.length, 0)
            return (
              <div key={tpl.id} className="bg-white rounded-xl border border-zinc-200/60 p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0"><FileSpreadsheet className="w-4 h-4 text-zinc-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-zinc-400">{tpl.id}</p>
                    <p className="text-[14px] font-semibold text-zinc-900 truncate">{tpl.name}</p>
                    {tpl.description && <p className="text-[12px] text-zinc-500 mt-0.5 line-clamp-2">{tpl.description}</p>}
                  </div>
                </div>

                <div className="space-y-2 mb-3 flex-1">
                  {tpl.sections.map((s) => (
                    <div key={s.id} className="flex items-baseline justify-between text-[12px] border-b border-zinc-100 last:border-b-0 pb-1.5">
                      <span className="text-zinc-700 font-medium">{s.title}</span>
                      <span className="text-zinc-400 tabular-nums">{s.metrics.length} {s.metrics.length === 1 ? 'metric' : 'metrics'}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-400">
                  <span>{tpl.sections.length} sections · {totalMetrics} metrics</span>
                  <span>{usageCount(tpl.id)} reports · {format(parseISO(tpl.createdAt), 'MMM yyyy')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

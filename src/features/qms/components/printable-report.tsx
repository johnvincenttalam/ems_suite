import { format, parseISO } from 'date-fns'
import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useQmsTemplates } from '@/features/qms'
import { useUsers } from '@/features/users'
import type { QmsReport } from '@/features/qms/types'
import { appConfig } from '@/config/app'
import { Button } from '@/shared/ui/button'
import { MetricRow } from './metric-row'

interface PrintableReportProps {
  report: QmsReport
  /** Auto-trigger window.print() once the layout has rendered. */
  autoPrint?: boolean
}

export function PrintableReport({ report, autoPrint = false }: PrintableReportProps) {
  const { data: templates = [] } = useQmsTemplates()
  const { data: users = [] } = useUsers()

  const template = templates.find((t) => t.id === report.templateId)
  const preparedBy = users.find((u) => u.id === report.preparedBy)
  const publishedBy = report.publishedBy ? users.find((u) => u.id === report.publishedBy) : null

  useEffect(() => {
    if (!autoPrint) return
    const t = setTimeout(() => window.print(), 50)
    return () => clearTimeout(t)
  }, [autoPrint, report.id])

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
          .no-print { display: none !important; }
          @page { margin: 18mm; size: A4; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-end">
        <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
      </div>

      <div id="printable-area" className="bg-white rounded-xl border border-zinc-200/60 p-8 max-w-3xl mx-auto print:border-0 print:rounded-none print:shadow-none">
        <header className="border-b border-zinc-200 pb-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-semibold">{appConfig.shortName ?? appConfig.name} · QMS Report</p>
              <h1 className="text-2xl font-semibold text-zinc-900 mt-1 tracking-tight">{template?.name ?? '—'}</h1>
              <p className="text-[13px] text-zinc-600 mt-1">
                Period: {format(parseISO(report.periodStart), 'd MMMM yyyy')} – {format(parseISO(report.periodEnd), 'd MMMM yyyy')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[11px] text-zinc-400">{report.id}</p>
              <p className="text-[12px] text-zinc-500 mt-1">Status: <span className="capitalize">{report.status}</span></p>
            </div>
          </div>
        </header>

        {report.summary && (
          <section className="mb-6">
            <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Summary</h2>
            <p className="text-[14px] text-zinc-800 leading-relaxed">{report.summary}</p>
          </section>
        )}

        {report.sections.map((section) => (
          <section key={section.templateSectionId} className="mb-6 break-inside-avoid">
            <h2 className="text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-3 border-b border-zinc-100 pb-1">{section.title}</h2>
            <div className="space-y-2">
              {section.metrics.map((m) => (
                <MetricRow key={m.templateMetricId} metric={m} />
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-10 pt-6 border-t border-zinc-200 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Prepared By</p>
            <p className="text-[13px] text-zinc-900 font-medium">{preparedBy?.name ?? '—'}</p>
            <p className="text-[12px] text-zinc-500">{format(parseISO(report.preparedAt), 'd MMMM yyyy, HH:mm')}</p>
            <div className="mt-8 border-t border-zinc-300 pt-1 max-w-[220px]">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Signature</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Approved By</p>
            {publishedBy && report.publishedAt ? (
              <>
                <p className="text-[13px] text-zinc-900 font-medium">{publishedBy.name}</p>
                <p className="text-[12px] text-zinc-500">{format(parseISO(report.publishedAt), 'd MMMM yyyy, HH:mm')}</p>
              </>
            ) : (
              <p className="text-[13px] text-zinc-400 italic">Pending approval</p>
            )}
            <div className="mt-8 border-t border-zinc-300 pt-1 max-w-[220px]">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Signature</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

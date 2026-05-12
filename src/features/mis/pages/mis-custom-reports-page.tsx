import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { Download, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { useInventoryItems } from '@/features/inventory'
import { useAssets } from '@/features/assets'
import { useWorkOrders } from '@/features/maintenance'
import { useRequests } from '@/features/procurement'
import { useVehicles, useFuelLogs } from '@/features/fleet'
import { useAuthStore } from '@/features/auth'
import { exportToXLSX } from '@/shared/utils/export-xlsx'
import { exportToPDF } from '@/shared/utils/export-pdf'
import {
  REPORT_TEMPLATES,
  buildReport,
  type ReportTemplateKey,
  type DateRange,
} from '@/features/mis/lib/report-templates'

type ReportFormat = 'pdf' | 'excel'

interface SavedReport {
  id: string
  templateKey: ReportTemplateKey
  templateLabel: string
  format: ReportFormat
  rangeFrom: string
  rangeTo: string
  rowCount: number
  generatedAt: string
  generatedBy: string
  /** Snapshot of the built report so we can re-download without re-running. */
  snapshot: {
    rows: Record<string, unknown>[]
    columns: { key: string; label: string }[]
    filename: string
    pdfTitle: string
    pdfSubtitle: string
  }
}

let reportCounter = 0

/**
 * Cross-module report builder. Each template is a pure derivation over the
 * already-fetched module queries — no new API calls. Generated reports are
 * kept in-memory for the session so re-download is one click.
 */
export function MisCustomReportsPage() {
  const { data: items = [] } = useInventoryItems()
  const { data: assets = [] } = useAssets()
  const { data: workOrders = [] } = useWorkOrders()
  const { data: requests = [] } = useRequests()
  const { data: vehicles = [] } = useVehicles()
  const { data: fuelLogs = [] } = useFuelLogs()
  const currentUser = useAuthStore((s) => s.user)

  const today = format(new Date(), 'yyyy-MM-dd')
  const monthAgo = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')

  const [templateKey, setTemplateKey] = useState<ReportTemplateKey>('procurement-spend')
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [reportFormat, setReportFormat] = useState<ReportFormat>('excel')
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState<SavedReport[]>([])

  const templateMeta = REPORT_TEMPLATES.find((t) => t.key === templateKey)!

  function resetForm() {
    setTemplateKey('procurement-spend')
    setFrom(monthAgo)
    setTo(today)
    setReportFormat('excel')
  }

  async function handleGenerate() {
    if (!currentUser) return
    if (!from || !to) {
      toast.error('Pick a date range')
      return
    }
    if (from > to) {
      toast.error('From date must be on or before To date')
      return
    }

    setGenerating(true)
    const range: DateRange = { from, to }
    const ctx = { dateRange: range, items, assets, workOrders, requests, vehicles, fuelLogs }
    const built = buildReport(templateKey, ctx)

    if (built.rows.length === 0) {
      toast.info('No data for the selected range', {
        description: 'Try a wider date window or a different report.',
      })
      setGenerating(false)
      return
    }

    try {
      if (reportFormat === 'excel') {
        await exportToXLSX(built.rows, built.filename, built.columns, templateMeta.label)
      } else {
        await exportToPDF(built.rows, built.filename, built.columns, {
          title: built.pdfTitle,
          subtitle: built.pdfSubtitle,
        })
      }

      reportCounter += 1
      const record: SavedReport = {
        id: `RPT-${Date.now()}-${reportCounter}`,
        templateKey,
        templateLabel: templateMeta.label,
        format: reportFormat,
        rangeFrom: from,
        rangeTo: to,
        rowCount: built.rows.length,
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser.name,
        snapshot: built,
      }
      setSaved((prev) => [record, ...prev].slice(0, 20))
      toast.success(`Generated ${built.rows.length} row report`)
    } catch (err) {
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleRedownload(report: SavedReport) {
    try {
      if (report.format === 'excel') {
        await exportToXLSX(
          report.snapshot.rows,
          report.snapshot.filename,
          report.snapshot.columns,
          report.templateLabel,
        )
      } else {
        await exportToPDF(report.snapshot.rows, report.snapshot.filename, report.snapshot.columns, {
          title: report.snapshot.pdfTitle,
          subtitle: report.snapshot.pdfSubtitle,
        })
      }
    } catch (err) {
      toast.error('Re-download failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const templateOptions = useMemo(
    () => REPORT_TEMPLATES.map((t) => ({ value: t.key, label: t.label })),
    [],
  )

  return (
    <div>
      <PageHeader
        title="Custom Reports"
        subtitle="Generate cross-module reports for any date range. Re-download stays available for the session."
      />

      <div className="bg-white rounded-xl border border-zinc-200/60 p-5 mb-6">
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Filters</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Report *"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value as ReportTemplateKey)}
            options={templateOptions}
          />
          <Input
            label="From *"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="To *"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Select
            label="Format *"
            value={reportFormat}
            onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
            options={[
              { value: 'excel', label: 'Excel (.xlsx)' },
              { value: 'pdf', label: 'PDF' },
            ]}
          />
        </div>
        <p className="text-[12px] text-zinc-500 mt-3">{templateMeta.description}</p>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleGenerate} loading={generating}>
            Generate Report
          </Button>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={generating}>
            Reset
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Generated Reports</h3>
            {saved.length > 0 && (
              <span className="text-[11px] text-zinc-400">· {saved.length}</span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400">Session only · cleared on reload</span>
        </div>
        {saved.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
            <p className="text-[13px] text-zinc-500">No reports generated yet this session.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50/50">
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-2.5">Report</th>
                <th className="text-left px-5 py-2.5">Range</th>
                <th className="text-left px-5 py-2.5">Format</th>
                <th className="text-right px-5 py-2.5">Rows</th>
                <th className="text-left px-5 py-2.5">Generated</th>
                <th className="text-right px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {saved.map((r, i) => (
                <tr
                  key={r.id}
                  className={i !== saved.length - 1 ? 'border-b border-zinc-100/60' : undefined}
                >
                  <td className="px-5 py-3 font-medium text-zinc-900">{r.templateLabel}</td>
                  <td className="px-5 py-3 text-zinc-600">{r.rangeFrom} → {r.rangeTo}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-medium uppercase">
                      {r.format}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700">{r.rowCount}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    <div>{format(parseISO(r.generatedAt), 'MMM d, HH:mm')}</div>
                    <div className="text-[11px] text-zinc-400">{r.generatedBy}</div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRedownload(r)}
                        className="w-7 h-7 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded"
                        aria-label="Re-download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaved((prev) => prev.filter((x) => x.id !== r.id))}
                        className="w-7 h-7 inline-flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

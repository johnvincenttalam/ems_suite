import { useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { useClickOutside } from '@/shared/hooks/use-click-outside'
import { exportToCSV } from '@/shared/utils/export-csv'
import type { ExportColumn } from '@/shared/utils/export-prep'

export interface ExportMenuProps {
  /** Rows to export. Empty array disables the button. */
  rows: Record<string, unknown>[]
  /** Filename base (no extension or date). e.g. "audit-log" → audit-log-2026-04-30.xlsx */
  baseFilename: string
  /** Column config: order, labels, optional cell formatters. */
  columns: ExportColumn[]
  /** Title for the PDF header. Defaults to baseFilename humanized. */
  pdfTitle?: string
  /** Optional subtitle for PDF (e.g. active filters / date range). */
  pdfSubtitle?: string
  /** Sheet name for Excel. Defaults to "Sheet1". */
  sheetName?: string
  /** Button variant. Defaults to "outline". */
  variant?: 'primary' | 'outline'
}

/**
 * Three-format export dropdown (CSV / Excel / PDF). XLSX and PDF libs are
 * lazy-loaded — main bundle isn't impacted unless the user actually clicks.
 *
 * Drop-in replacement for module-specific CSV buttons. Other modules can
 * adopt this without changing data shape — same `rows` + `columns` API as
 * the existing exportToCSV helper.
 */
export function ExportMenu({
  rows,
  baseFilename,
  columns,
  pdfTitle,
  pdfSubtitle,
  sheetName,
  variant = 'outline',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<null | 'xlsx' | 'pdf'>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  const handleCSV = () => {
    setOpen(false)
    exportToCSV(rows, baseFilename, columns)
  }

  const handleXLSX = async () => {
    setOpen(false)
    setPending('xlsx')
    try {
      const { exportToXLSX } = await import('@/shared/utils/export-xlsx')
      await exportToXLSX(rows, baseFilename, columns, sheetName)
    } catch (err) {
      toast.error('Excel export failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setPending(null)
    }
  }

  const handlePDF = async () => {
    setOpen(false)
    setPending('pdf')
    try {
      const { exportToPDF } = await import('@/shared/utils/export-pdf')
      await exportToPDF(rows, baseFilename, columns, {
        title: pdfTitle ?? humanize(baseFilename),
        subtitle: pdfSubtitle,
      })
    } catch (err) {
      toast.error('PDF export failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setPending(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant={variant}
        leftIcon={<Download className="w-4 h-4" />}
        rightIcon={<ChevronDown className="w-3.5 h-3.5" />}
        loading={pending !== null}
        disabled={rows.length === 0}
        onClick={() => setOpen((v) => !v)}
      >
        Export
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-lg border border-zinc-200/60 py-1 z-30 overflow-hidden">
          <ExportItem icon={<FileText className="w-3.5 h-3.5 text-zinc-400" />} label="CSV" ext=".csv" onClick={handleCSV} />
          <ExportItem icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />} label="Excel" ext=".xlsx" onClick={handleXLSX} />
          <ExportItem icon={<FileType className="w-3.5 h-3.5 text-red-600" />} label="PDF" ext=".pdf" onClick={handlePDF} />
        </div>
      )}
    </div>
  )
}

function ExportItem({ icon, label, ext, onClick }: { icon: React.ReactNode; label: string; ext: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
    >
      {icon}
      {label}
      <span className="ml-auto text-[10px] text-zinc-400 font-mono">{ext}</span>
    </button>
  )
}

function humanize(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

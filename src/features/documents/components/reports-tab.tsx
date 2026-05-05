import { useMemo } from 'react'
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  TriangleAlert,
} from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useDocuments } from '@/features/documents'
import { useDepartments } from '@/features/departments'
import {
  CATEGORY_LABEL,
  CONFIDENTIALITY_LABEL,
  PRIORITY_LABEL,
  type AppDocument,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentPriority,
} from '@/features/documents/types'
import { ExportMenu, StatCard, StatCardSkeleton } from '@/shared/ui/index'
import type { ExportColumn } from '@/shared/utils/export-prep'
import { cn } from '@/shared/utils/cn'

interface BreakdownRow {
  key: string
  label: string
  count: number
  percent: number
}

function buildBreakdown<K extends string>(
  docs: AppDocument[],
  pick: (d: AppDocument) => K | undefined,
  labelMap: Record<K, string>,
): BreakdownRow[] {
  const counts = new Map<K, number>()
  let total = 0
  for (const d of docs) {
    const k = pick(d)
    if (!k) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
    total += 1
  }
  return Array.from(counts.entries())
    .map(([k, count]) => ({
      key: k,
      label: labelMap[k],
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export function ReportsTab() {
  const { data: documents = [], isLoading } = useDocuments()
  const { data: departments = [] } = useDepartments()

  const stats = useMemo(() => {
    const total = documents.length
    const inbox = documents.filter((d) => d.status === 'draft').length
    const inWorkflow = documents.filter((d) => d.status === 'in_review').length
    const approved = documents.filter((d) => d.status === 'approved').length
    const archived = documents.filter((d) => d.status === 'archived').length
    const rejected = documents.filter((d) => d.status === 'rejected').length

    const today = new Date()
    const overdue = documents.filter((d) => {
      if (d.status !== 'in_review' || !d.deadline) return false
      return differenceInCalendarDays(parseISO(d.deadline), today) < 0
    }).length

    return { total, inbox, inWorkflow, approved, archived, rejected, overdue }
  }, [documents])

  const byCategory = useMemo(
    () => buildBreakdown<DocumentCategory>(documents, (d) => d.category, CATEGORY_LABEL),
    [documents],
  )

  const byPriority = useMemo(
    () => buildBreakdown<DocumentPriority>(documents, (d) => d.priority, PRIORITY_LABEL),
    [documents],
  )

  const byConfidentiality = useMemo(
    () => buildBreakdown<DocumentConfidentiality>(documents, (d) => d.confidentiality, CONFIDENTIALITY_LABEL),
    [documents],
  )

  const byDepartment = useMemo(() => {
    const labelMap = Object.fromEntries(departments.map((d) => [d.id, d.name])) as Record<string, string>
    return buildBreakdown(documents, (d) => d.departmentId, labelMap)
  }, [documents, departments])

  const exportRows = useMemo(
    () =>
      documents.map((d) => ({
        id: d.id,
        tracking: d.trackingNumber ?? '',
        title: d.title,
        status: d.status,
        category: d.category ? CATEGORY_LABEL[d.category] : '',
        priority: d.priority ? PRIORITY_LABEL[d.priority] : '',
        confidentiality: d.confidentiality ? CONFIDENTIALITY_LABEL[d.confidentiality] : '',
        department: departments.find((x) => x.id === d.departmentId)?.name ?? '',
        createdAt: d.createdAt,
        archivedAt: d.archivedAt ?? '',
      })),
    [documents, departments],
  )

  const exportColumns: ExportColumn[] = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'tracking', label: 'Tracking #' },
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'confidentiality', label: 'Confidentiality' },
      { key: 'department', label: 'Department' },
      { key: 'createdAt', label: 'Created' },
      { key: 'archivedAt', label: 'Archived' },
    ],
    [],
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <ExportMenu
          rows={exportRows}
          baseFilename="sdms-documents-report"
          columns={exportColumns}
          sheetName="Documents"
          pdfTitle="SDMS Documents Report"
          pdfSubtitle={`${exportRows.length} document${exportRows.length === 1 ? '' : 's'} · all statuses`}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={stats.total} icon={FileText} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={0} />
        <StatCard title="In Inbox" value={stats.inbox} icon={Inbox} iconBg="bg-violet-50" iconColor="text-violet-600" index={1} />
        <StatCard title="In Workflow" value={stats.inWorkflow} icon={Clock} iconBg="bg-blue-50" iconColor="text-blue-600" index={2} />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={3} />
        <StatCard title="Archived" value={stats.archived} icon={Archive} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={4} />
        <StatCard title="Rejected" value={stats.rejected} icon={TriangleAlert} iconBg="bg-red-50" iconColor="text-red-600" index={5} />
        <StatCard title="Overdue" value={stats.overdue} subtitle="In review past deadline" icon={TriangleAlert} iconBg="bg-amber-50" iconColor="text-amber-600" index={6} />
        <StatCard title="Confidential" value={byConfidentiality.find((b) => b.key === 'confidential')?.count ?? 0} icon={FileText} iconBg="bg-red-50" iconColor="text-red-600" index={7} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard title="By Category" rows={byCategory} barColor="bg-violet-500" />
        <BreakdownCard title="By Priority" rows={byPriority} barColor="bg-blue-500" />
        <BreakdownCard title="By Confidentiality" rows={byConfidentiality} barColor="bg-amber-500" />
        <BreakdownCard title="By Department" rows={byDepartment} barColor="bg-emerald-500" />
      </div>
    </div>
  )
}

function BreakdownCard({ title, rows, barColor }: { title: string; rows: BreakdownRow[]; barColor: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{rows.reduce((s, r) => s + r.count, 0)} total</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-700">{r.label}</span>
                <span className="text-zinc-400 tabular-nums">{r.count} <span className="text-zinc-300">·</span> {r.percent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

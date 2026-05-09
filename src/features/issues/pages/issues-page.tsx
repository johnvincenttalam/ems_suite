import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import { FilterChips } from '@/shared/ui/filter-chips'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { useIssues } from '@/features/issues/hooks/use-issues'
import { IssueList } from '@/features/issues/components/issue-list'
import { IssueDetailDrawer } from '@/features/issues/components/issue-detail-drawer'
import { ReportIssueModal } from '@/features/issues/components/report-issue-modal'
import type { Issue, IssueTargetKind } from '@/features/issues/types'

interface IssuesPageProps {
  /** When set, the list and the report modal are scoped to one target kind. */
  targetKind?: IssueTargetKind
  /** Header label override. Defaults to "Issues". */
  title?: string
}

type StatusFilter = 'all-open' | 'all' | 'open' | 'monitor' | 'in_progress' | 'resolved' | 'closed'

export function IssuesPage({ targetKind, title = 'Issues' }: IssuesPageProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all-open')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Issue | null>(null)
  const [reporting, setReporting] = useState(false)

  const listOpts = useMemo(() => {
    const status = statusFilter === 'all' ? undefined : statusFilter
    return { targetKind, status }
  }, [targetKind, statusFilter])

  const { data: issues = [], isLoading } = useIssues(listOpts)

  const filtered = useMemo(() => {
    if (!search.trim()) return issues
    const q = search.trim().toLowerCase()
    return issues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false),
    )
  }, [issues, search])

  const counts = useMemo(() => {
    const total = issues.length
    const open = issues.filter((i) => i.status === 'open').length
    const monitor = issues.filter((i) => i.status === 'monitor').length
    const inProgress = issues.filter((i) => i.status === 'in_progress').length
    const resolved = issues.filter((i) => i.status === 'resolved').length
    const closed = issues.filter((i) => i.status === 'closed').length
    const allOpen = open + monitor + inProgress
    return { total, open, monitor, inProgress, resolved, closed, allOpen }
  }, [issues])

  const filterOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all-open', label: 'All Open', count: counts.allOpen },
    { value: 'open', label: 'Open', count: counts.open },
    { value: 'monitor', label: 'Monitor', count: counts.monitor },
    { value: 'in_progress', label: 'In Progress', count: counts.inProgress },
    { value: 'resolved', label: 'Resolved', count: counts.resolved },
    { value: 'closed', label: 'Closed', count: counts.closed },
    { value: 'all', label: 'All', count: counts.total },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">{title}</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            {targetKind === 'vehicle'
              ? 'Issues raised against fleet vehicles — from inspections or manual reports.'
              : targetKind === 'asset'
              ? 'Issues raised against assets — from inspections or manual reports.'
              : 'All issues across vehicles and assets.'}
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setReporting(true)}>
          Report Issue
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search issues..." />
        </div>
        <FilterChips options={filterOptions} value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columns={1} rows={5} />
          </div>
        ) : (
          <IssueList
            issues={filtered}
            onSelect={setSelected}
            emptyTitle={search.trim() ? 'No matches' : 'No issues'}
            emptyDescription={
              search.trim()
                ? 'Adjust the filter or search term.'
                : statusFilter === 'all-open'
                ? 'No open issues — your queue is clear.'
                : 'Nothing matches the current filter.'
            }
          />
        )}
      </div>

      <IssueDetailDrawer
        open={!!selected}
        issue={selected}
        onClose={() => setSelected(null)}
      />
      <ReportIssueModal
        open={reporting}
        onClose={() => setReporting(false)}
        restrictToKind={targetKind}
      />
    </motion.div>
  )
}

export function FleetIssuesPage() {
  return <IssuesPage targetKind="vehicle" title="Fleet Issues" />
}

export function AssetsIssuesPage() {
  return <IssuesPage targetKind="asset" title="Asset Issues" />
}

// Re-export an icon helper for the empty state so dashboard cards can use it
export { AlertCircle as IssuesEmptyIcon }

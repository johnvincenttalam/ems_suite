import { formatDistanceToNow, parseISO } from 'date-fns'
import { AlertCircle, Truck, Package, Wrench } from 'lucide-react'
import { useUsers } from '@/features/users'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import type { Issue } from '@/features/issues/types'
import { IssueStatusBadge } from '@/features/issues/components/issue-status-badge'
import { IssueSeverityBadge } from '@/features/issues/components/issue-severity-badge'
import { formatIssueTarget } from '@/features/issues/lib/format-target'
import { cn } from '@/shared/utils/cn'

interface IssueListProps {
  issues: Issue[]
  onSelect: (issue: Issue) => void
  /** Hide the target column when the list is already scoped to one target
   * (e.g. inside a vehicle drawer). */
  hideTarget?: boolean
  /** Empty-state copy. */
  emptyTitle?: string
  emptyDescription?: string
  /** Show the issue's source (inspection/manual/work_order) chip. */
  showSource?: boolean
  className?: string
}

export function IssueList({
  issues,
  onSelect,
  hideTarget,
  emptyTitle = 'No issues',
  emptyDescription = 'Nothing has been reported yet.',
  showSource = true,
  className,
}: IssueListProps) {
  const { data: users = [] } = useUsers()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()

  if (issues.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <AlertCircle className="w-7 h-7 text-zinc-300 mx-auto mb-3" />
        <p className="text-[14px] font-medium text-zinc-700">{emptyTitle}</p>
        <p className="text-[12.5px] text-zinc-500 mt-1">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <ul className={cn('divide-y divide-zinc-100/60', className)}>
      {issues.map((issue) => {
        const reporter = users.find((u) => u.id === issue.reportedByUserId)
        const targetInfo = formatIssueTarget(issue.target, { vehicles, assets })
        const TargetIcon = issue.target.kind === 'vehicle' ? Truck : Package
        return (
          <li
            key={issue.id}
            onClick={() => onSelect(issue)}
            className="px-5 py-3.5 cursor-pointer hover:bg-zinc-50/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10.5px] text-zinc-400">{issue.id}</span>
                  <IssueSeverityBadge severity={issue.severity} size="sm" />
                  <IssueStatusBadge status={issue.status} size="sm" />
                  {showSource && issue.source === 'inspection' && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500 px-1.5 py-0.5 rounded-md bg-zinc-100">
                      <Wrench className="w-2.5 h-2.5" />
                      From inspection
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-zinc-900 mt-1.5 truncate">{issue.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {!hideTarget && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                      <TargetIcon className="w-3 h-3 text-zinc-400" />
                      {targetInfo.label}
                      {targetInfo.sublabel && (
                        <span className="text-zinc-400">· {targetInfo.sublabel}</span>
                      )}
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400">
                    by {reporter?.name ?? issue.reportedByUserId}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 whitespace-nowrap mt-0.5">
                {formatDistanceToNow(parseISO(issue.reportedAt), { addSuffix: true })}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

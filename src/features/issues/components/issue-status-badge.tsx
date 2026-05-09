import { Circle, AlertCircle, Loader2, CheckCircle2, Archive, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { IssueStatus } from '@/features/issues/types'
import { cn } from '@/shared/utils/cn'

const STATUS_STYLE: Record<IssueStatus, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  open:        { bg: 'bg-red-50',     text: 'text-red-700',     icon: AlertCircle,  label: 'Open' },
  monitor:     { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Eye,          label: 'Monitor' },
  in_progress: { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Loader2,      label: 'In Progress' },
  resolved:    { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, label: 'Resolved' },
  closed:      { bg: 'bg-zinc-100',   text: 'text-zinc-600',    icon: Archive,      label: 'Closed' },
}

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: STATUS_STYLE.open.label,
  monitor: STATUS_STYLE.monitor.label,
  in_progress: STATUS_STYLE.in_progress.label,
  resolved: STATUS_STYLE.resolved.label,
  closed: STATUS_STYLE.closed.label,
}

interface IssueStatusBadgeProps {
  status: IssueStatus
  size?: 'sm' | 'md'
  className?: string
}

export function IssueStatusBadge({ status, size = 'md', className }: IssueStatusBadgeProps) {
  const cfg = STATUS_STYLE[status] ?? { bg: 'bg-zinc-100', text: 'text-zinc-600', icon: Circle, label: status }
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium whitespace-nowrap',
        cfg.bg,
        cfg.text,
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[12px]',
        className,
      )}
    >
      <Icon
        className={cn(
          size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5',
          status === 'in_progress' && 'animate-spin',
        )}
      />
      {cfg.label}
    </span>
  )
}

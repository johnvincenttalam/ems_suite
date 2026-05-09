import type { IssueSeverity } from '@/features/issues/types'
import { cn } from '@/shared/utils/cn'

const SEVERITY_STYLE: Record<IssueSeverity, { bg: string; text: string; border: string; label: string }> = {
  minor:    { bg: 'bg-zinc-100',   text: 'text-zinc-700',  border: 'border-zinc-200', label: 'Minor' },
  major:    { bg: 'bg-amber-50',   text: 'text-amber-700', border: 'border-amber-200', label: 'Major' },
  critical: { bg: 'bg-red-50',     text: 'text-red-700',   border: 'border-red-200',   label: 'Critical' },
}

export const ISSUE_SEVERITY_LABEL: Record<IssueSeverity, string> = {
  minor: SEVERITY_STYLE.minor.label,
  major: SEVERITY_STYLE.major.label,
  critical: SEVERITY_STYLE.critical.label,
}

interface IssueSeverityBadgeProps {
  severity: IssueSeverity
  size?: 'sm' | 'md'
  className?: string
}

export function IssueSeverityBadge({ severity, size = 'md', className }: IssueSeverityBadgeProps) {
  const cfg = SEVERITY_STYLE[severity]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium uppercase tracking-wide whitespace-nowrap',
        cfg.bg,
        cfg.text,
        cfg.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        className,
      )}
    >
      {cfg.label}
    </span>
  )
}

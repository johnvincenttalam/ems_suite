import { cn } from '@/shared/utils/cn'
import { Check, Clock, AlertTriangle, X, Loader2, Circle, ArrowRight, Pause } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatusConfig {
  bg: string
  text: string
  border: string
  icon: LucideIcon
}

const statusMap: Record<string, StatusConfig> = {
  // User statuses
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Check },
  inactive: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: Pause },

  // Order / workflow statuses
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Check },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: X },
  ongoing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Loader2 },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Check },
  shipped: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: ArrowRight },
  ordered: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: ArrowRight },
  partially_received: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Loader2 },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Check },
  in_progress: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: Loader2 },
  draft: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: Circle },
  signed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Check },
  archived: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: Pause },
  maintenance: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  disposed: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: X },
  cancelled: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: X },
  failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: X },
  refunded: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: ArrowRight },

  // Priorities
  low: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: Circle },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Circle },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },

  // Roles
  admin: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: Check },
}

const fallback: StatusConfig = { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: Circle }

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, className, size = 'md' }: StatusBadgeProps) {
  const config = statusMap[status] ?? fallback
  const Icon = config.icon
  const displayLabel = label ?? status.replace(/_/g, ' ').replace(/-/g, ' ')

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium capitalize whitespace-nowrap',
      config.bg, config.text, config.border,
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      className,
    )}>
      <Icon className={cn(
        'flex-shrink-0',
        size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5',
        status === 'in_progress' && 'animate-spin',
      )} />
      {displayLabel}
    </span>
  )
}

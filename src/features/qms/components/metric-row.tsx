import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { Comparator, MetricStatus, ReportMetric } from '@/features/qms/types'
import { cn } from '@/shared/utils/cn'

const statusConfig: Record<MetricStatus, { Icon: typeof CheckCircle2; className: string; ring: string }> = {
  pass: { Icon: CheckCircle2,   className: 'text-emerald-700', ring: 'border-emerald-200 bg-emerald-50/40' },
  warn: { Icon: AlertTriangle,  className: 'text-amber-700',   ring: 'border-amber-200 bg-amber-50/40' },
  fail: { Icon: XCircle,        className: 'text-red-700',     ring: 'border-red-200 bg-red-50/40' },
}

const comparatorLabel: Record<Comparator, string> = {
  gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=',
}

export function MetricRow({ metric, compact = false }: { metric: ReportMetric; compact?: boolean }) {
  const cfg = statusConfig[metric.status]
  const Icon = cfg.Icon

  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 flex items-start gap-3',
      cfg.ring,
      compact && 'py-2',
    )}>
      <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', cfg.className)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-[13px] font-medium text-zinc-900">{metric.label}</p>
          <p className="text-[12px] text-zinc-400 font-mono whitespace-nowrap">
            target {comparatorLabel[metric.comparator]} {metric.target} {metric.unit}
          </p>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={cn('text-xl font-semibold tabular-nums', cfg.className)}>{metric.value}</span>
          <span className="text-[12px] text-zinc-400">{metric.unit}</span>
        </div>
        {metric.notes && <p className="text-[12px] text-zinc-600 mt-1.5 italic">{metric.notes}</p>}
      </div>
    </div>
  )
}

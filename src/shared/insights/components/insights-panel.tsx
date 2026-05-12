import { Link } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import type { Insight, InsightSeverity } from '@/shared/insights/types'
import { cn } from '@/shared/utils/cn'

const severityStyles: Record<InsightSeverity, { bg: string; icon: typeof AlertOctagon; iconColor: string; chipBg: string; chipText: string }> = {
  critical: { bg: 'bg-red-50/40 border-red-200/60', icon: AlertOctagon, iconColor: 'text-red-600', chipBg: 'bg-red-50', chipText: 'text-red-700' },
  warning:  { bg: 'bg-amber-50/40 border-amber-200/60', icon: AlertTriangle, iconColor: 'text-amber-600', chipBg: 'bg-amber-50', chipText: 'text-amber-700' },
  info:     { bg: 'bg-blue-50/40 border-blue-200/60', icon: Lightbulb, iconColor: 'text-blue-600', chipBg: 'bg-blue-50', chipText: 'text-blue-700' },
}

interface InsightsPanelProps {
  insights: Insight[]
  loading?: boolean
  /** Truncate to N when set (e.g., dashboard preview). Omit for the full list. */
  limit?: number
  /** Optional empty-state hint. */
  emptyHint?: string
}

export function InsightsPanel({ insights, loading, limit, emptyHint }: InsightsPanelProps) {
  const shown = limit ? insights.slice(0, limit) : insights
  const hidden = limit ? Math.max(0, insights.length - limit) : 0

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-900">Key Insights</h3>
          {insights.length > 0 && (
            <span className="text-[11px] text-zinc-400 tabular-nums">· {insights.length}</span>
          )}
        </div>
        {hidden > 0 && (
          <span className="text-[11px] text-zinc-400">+{hidden} more</span>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-[13px] text-zinc-400">Generating insights…</div>
      ) : shown.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[13px] font-medium text-zinc-700">All quiet</p>
          <p className="text-[12px] text-zinc-500 mt-1">{emptyHint ?? 'Nothing notable across the modules right now.'}</p>
        </div>
      ) : (
        <ul>
          {shown.map((insight, i) => {
            const meta = severityStyles[insight.severity]
            const Icon = meta.icon
            const body = (
              <div
                className={cn(
                  'flex items-start gap-3 px-5 py-3 transition-colors',
                  insight.href && 'cursor-pointer hover:bg-zinc-50/60',
                  i !== shown.length - 1 && 'border-b border-zinc-100/60',
                  meta.bg,
                )}
              >
                <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', meta.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-900">{insight.message}</p>
                </div>
                {insight.metric && (
                  <span className={cn('px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums', meta.chipBg, meta.chipText)}>
                    {insight.metric}
                  </span>
                )}
                {insight.href && (
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-1" />
                )}
              </div>
            )
            return (
              <li key={insight.id}>
                {insight.href ? <Link to={insight.href}>{body}</Link> : body}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

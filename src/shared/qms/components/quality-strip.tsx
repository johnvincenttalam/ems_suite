import { Award, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQualityScorecard } from '@/shared/qms/hooks/use-quality-scorecard'
import type { KpiModule, KpiStatus, ScorecardKpi } from '@/shared/qms/lib/derive-scorecard'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'
import { cn } from '@/shared/utils/cn'

interface QualityStripProps {
  module: KpiModule
  /** Optional title override. */
  title?: string
}

const statusStyle: Record<KpiStatus, { bar: string; text: string; bg: string; icon: LucideIcon; label: string }> = {
  pass: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2, label: 'Pass' },
  warn: { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   icon: AlertTriangle, label: 'Warn' },
  fail: { bar: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     icon: XCircle,       label: 'Fail' },
}

function MiniKpi({ kpi }: { kpi: ScorecardKpi }) {
  const status = statusStyle[kpi.status]
  const StatusIcon = status.icon
  const targetText = `${kpi.comparator === 'gte' ? '≥' : '≤'} ${kpi.target}${kpi.unit}`

  return (
    <div className="rounded-lg border border-zinc-200/60 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[12px] text-zinc-500 truncate">{kpi.label}</p>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
            status.bg,
            status.text,
          )}
        >
          <StatusIcon className="w-2.5 h-2.5" />
          {status.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <p className={cn('text-lg font-semibold tracking-tight tabular-nums', status.text)}>
          {kpi.value}
          <span className="text-zinc-400 text-[11px] font-normal">{kpi.unit}</span>
        </p>
        <span className="text-[10.5px] text-zinc-400 ml-auto tabular-nums">target {targetText}</span>
      </div>
    </div>
  )
}

/**
 * Compact quality KPI strip — a per-module filtered view of the cross-module
 * scorecard. Drop into a module dashboard to surface that module's quality
 * KPIs without the full cross-module surface.
 */
export function QualityStrip({ module, title }: QualityStripProps) {
  const { kpis, isLoading } = useQualityScorecard()

  const moduleKpis = kpis.filter((k) => k.module === module)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title ?? 'Quality KPIs'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex items-center justify-center min-h-[120px]">
          <Spinner size="sm" />
        </CardContent>
      </Card>
    )
  }

  if (moduleKpis.length === 0) return null

  const passCount = moduleKpis.filter((k) => k.status === 'pass').length
  const overallPct = Math.round((passCount / moduleKpis.length) * 100)
  const overallStatus: KpiStatus = overallPct >= 80 ? 'pass' : overallPct >= 60 ? 'warn' : 'fail'
  const overallStyle = statusStyle[overallStatus]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between flex">
        <CardTitle>{title ?? 'Quality KPIs'}</CardTitle>
        <div className={cn('px-2.5 py-1 rounded-md flex items-center gap-1.5', overallStyle.bg)}>
          <Award className={cn('w-3.5 h-3.5', overallStyle.text)} />
          <span className={cn('text-[12px] font-semibold tabular-nums', overallStyle.text)}>
            {overallPct}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {moduleKpis.map((kpi) => (
            <MiniKpi key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

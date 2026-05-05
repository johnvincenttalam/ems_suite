import {
  Award,
  Wrench,
  ShoppingCart,
  FolderOpen,
  Boxes,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQualityScorecard } from '@/shared/qms/hooks/use-quality-scorecard'
import type { KpiModule, KpiStatus, ScorecardKpi } from '@/shared/qms/lib/derive-scorecard'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'

interface QualityScorecardProps {
  /** Optional title override. */
  title?: string
  /** Optional subtitle override. */
  subtitle?: string
}

const moduleIcon: Record<KpiModule, LucideIcon> = {
  maintenance: Wrench,
  procurement: ShoppingCart,
  sdms: FolderOpen,
  inventory: Boxes,
  fleet: Truck,
}

const moduleColor: Record<KpiModule, { bg: string; color: string; label: string }> = {
  maintenance: { bg: 'bg-orange-50', color: 'text-orange-600', label: 'Maintenance' },
  procurement: { bg: 'bg-rose-50', color: 'text-rose-600', label: 'Procurement' },
  sdms: { bg: 'bg-violet-50', color: 'text-violet-600', label: 'SDMS' },
  inventory: { bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Inventory' },
  fleet: { bg: 'bg-sky-50', color: 'text-sky-600', label: 'Fleet' },
}

const statusStyle: Record<KpiStatus, { bar: string; text: string; bg: string; icon: LucideIcon; label: string }> = {
  pass: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    icon: CheckCircle2,
    label: 'Pass',
  },
  warn: {
    bar: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: AlertTriangle,
    label: 'Warn',
  },
  fail: {
    bar: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    icon: XCircle,
    label: 'Fail',
  },
}

function KpiTile({ kpi }: { kpi: ScorecardKpi }) {
  const ModuleIcon = moduleIcon[kpi.module]
  const moduleClr = moduleColor[kpi.module]
  const status = statusStyle[kpi.status]
  const StatusIcon = status.icon
  const targetText = `${kpi.comparator === 'gte' ? '≥' : '≤'} ${kpi.target}${kpi.unit}`

  return (
    <div className="rounded-xl border border-zinc-200/60 bg-white p-4 transition-colors hover:border-zinc-300">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', moduleClr.bg)}>
            <ModuleIcon className={cn('w-3.5 h-3.5', moduleClr.color)} />
          </div>
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-zinc-400">
            {moduleClr.label}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium uppercase tracking-wide',
            status.bg,
            status.text,
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>
      <p className="text-[12.5px] text-zinc-500 truncate">{kpi.label}</p>
      <p className={cn('text-2xl font-semibold tracking-tight tabular-nums mt-0.5', status.text)}>
        {kpi.value}
        <span className="text-zinc-400 text-[14px] font-normal">{kpi.unit}</span>
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full', status.bar)}
            style={{
              width: `${Math.min(
                100,
                kpi.comparator === 'gte'
                  ? (kpi.value / kpi.target) * 100
                  : (kpi.target / Math.max(kpi.value, 0.01)) * 100,
              )}%`,
            }}
          />
        </div>
        <span className="text-[10.5px] text-zinc-400 tabular-nums whitespace-nowrap">
          Target {targetText}
        </span>
      </div>
    </div>
  )
}

/**
 * Cross-module quality scorecard surface. Embed inside MIS dashboard or any
 * cross-cutting console. Pulls live data via useQualityScorecard.
 */
export function QualityScorecard({ title, subtitle }: QualityScorecardProps = {}) {
  const { kpis, overall, breakdown, isLoading } = useQualityScorecard()

  if (isLoading) {
    return <TableSkeleton columns={3} rows={3} />
  }

  const overallPct = Math.round(overall * 100)
  const overallStatus: KpiStatus = overallPct >= 80 ? 'pass' : overallPct >= 60 ? 'warn' : 'fail'
  const overallStyle = statusStyle[overallStatus]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between flex">
        <div>
          <CardTitle>{title ?? 'Quality Scorecard'}</CardTitle>
          <p className="text-[12px] text-zinc-500 mt-1">
            {subtitle ?? 'Cross-module KPI compliance — live data'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {breakdown.pass}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {breakdown.warn}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {breakdown.fail}
            </span>
          </div>
          <div className={cn('px-3 py-1.5 rounded-lg flex items-center gap-2', overallStyle.bg)}>
            <Award className={cn('w-4 h-4', overallStyle.text)} />
            <span className={cn('text-[13px] font-semibold tabular-nums', overallStyle.text)}>
              {overallPct}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {kpis.length === 0 ? (
          <p className="text-[13px] text-zinc-500 py-8 text-center">No KPIs available yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpis.map((kpi) => (
              <KpiTile key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import type { AssetCondition } from '@/features/assets/types'
import { cn } from '@/shared/utils/cn'

const STYLES: Record<AssetCondition, string> = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  good: 'bg-blue-50 text-blue-700 border-blue-200',
  fair: 'bg-amber-50 text-amber-700 border-amber-200',
  poor: 'bg-orange-50 text-orange-700 border-orange-200',
  out_of_service: 'bg-red-50 text-red-700 border-red-200',
}

const LABELS: Record<AssetCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  out_of_service: 'Out of Service',
}

export function ConditionPill({ condition, className }: { condition: AssetCondition; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium', STYLES[condition], className)}>
      {LABELS[condition]}
    </span>
  )
}

export const ASSET_CONDITION_LABEL = LABELS

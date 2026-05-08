import { differenceInCalendarMonths, parseISO } from 'date-fns'
import type { Asset } from '@/features/assets/types'

export interface DepreciationSummary {
  /** Months elapsed between purchaseDate and `asOf`. Clamped to [0, usefulLifeMonths]. */
  monthsElapsed: number
  /** True if monthsElapsed has reached usefulLifeMonths. */
  fullyDepreciated: boolean
  /** Cumulative depreciation amount from purchase up to `asOf`. */
  depreciationToDate: number
  /** Current book value: max(salvage, purchaseCost - depreciationToDate). */
  bookValue: number
  /** Per-month depreciation amount (constant under straight-line). */
  monthlyDepreciation: number
  /** True when the asset has the inputs needed for a meaningful schedule. */
  schedulable: boolean
}

const EMPTY: DepreciationSummary = {
  monthsElapsed: 0,
  fullyDepreciated: false,
  depreciationToDate: 0,
  bookValue: 0,
  monthlyDepreciation: 0,
  schedulable: false,
}

/**
 * Straight-line depreciation summary at a given moment.
 *
 * Returns a zero-everything summary when the asset lacks the inputs we need
 * (purchaseCost, usefulLifeMonths > 0). bookValue is clamped to salvageValue
 * once the asset is fully depreciated.
 */
export function depreciationSummary(asset: Asset, asOf: Date = new Date()): DepreciationSummary {
  const cost = asset.purchaseCost
  const life = asset.usefulLifeMonths
  if (cost === undefined || !life || life <= 0) return EMPTY

  const salvage = Math.min(asset.salvageValue ?? 0, cost)
  const depreciableBase = Math.max(0, cost - salvage)

  const purchaseAt = parseISO(asset.purchaseDate)
  const rawMonths = differenceInCalendarMonths(asOf, purchaseAt)
  const monthsElapsed = Math.max(0, Math.min(rawMonths, life))
  const monthlyDepreciation = depreciableBase / life
  const depreciationToDate = monthlyDepreciation * monthsElapsed
  const bookValue = Math.max(salvage, cost - depreciationToDate)

  return {
    monthsElapsed,
    fullyDepreciated: monthsElapsed >= life,
    depreciationToDate,
    bookValue,
    monthlyDepreciation,
    schedulable: true,
  }
}

/**
 * Aggregate book value across a collection of assets. Disposed assets contribute
 * 0 (they're off the operational books) unless `includeDisposed` is true.
 */
export function totalBookValue(assets: Asset[], asOf: Date = new Date(), includeDisposed = false): number {
  let total = 0
  for (const a of assets) {
    if (!includeDisposed && a.status === 'disposed') continue
    const summary = depreciationSummary(a, asOf)
    if (summary.schedulable) {
      total += summary.bookValue
    } else if (a.purchaseCost !== undefined && a.status !== 'disposed') {
      // No useful-life set — fall back to purchaseCost so at least cost is
      // accounted for in the operational total.
      total += a.purchaseCost
    }
  }
  return total
}

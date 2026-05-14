import type { Asset } from '@/features/assets'
import type { WorkOrder } from '@/features/maintenance'
import { workOrderTotalCost } from '@/features/maintenance'
import type { Insight } from '@/shared/insights/types'

/** Assets insights — condition, utilization-ish signal, top-cost asset. */
export function deriveAssetInsights(
  assets: Asset[],
  workOrders: WorkOrder[],
): Insight[] {
  const insights: Insight[] = []

  // Assets in poor condition.
  const poor = assets.filter((a) => a.status !== 'disposed' && (a.condition === 'poor' || a.condition === 'out_of_service'))
  if (poor.length > 0) {
    insights.push({
      id: 'asset:poor-condition',
      message: `${poor.length} asset${poor.length === 1 ? '' : 's'} in poor or out-of-service condition`,
      severity: 'warning',
      module: 'assets',
      metric: `${poor.length}`,
      href: '/module/assets',
    })
  }

  // Highest-cost asset by completed-WO total. Only meaningful when at least
  // one completed WO carries a cost.
  const costByAsset = new Map<string, number>()
  for (const w of workOrders) {
    if (w.status !== 'completed') continue
    if (!w.assetId) continue
    const cost = workOrderTotalCost(w)
    if (cost === 0) continue
    costByAsset.set(w.assetId, (costByAsset.get(w.assetId) ?? 0) + cost)
  }
  if (costByAsset.size > 0) {
    const top = Array.from(costByAsset.entries()).sort((a, b) => b[1] - a[1])[0]
    const asset = assets.find((a) => a.id === top[0])
    if (asset) {
      insights.push({
        id: 'asset:top-cost',
        message: `Highest maintenance cost: ${asset.name} (${asset.assetCode})`,
        severity: 'info',
        module: 'assets',
        metric: `₱${top[1].toLocaleString()}`,
        href: '/module/maintenance/reports',
      })
    }
  }

  return insights
}

import { useMemo } from 'react'
import { useDocuments } from '@/features/documents'
import { useRequests } from '@/features/procurement'
import { useWorkOrders } from '@/features/maintenance'
import { useInventoryItems } from '@/features/inventory'
import { useAssets } from '@/features/assets'
import { scoreDocuments } from '@/shared/search/lib/score-documents'
import { scoreProcurementRequests } from '@/shared/search/lib/score-procurement'
import { scoreWorkOrders } from '@/shared/search/lib/score-work-orders'
import { scoreInventoryItems } from '@/shared/search/lib/score-inventory'
import { scoreAssets } from '@/shared/search/lib/score-assets'
import type { GlobalSearchHit } from '@/shared/search/lib/types'

interface UseGlobalSearchOptions {
  /** Total result limit across all entity types. Default 30. */
  limit?: number
}

interface UseGlobalSearchResult {
  hits: GlobalSearchHit[]
  total: number
}

/**
 * Run all per-entity scorers against `query` and merge results by score.
 * Pulls from React Query caches that are already populated by other modules,
 * so opening the palette doesn't trigger extra fetches in steady state.
 *
 * Empty/whitespace queries return zero hits without scoring anything.
 */
export function useGlobalSearch(query: string, options: UseGlobalSearchOptions = {}): UseGlobalSearchResult {
  const { data: documents = [] } = useDocuments()
  const { data: requests = [] } = useRequests()
  const { data: workOrders = [] } = useWorkOrders()
  const { data: items = [] } = useInventoryItems()
  const { data: assets = [] } = useAssets()

  return useMemo(() => {
    if (!query.trim()) return { hits: [], total: 0 }
    const limit = options.limit ?? 30

    const all: GlobalSearchHit[] = [
      ...scoreDocuments(documents, query),
      ...scoreProcurementRequests(requests, query),
      ...scoreWorkOrders(workOrders, query),
      ...scoreInventoryItems(items, query),
      ...scoreAssets(assets, query),
    ]

    all.sort((a, b) => b.score - a.score)

    return { hits: all.slice(0, limit), total: all.length }
  }, [query, documents, requests, workOrders, items, assets, options.limit])
}

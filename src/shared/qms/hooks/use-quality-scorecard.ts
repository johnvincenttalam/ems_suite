import { useMemo } from 'react'
import { useWorkOrders } from '@/features/maintenance'
import { useRequests } from '@/features/procurement'
import { useDocuments } from '@/features/documents'
import { useInventoryItems } from '@/features/inventory'
import { useVehicles } from '@/features/fleet'
import { useIssues } from '@/features/issues'
import { deriveQualityScorecard, type QualityScorecard } from '@/shared/qms/lib/derive-scorecard'

export interface UseQualityScorecardResult extends QualityScorecard {
  isLoading: boolean
}

/**
 * Cross-module quality scorecard. Pulls live operational data from the five
 * domains and derives KPIs against per-metric targets. Pure derivation in
 * deriveQualityScorecard — this hook just composes the data sources.
 */
export function useQualityScorecard(): UseQualityScorecardResult {
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders()
  const { data: requests = [], isLoading: reqLoading } = useRequests()
  const { data: documents = [], isLoading: docLoading } = useDocuments()
  const { data: items = [], isLoading: invLoading } = useInventoryItems()
  const { data: vehicles = [], isLoading: vehicleLoading } = useVehicles()
  const { data: issues = [], isLoading: issuesLoading } = useIssues()

  const isLoading = woLoading || reqLoading || docLoading || invLoading || vehicleLoading || issuesLoading

  const scorecard = useMemo(
    () => deriveQualityScorecard({ workOrders, requests, documents, items, vehicles, issues }),
    [workOrders, requests, documents, items, vehicles, issues],
  )

  return { ...scorecard, isLoading }
}

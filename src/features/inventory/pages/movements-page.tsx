import { useStockMovements } from '@/features/inventory'
import { MovementsTab } from '@/features/inventory/components/movements-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function MovementsPage() {
  const { data: movements = [] } = useStockMovements()

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        subtitle={`${movements.length} recorded`}
      />
      <MovementsTab />
    </div>
  )
}

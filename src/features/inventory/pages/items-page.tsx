import { useInventoryItems } from '@/features/inventory'
import { ItemsTab } from '@/features/inventory/components/items-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ItemsPage() {
  const { data: items = [] } = useInventoryItems()
  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel).length

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={lowStock > 0 ? `${items.length} items · ${lowStock} low stock` : `${items.length} items`}
      />
      <ItemsTab />
    </div>
  )
}

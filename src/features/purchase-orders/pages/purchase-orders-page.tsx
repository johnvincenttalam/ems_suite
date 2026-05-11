import { usePurchaseOrders } from '@/features/purchase-orders'
import { PurchaseOrdersTab } from '@/features/purchase-orders/components/purchase-orders-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function PurchaseOrdersPage() {
  const { data: pos = [] } = usePurchaseOrders()
  const open = pos.filter((p) => p.status === 'ordered' || p.status === 'partially_received').length

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle={open > 0 ? `${pos.length} total · ${open} open` : `${pos.length} total`}
      />
      <PurchaseOrdersTab />
    </div>
  )
}

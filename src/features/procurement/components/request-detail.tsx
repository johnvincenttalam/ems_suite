import type { RequestWithItems } from '@/features/procurement/types'
import type { InventoryItem } from '@/features/inventory/types'
import type { Uom } from '@/features/uom/types'
import { formatCurrency } from '@/shared/utils/format'

interface RequestDetailProps {
  request: RequestWithItems
  itemMap: Record<string, InventoryItem>
  uomMap: Record<string, Uom>
}

export function RequestDetail({ request, itemMap, uomMap }: RequestDetailProps) {
  return (
    <div className="bg-zinc-50/40 px-6 py-4 border-t border-zinc-100">
      <table className="w-full">
        <thead>
          <tr className="text-[11px] uppercase text-zinc-400 tracking-wider">
            <th className="text-left py-2 font-medium">Item</th>
            <th className="text-right py-2 font-medium">Qty</th>
            <th className="text-right py-2 font-medium">Unit Cost</th>
            <th className="text-right py-2 font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {request.items.map((line) => {
            const item = itemMap[line.itemId]
            const symbol = item ? uomMap[item.uomId]?.symbol : ''
            return (
              <tr key={line.id} className="border-t border-zinc-100/60">
                <td className="py-2">
                  <p className="text-[13px] text-zinc-900">{item?.name ?? line.itemId}</p>
                  <p className="text-[11px] font-mono text-zinc-400">{item?.sku ?? '—'}</p>
                </td>
                <td className="py-2 text-right tabular-nums text-zinc-700">
                  {line.quantity.toLocaleString()}
                  {symbol && <span className="ml-1 text-[11px] text-zinc-400 font-mono">{symbol}</span>}
                </td>
                <td className="py-2 text-right tabular-nums text-zinc-700">{formatCurrency(line.unitCost)}</td>
                <td className="py-2 text-right tabular-nums font-medium text-zinc-900">{formatCurrency(line.quantity * line.unitCost)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-200">
            <td colSpan={3} className="py-2 text-right text-[13px] text-zinc-500">Total</td>
            <td className="py-2 text-right tabular-nums text-base font-semibold text-zinc-900">{formatCurrency(request.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
      {request.rejectedReason && (
        <div className="mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200">
          <p className="text-[11px] uppercase tracking-wider text-red-600 font-semibold">Rejected</p>
          <p className="text-[13px] text-red-700 mt-0.5">{request.rejectedReason}</p>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useInventoryItems, useStockMovements, inventoryApi } from '@/features/inventory'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'
import { useAuthStore } from '@/features/auth'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { PageHeader } from '@/shared/ui/page-header'
import { Tabs } from '@/shared/ui/tabs'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { cn } from '@/shared/utils/cn'
import type { StockMovementType } from '@/features/inventory/types'

type Mode = 'in' | 'out'

let refSequence = 0
function generateRefNumber(prefix: string): string {
  refSequence += 1
  // Combine a millisecond suffix with a session-monotonic counter so two
  // submissions in the same tick can't collide.
  return `${prefix}-${Date.now().toString().slice(-6)}-${String(refSequence).padStart(3, '0')}`
}

export function StockInOutPage() {
  const [mode, setMode] = useState<Mode>('in')
  const { data: items = [] } = useInventoryItems()
  const { data: movements = [], isLoading } = useStockMovements()
  const settings = useInventorySettings((s) => s.settings)
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  // Schema is built per-render so requireBatchNumber reflects the live setting.
  const formSchema = z.object({
    itemId: z.string().min(1, 'Item is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    batchNumber: settings.requireBatchNumber
      ? z.string().min(1, 'Batch number is required (per Settings → System Preferences)')
      : z.string().optional(),
    referenceNumber: z.string().optional(),
    reason: z.string().optional(),
  })

  type FormValues = z.infer<typeof formSchema>

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const recent = useMemo(
    () => movements.filter((m) => (m.type as StockMovementType) === mode).slice(0, 12),
    [movements, mode],
  )

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { itemId: '', batchNumber: '', referenceNumber: '', reason: '' },
  })

  const watchedItemId = useWatch({ control, name: 'itemId' })
  const watchedQuantity = useWatch({ control, name: 'quantity' })
  const selectedItem = watchedItemId ? itemMap[watchedItemId] : undefined
  const projectedAfter = selectedItem
    ? mode === 'in'
      ? selectedItem.quantity + (Number(watchedQuantity) || 0)
      : selectedItem.quantity - (Number(watchedQuantity) || 0)
    : null
  const wouldGoNegative = mode === 'out' && projectedAfter !== null && projectedAfter < 0

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!currentUser) throw new Error('Not signed in')
      const item = itemMap[values.itemId]
      const explicitRef = values.referenceNumber?.trim()
      const generatedRef = settings.autoGenerateReferenceNumber && !explicitRef
        ? generateRefNumber(mode === 'in' ? 'RCPT' : 'ISSUE')
        : undefined
      return inventoryApi.addMovement({
        itemId: values.itemId,
        type: mode,
        quantity: values.quantity,
        ...(mode === 'in' ? { destinationLocationId: item?.warehouseId } : { sourceLocationId: item?.warehouseId }),
        reason: values.reason?.trim() || undefined,
        batchNumber: values.batchNumber?.trim() || undefined,
        referenceNumber: explicitRef || generatedRef,
        createdBy: currentUser.name,
      })
    },
    onSuccess: () => {
      toast.success(mode === 'in' ? 'Stock-in posted' : 'Stock-out posted')
      reset()
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
    onError: (err) => toast.error('Save failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))

  return (
    <div className="space-y-6">
      <PageHeader title="Stock In / Out" subtitle="Record stock receipts and issuances. Posts immediately." />

      <Tabs
        items={[
          { value: 'in', label: 'Stock In' },
          { value: 'out', label: 'Stock Out' },
        ]}
        value={mode}
        onChange={(v) => setMode(v as Mode)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="bg-white rounded-xl border border-zinc-200/60 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', mode === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
              {mode === 'in' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
            </span>
            <p className="text-[13px] font-semibold text-zinc-900">{mode === 'in' ? 'New Stock In' : 'New Stock Out'}</p>
          </div>

          <Select
            label="Item *"
            placeholder="Select item"
            options={itemOptions}
            {...register('itemId')}
            error={errors.itemId?.message}
          />

          <Input
            label="Quantity *"
            type="number"
            min={1}
            placeholder="0"
            {...register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
          />

          {selectedItem && (
            <div className={cn(
              'rounded-md border px-3 py-2 text-[12px] grid grid-cols-3 gap-2',
              wouldGoNegative
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700',
            )}>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">Current</p>
                <p className="tabular-nums font-medium">{selectedItem.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">Change</p>
                <p className="tabular-nums font-medium">{mode === 'in' ? '+' : '−'}{Number(watchedQuantity) || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">After</p>
                <p className="tabular-nums font-semibold">{projectedAfter}</p>
              </div>
              {wouldGoNegative && !settings.allowNegativeStock && (
                <p className="col-span-3 text-[11px] mt-1 pt-1 border-t border-red-200">
                  Negative stock is disabled in Settings — submission will fail.
                </p>
              )}
            </div>
          )}

          <Input
            label={settings.requireBatchNumber ? 'Batch Number *' : 'Batch Number'}
            placeholder="e.g. BTC-2026-001"
            {...register('batchNumber')}
            error={errors.batchNumber?.message as string | undefined}
          />

          <Input
            label="Reference Number"
            placeholder={settings.autoGenerateReferenceNumber ? 'Auto-generated if blank' : (mode === 'in' ? 'e.g. RCPT-00123' : 'e.g. ISSUE-00123')}
            {...register('referenceNumber')}
          />

          <Textarea
            label="Remarks"
            rows={2}
            placeholder="Optional notes for this transaction"
            {...register('reason')}
          />

          <div className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-2.5 py-1.5">
            Posted as <span className="font-medium text-zinc-700">{currentUser?.name ?? '—'}</span> · {format(new Date(), 'MMM d, yyyy')}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => reset()} disabled={mutation.isPending}>
              Clear
            </Button>
            <Button type="submit" loading={mutation.isPending} fullWidth>
              {mode === 'in' ? 'Save Stock-In' : 'Save Stock-Out'}
            </Button>
          </div>
        </form>

        <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-100">
            <p className="text-[13px] font-semibold text-zinc-900">Recent {mode === 'in' ? 'Stock-In' : 'Stock-Out'} Transactions</p>
            <span className="text-[11px] text-zinc-400">{recent.length} shown</span>
          </div>
          {isLoading ? (
            <TableSkeleton columns={4} rows={4} />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <DataTableEmpty colSpan={4} icon={Activity} message="No transactions yet" />
                )}
                {recent.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100/60">
                    <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                      {format(new Date(m.createdAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-zinc-700">
                      {itemMap[m.itemId]?.name ?? m.itemId}
                      <span className="block text-[11px] text-zinc-400 font-mono">{itemMap[m.itemId]?.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums font-medium text-zinc-900">{m.quantity}</td>
                    <td className="px-4 py-3 text-[12px] text-zinc-500 font-mono">{m.referenceNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

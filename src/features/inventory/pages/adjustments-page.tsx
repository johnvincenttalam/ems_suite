import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Edit3, CheckCircle2, XCircle, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useInventoryItems, useStockMovements, inventoryApi } from '@/features/inventory'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { Modal } from '@/shared/ui/modal'
import { PageHeader } from '@/shared/ui/page-header'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { cn } from '@/shared/utils/cn'
import type { StockMovement } from '@/features/inventory/types'

function buildSchema(requireReason: boolean) {
  return z.object({
    itemId: z.string().min(1, 'Item is required'),
    adjustedStock: z.number().int('Whole units only').nonnegative('Cannot be negative'),
    reason: requireReason
      ? z.string().min(2, 'Reason is required (per Settings → Movement Rules)')
      : z.string(),
    approverId: z.string().min(1, 'Approving authority is required'),
    remarks: z.string().optional(),
  })
}

type FormValues = {
  itemId: string
  adjustedStock: number
  reason: string
  approverId: string
  remarks?: string
}

const STATUS_PILL: Record<StockMovement['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  applied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<StockMovement['status'], string> = {
  pending: 'Pending',
  applied: 'Approved',
  rejected: 'Rejected',
}

const REASON_OPTIONS = [
  { value: 'Damage', label: 'Damage' },
  { value: 'Loss', label: 'Loss' },
  { value: 'Cycle count correction', label: 'Cycle count correction' },
  { value: 'Expiry', label: 'Expiry' },
  { value: 'Found stock', label: 'Found stock' },
  { value: 'Other', label: 'Other' },
]

export function AdjustmentsPage() {
  const { data: items = [] } = useInventoryItems()
  const { data: movements = [], isLoading } = useStockMovements()
  const { data: users = [] } = useUsers()
  const settings = useInventorySettings((s) => s.settings)
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const formSchema = buildSchema(settings.requireReasonOnAdjustment)

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const adjustments = useMemo(
    () => movements.filter((m) => m.type === 'adjustment').slice(0, 30),
    [movements],
  )

  const [rejectTarget, setRejectTarget] = useState<StockMovement | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { itemId: '', adjustedStock: 0, reason: '', approverId: '', remarks: '' },
  })

  // Watch picked item + adjusted stock to compute variance live.
  const watchedItemId = useWatch({ control, name: 'itemId' })
  const watchedAdjusted = useWatch({ control, name: 'adjustedStock' })
  const currentItem = watchedItemId ? itemMap[watchedItemId] : undefined
  const currentStock = currentItem?.quantity ?? 0
  const variance = (Number(watchedAdjusted) || 0) - currentStock

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!currentUser) throw new Error('Not signed in')
      const item = itemMap[values.itemId]
      const v = values.adjustedStock - (item?.quantity ?? 0)
      if (v === 0) throw new Error('Adjusted stock matches current stock — nothing to adjust')
      return inventoryApi.addMovement({
        itemId: values.itemId,
        type: 'adjustment',
        quantity: v,
        targetQuantity: values.adjustedStock,
        sourceLocationId: item?.warehouseId,
        approverId: values.approverId,
        reason: values.remarks?.trim()
          ? `${values.reason} — ${values.remarks.trim()}`
          : values.reason,
        createdBy: currentUser.name,
      })
    },
    onSuccess: () => {
      toast.success('Adjustment submitted — awaiting approval')
      reset()
      invalidate()
    },
    onError: (err) => toast.error('Submit failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const approveMutation = useMutation({
    mutationFn: (m: StockMovement) => {
      if (!currentUser) throw new Error('Not signed in')
      return inventoryApi.approveMovement(m.id, currentUser.name)
    },
    onSuccess: () => { toast.success('Adjustment approved'); invalidate() },
    onError: (err) => toast.error('Approve failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ m, reason }: { m: StockMovement; reason: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return inventoryApi.rejectMovement(m.id, reason, currentUser.name)
    },
    onSuccess: () => {
      toast.success('Adjustment rejected')
      setRejectTarget(null); setRejectReason('')
      invalidate()
    },
    onError: (err) => toast.error('Reject failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))
  const approverOptions = users
    .filter((u) => u.status === 'active' && u.moduleAdmins.includes('inventory') && u.name !== currentUser?.name)
    .map((u) => ({ value: u.name, label: u.name + (u.position ? ` — ${u.position}` : '') }))

  return (
    <div className="space-y-6">
      <PageHeader title="Adjustments" subtitle="Reconcile stock for damage, loss, or count corrections. Posts only after approval." />

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <form
          onSubmit={handleSubmit((v) => submitMutation.mutate(v))}
          className="bg-white rounded-xl border border-zinc-200/60 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <Edit3 className="w-4 h-4" />
            </span>
            <p className="text-[13px] font-semibold text-zinc-900">New Adjustment</p>
          </div>

          <Select
            label="Item *"
            placeholder="Select item"
            options={itemOptions}
            {...register('itemId')}
            error={errors.itemId?.message}
          />

          <Select
            label={settings.requireReasonOnAdjustment ? 'Reason *' : 'Reason'}
            placeholder="Select reason"
            options={REASON_OPTIONS}
            {...register('reason')}
            error={errors.reason?.message}
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Current Stock"
              value={currentItem ? currentStock : ''}
              readOnly
              disabled
              placeholder="—"
            />
            <Input
              label="Adjusted Stock *"
              type="number"
              min={0}
              {...register('adjustedStock', { valueAsNumber: true })}
              error={errors.adjustedStock?.message}
            />
            <Input
              label="Variance"
              value={currentItem ? `${variance > 0 ? '+' : ''}${variance}` : ''}
              readOnly
              disabled
              placeholder="—"
            />
          </div>

          <Select
            label="Approving Authority *"
            placeholder="Select approver"
            options={approverOptions}
            {...register('approverId')}
            error={errors.approverId?.message}
          />
          <p className="text-[11px] text-zinc-400 -mt-2">The named person can approve or reject this adjustment.</p>

          <Textarea
            label="Remarks"
            rows={2}
            placeholder="Optional context for the approver"
            {...register('remarks')}
          />

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => reset()} disabled={submitMutation.isPending}>
              Clear
            </Button>
            <Button type="submit" loading={submitMutation.isPending} fullWidth>
              Submit Adjustment
            </Button>
          </div>
        </form>

        <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-100">
            <p className="text-[13px] font-semibold text-zinc-900">Adjustment History</p>
            <span className="text-[11px] text-zinc-400">{adjustments.length} shown</span>
          </div>
          {isLoading ? (
            <TableSkeleton columns={6} rows={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Variance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.length === 0 && (
                    <DataTableEmpty colSpan={6} icon={Activity} message="No adjustments yet" />
                  )}
                  {adjustments.map((m) => {
                    const canAct = m.status === 'pending' && m.approverId === currentUser?.name
                    return (
                      <tr key={m.id} className="border-b border-zinc-100/60 align-top">
                        <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                          {format(parseISO(m.createdAt), 'MMM d, HH:mm')}
                          <span className="block text-[10.5px] text-zinc-400">{m.createdBy}</span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-zinc-700">
                          {itemMap[m.itemId]?.name ?? m.itemId}
                          <span className="block text-[11px] text-zinc-400 font-mono">{itemMap[m.itemId]?.sku}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-zinc-600 max-w-[260px]">{m.reason ?? '—'}</td>
                        <td className={cn('px-4 py-3 text-[13px] tabular-nums font-medium text-right whitespace-nowrap', m.quantity < 0 ? 'text-red-700' : 'text-emerald-700')}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium', STATUS_PILL[m.status])}>
                            {STATUS_LABEL[m.status]}
                          </span>
                          {m.status === 'pending' && m.approverId && (
                            <p className="text-[10.5px] text-zinc-400 mt-1">Awaits {m.approverId}</p>
                          )}
                          {m.status === 'rejected' && m.rejectedReason && (
                            <p className="text-[10.5px] text-red-600 mt-1 max-w-[180px]">{m.rejectedReason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canAct && (
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="success"
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                loading={approveMutation.isPending && approveMutation.variables?.id === m.id}
                                onClick={() => approveMutation.mutate(m)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                onClick={() => setRejectTarget(m)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason('') }}
        title={`Reject adjustment ${rejectTarget?.id ?? ''}?`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            The submitter will see this in the audit log. Stock is not changed.
          </p>
          <Textarea
            label="Reason *"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Variance not consistent with last cycle count"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => { setRejectTarget(null); setRejectReason('') }} disabled={rejectMutation.isPending}>Cancel</Button>
            <Button
              variant="danger"
              fullWidth
              loading={rejectMutation.isPending}
              disabled={rejectReason.trim().length < 2}
              onClick={() => rejectTarget && rejectMutation.mutate({ m: rejectTarget, reason: rejectReason.trim() })}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

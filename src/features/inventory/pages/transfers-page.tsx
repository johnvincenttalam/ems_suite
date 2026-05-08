import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowLeftRight, CheckCircle2, XCircle, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useInventoryItems, useStockMovements, inventoryApi } from '@/features/inventory'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'
import { useWarehouses } from '@/features/warehouses'
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

function buildSchema(requireDestination: boolean) {
  return z
    .object({
      itemId: z.string().min(1, 'Item is required'),
      sourceLocationId: z.string().min(1, 'Source warehouse is required'),
      destinationLocationId: requireDestination
        ? z.string().min(1, 'Destination warehouse is required (per Settings → Movement Rules)')
        : z.string(),
      quantity: z.number().int().positive('Quantity must be positive'),
      approverId: z.string().min(1, 'Approving authority is required'),
      reason: z.string().optional(),
    })
    .refine((d) => !d.destinationLocationId || d.sourceLocationId !== d.destinationLocationId, {
      path: ['destinationLocationId'],
      message: 'Destination must differ from source',
    })
}

type FormValues = {
  itemId: string
  sourceLocationId: string
  destinationLocationId: string
  quantity: number
  approverId: string
  reason?: string
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

export function TransfersPage() {
  const { data: items = [] } = useInventoryItems()
  const { data: movements = [], isLoading } = useStockMovements()
  const { data: warehouses = [] } = useWarehouses()
  const { data: users = [] } = useUsers()
  const settings = useInventorySettings((s) => s.settings)
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const formSchema = buildSchema(settings.requireWarehouseOnTransfer)

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])

  const transfers = useMemo(
    () => movements.filter((m) => m.type === 'transfer').slice(0, 30),
    [movements],
  )

  const [rejectTarget, setRejectTarget] = useState<StockMovement | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { itemId: '', sourceLocationId: '', destinationLocationId: '', approverId: '', reason: '' },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!currentUser) throw new Error('Not signed in')
      return inventoryApi.addMovement({
        itemId: values.itemId,
        type: 'transfer',
        quantity: values.quantity,
        sourceLocationId: values.sourceLocationId,
        destinationLocationId: values.destinationLocationId,
        approverId: values.approverId,
        reason: values.reason?.trim() || undefined,
        createdBy: currentUser.name,
      })
    },
    onSuccess: () => {
      toast.success('Transfer submitted — awaiting approval')
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
    onSuccess: () => {
      toast.success('Transfer approved')
      invalidate()
    },
    onError: (err) => toast.error('Approve failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ m, reason }: { m: StockMovement; reason: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return inventoryApi.rejectMovement(m.id, reason, currentUser.name)
    },
    onSuccess: () => {
      toast.success('Transfer rejected')
      setRejectTarget(null)
      setRejectReason('')
      invalidate()
    },
    onError: (err) => toast.error('Reject failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))
  const approverOptions = users
    .filter((u) => u.status === 'active' && u.moduleAdmins.includes('inventory') && u.name !== currentUser?.name)
    .map((u) => ({ value: u.name, label: u.name + (u.position ? ` — ${u.position}` : '') }))

  return (
    <div className="space-y-6">
      <PageHeader title="Transfers" subtitle="Move stock between warehouses. Posts only after approval." />

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <form
          onSubmit={handleSubmit((v) => submitMutation.mutate(v))}
          className="bg-white rounded-xl border border-zinc-200/60 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <p className="text-[13px] font-semibold text-zinc-900">New Transfer</p>
          </div>

          <Select
            label="Item *"
            placeholder="Select item"
            options={itemOptions}
            {...register('itemId')}
            error={errors.itemId?.message}
          />

          <Select
            label="Source Warehouse *"
            placeholder="Select source"
            options={warehouseOptions}
            {...register('sourceLocationId')}
            error={errors.sourceLocationId?.message}
          />

          <Select
            label={settings.requireWarehouseOnTransfer ? 'Destination Warehouse *' : 'Destination Warehouse'}
            placeholder="Select destination"
            options={warehouseOptions}
            {...register('destinationLocationId')}
            error={errors.destinationLocationId?.message}
          />

          <Input
            label="Quantity *"
            type="number"
            min={1}
            placeholder="0"
            {...register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
          />

          <Select
            label="Approving Authority *"
            placeholder="Select approver"
            options={approverOptions}
            {...register('approverId')}
            error={errors.approverId?.message}
          />
          <p className="text-[11px] text-zinc-400 -mt-2">The named person can approve or reject this transfer.</p>

          <Textarea
            label="Remarks"
            rows={2}
            placeholder="Optional notes for the approver"
            {...register('reason')}
          />

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => reset()} disabled={submitMutation.isPending}>
              Clear
            </Button>
            <Button type="submit" loading={submitMutation.isPending} fullWidth>
              Submit Transfer
            </Button>
          </div>
        </form>

        <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-100">
            <p className="text-[13px] font-semibold text-zinc-900">Transfer List</p>
            <span className="text-[11px] text-zinc-400">{transfers.length} shown</span>
          </div>
          {isLoading ? (
            <TableSkeleton columns={6} rows={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">From → To</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 && (
                    <DataTableEmpty colSpan={7} icon={Activity} message="No transfers yet" />
                  )}
                  {transfers.map((m) => {
                    const canAct = m.status === 'pending' && m.approverId === currentUser?.name
                    return (
                      <tr key={m.id} className="border-b border-zinc-100/60 align-top">
                        <td className="px-4 py-3 text-[11px] font-mono text-zinc-500">{m.id}</td>
                        <td className="px-4 py-3 text-[13px] text-zinc-700">
                          {itemMap[m.itemId]?.name ?? m.itemId}
                          <span className="block text-[11px] text-zinc-400 font-mono">{itemMap[m.itemId]?.sku}</span>
                          {m.reason && <span className="block text-[11px] text-zinc-500 mt-0.5 italic">{m.reason}</span>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-zinc-600 whitespace-nowrap">
                          {warehouseMap[m.sourceLocationId ?? '']?.name ?? '—'}
                          <span className="text-zinc-400 mx-1">→</span>
                          {warehouseMap[m.destinationLocationId ?? '']?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] tabular-nums font-medium text-zinc-900 text-right">{m.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium', STATUS_PILL[m.status])}>
                            {STATUS_LABEL[m.status]}
                          </span>
                          {m.status === 'pending' && m.approverId && (
                            <p className="text-[10.5px] text-zinc-400 mt-1">Awaits {m.approverId}</p>
                          )}
                          {m.status === 'rejected' && m.rejectedReason && (
                            <p className="text-[10.5px] text-red-600 mt-1 max-w-[200px]">{m.rejectedReason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                          {format(parseISO(m.createdAt), 'MMM d, HH:mm')}
                          <span className="block text-[10.5px] text-zinc-400">{m.createdBy}</span>
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
        title={`Reject transfer ${rejectTarget?.id ?? ''}?`}
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
            placeholder="e.g. Destination warehouse already at capacity"
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

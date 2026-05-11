import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRequests } from '@/features/procurement'
import { useSuppliers } from '@/features/suppliers'
import { useInventoryItems } from '@/features/inventory'
import { useAuthStore } from '@/features/auth'
import {
  useCreatePurchaseOrder,
  usePurchaseOrders,
} from '@/features/purchase-orders'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Checkbox } from '@/shared/ui/checkbox'
import { formatCurrency } from '@/shared/utils/format'

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1, 'Qty must be 1 or more'),
  unitCost: z.number().min(0, 'Cost must be 0 or more'),
})

const poSchema = z.object({
  requisitionId: z.string().min(1, 'Pick an approved requisition'),
  supplierId: z.string().min(1, 'Supplier is required'),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, 'At least one line item is required'),
})

type POForm = z.infer<typeof poSchema>

interface CreatePOModalProps {
  open: boolean
  onClose: () => void
  /** Pre-selected requisition (from approvals "Issue PO" action). When set,
   * the requisition picker is hidden and items pre-fill from that request. */
  requisitionId?: string
}

export function CreatePOModal({ open, onClose, requisitionId }: CreatePOModalProps) {
  const { data: requests = [] } = useRequests()
  const { data: pos = [] } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useInventoryItems()
  const currentUser = useAuthStore((s) => s.user)
  const createMutation = useCreatePurchaseOrder()

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  /** Approved requisitions that don't already have a non-cancelled PO against them. */
  const eligibleRequests = useMemo(() => {
    const taken = new Set(
      pos.filter((p) => p.status !== 'cancelled').map((p) => p.requisitionId),
    )
    return requests.filter((r) => r.status === 'approved' && !taken.has(r.id))
  }, [requests, pos])

  const [sendImmediately, setSendImmediately] = useState(true)

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<POForm>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      requisitionId: requisitionId ?? '',
      supplierId: '',
      expectedDeliveryDate: '',
      notes: '',
      items: [],
    },
  })

  const { fields, replace } = useFieldArray({ control, name: 'items' })
  const watchedReq = watch('requisitionId')
  const watchedItems = watch('items')

  /** When the requisition changes (or modal opens with a pre-selected one), pull its line items + supplier. */
  useEffect(() => {
    if (!open) return
    if (!watchedReq) return
    const req = [...eligibleRequests, ...requests.filter((r) => r.id === watchedReq)].find((r) => r.id === watchedReq)
    if (!req) return
    if (req.supplierId) setValue('supplierId', req.supplierId)
    replace(
      req.items.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitCost: line.unitCost,
      })),
    )
  }, [watchedReq, open, requests, eligibleRequests, replace, setValue])

  /** Reset form when modal closes or the pre-selected requisition changes. */
  useEffect(() => {
    if (!open) return
    reset({
      requisitionId: requisitionId ?? '',
      supplierId: '',
      expectedDeliveryDate: '',
      notes: '',
      items: [],
    })
    setSendImmediately(true)
  }, [open, requisitionId, reset])

  const total = watchedItems?.reduce(
    (sum, l) => sum + (Number(l?.quantity) || 0) * (Number(l?.unitCost) || 0),
    0,
  ) ?? 0

  const close = () => {
    reset({ requisitionId: '', supplierId: '', expectedDeliveryDate: '', notes: '', items: [] })
    onClose()
  }

  const onSubmit = async (data: POForm) => {
    if (!currentUser) {
      toast.error('You must be signed in')
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        requisitionId: data.requisitionId,
        supplierId: data.supplierId,
        expectedDeliveryDate: data.expectedDeliveryDate || undefined,
        notes: data.notes,
        createdBy: currentUser.id,
        sendImmediately,
        items: data.items.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
      })
      toast.success(`${created.id} created`, {
        description: sendImmediately ? 'Sent to supplier' : 'Saved as draft',
      })
      close()
    } catch (err) {
      toast.error('PO creation failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Purchase Order"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close} disabled={createMutation.isPending}>Cancel</Button>
          <Button type="submit" form="create-po-form" loading={createMutation.isPending}>
            {sendImmediately ? 'Create & Send' : 'Save Draft'}
          </Button>
        </>
      }
    >
      <form id="create-po-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!requisitionId && (
          <Select
            label="Approved Requisition *"
            {...register('requisitionId')}
            error={errors.requisitionId?.message}
            placeholder={eligibleRequests.length === 0 ? 'No approved requisitions available' : 'Select a requisition'}
            disabled={eligibleRequests.length === 0}
            options={eligibleRequests.map((r) => ({
              value: r.id,
              label: `${r.id} · ${r.items.length} line${r.items.length === 1 ? '' : 's'} · ${formatCurrency(r.totalAmount)}`,
            }))}
          />
        )}

        {requisitionId && (
          <div className="px-3 py-2 rounded-md bg-zinc-50 border border-zinc-200/60">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">From requisition</p>
            <p className="font-mono text-[13px] text-zinc-700">{requisitionId}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Supplier *"
            {...register('supplierId')}
            error={errors.supplierId?.message}
            placeholder="Select supplier"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input
            label="Expected Delivery"
            type="date"
            {...register('expectedDeliveryDate')}
          />
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Line Items</p>
          {fields.length === 0 ? (
            <p className="text-[13px] text-zinc-500 py-3 text-center bg-zinc-50/50 rounded-md border border-zinc-200/60 border-dashed">
              {watchedReq ? 'No items on the selected requisition' : 'Pick a requisition to load items'}
            </p>
          ) : (
            <div className="rounded-md border border-zinc-200/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50/50 text-[11px] uppercase tracking-wider text-zinc-400">
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                    <th className="text-right px-3 py-2 font-medium w-32">Unit Cost</th>
                    <th className="text-right px-3 py-2 font-medium w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const item = itemMap[field.itemId]
                    const qty = Number(watchedItems?.[idx]?.quantity) || 0
                    const cost = Number(watchedItems?.[idx]?.unitCost) || 0
                    return (
                      <tr key={field.id} className="border-t border-zinc-100">
                        <td className="px-3 py-2">
                          <p className="text-[13px] text-zinc-900">{item?.name ?? field.itemId}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{item?.sku ?? '—'}</p>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                            className="w-full text-right px-2 py-1 rounded border border-zinc-200 text-[13px] tabular-nums focus:outline-none focus:border-zinc-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            {...register(`items.${idx}.unitCost`, { valueAsNumber: true })}
                            className="w-full text-right px-2 py-1 rounded border border-zinc-200 text-[13px] tabular-nums focus:outline-none focus:border-zinc-400"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-zinc-900">
                          {formatCurrency(qty * cost)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50/50 border-t border-zinc-200">
                    <td colSpan={3} className="px-3 py-2 text-right text-[13px] text-zinc-500">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[13px] font-semibold text-zinc-900">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <Textarea label="Notes" {...register('notes')} rows={2} placeholder="Optional — internal note for this PO" />

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={sendImmediately} onChange={setSendImmediately} />
          <div className="min-w-0">
            <p className="text-[13px] text-zinc-900">Send to supplier immediately</p>
            <p className="text-[12px] text-zinc-500">Uncheck to save as a draft for review</p>
          </div>
        </label>
      </form>
    </Modal>
  )
}

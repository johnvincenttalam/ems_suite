import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDepartments } from '@/features/departments'
import { useSuppliers } from '@/features/suppliers'
import { useInventoryItems } from '@/features/inventory'
import { useUom } from '@/features/uom'
import { useAuthStore } from '@/features/auth'
import { procurementApi } from '@/features/procurement/api/procurement-api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { formatCurrency } from '@/shared/utils/format'

const requestSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, 'Item is required'),
    quantity: z.number().int().min(1, 'Quantity must be 1 or more'),
    unitCost: z.number().min(0, 'Cost must be 0 or more'),
  })).min(1, 'Add at least one line item'),
})

type RequestForm = z.infer<typeof requestSchema>

interface NewRequestModalProps {
  open: boolean
  onClose: () => void
}

export function NewRequestModal({ open, onClose }: NewRequestModalProps) {
  const { data: departments = [] } = useDepartments()
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useInventoryItems()
  const { data: uom = [] } = useUom()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]))
  const uomMap = Object.fromEntries(uom.map((u) => [u.id, u]))

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { items: [{ itemId: '', quantity: 1, unitCost: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems = watch('items')
  const total = watchedItems?.reduce((sum, i) => sum + (Number(i?.quantity) || 0) * (Number(i?.unitCost) || 0), 0) ?? 0

  const createMutation = useMutation({
    mutationFn: procurementApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })

  const close = () => {
    reset({ items: [{ itemId: '', quantity: 1, unitCost: 0 }] })
    onClose()
  }

  const onSubmit = async (data: RequestForm) => {
    if (!currentUser) {
      toast.error('You must be signed in')
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        requesterId: currentUser.id,
        departmentId: data.departmentId,
        supplierId: data.supplierId || undefined,
        notes: data.notes,
        items: data.items,
      })
      toast.success(`Submitted ${created.id}`, {
        description: `${created.items.length} line${created.items.length === 1 ? '' : 's'} · ${formatCurrency(created.totalAmount)}`,
      })
      close()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submit failed'
      toast.error(message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Procurement Request"
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" disabled={createMutation.isPending} onClick={close}>Cancel</Button>
          <Button type="submit" form="new-request-form" loading={createMutation.isPending}>Submit Request</Button>
        </>
      }
    >
      <form id="new-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Department *" {...register('departmentId')} error={errors.departmentId?.message} placeholder="Select department" options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <Select label="Preferred Supplier" {...register('supplierId')} error={errors.supplierId?.message} placeholder="Optional" options={suppliers.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: s.name }))} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-zinc-700">Line Items *</label>
            <button type="button" onClick={() => append({ itemId: '', quantity: 1, unitCost: 0 })} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 hover:text-zinc-900">
              <Plus className="w-3.5 h-3.5" />
              Add line
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const itemId = watchedItems?.[idx]?.itemId
              const symbol = itemId ? uomMap[itemMap[itemId]?.uomId ?? '']?.symbol : ''
              return (
                <div key={field.id} className="grid grid-cols-[1fr_90px_110px_36px] gap-2 items-start">
                  <Select {...register(`items.${idx}.itemId`)} placeholder="Select item" options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))} error={errors.items?.[idx]?.itemId?.message} />
                  <div>
                    <Input type="number" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} error={errors.items?.[idx]?.quantity?.message} placeholder="Qty" />
                    {symbol && <p className="text-[10px] text-zinc-400 mt-1 text-center font-mono">{symbol}</p>}
                  </div>
                  <Input type="number" step="0.01" {...register(`items.${idx}.unitCost`, { valueAsNumber: true })} error={errors.items?.[idx]?.unitCost?.message} placeholder="Cost" />
                  <button
                    type="button"
                    onClick={() => fields.length > 1 && remove(idx)}
                    disabled={fields.length === 1}
                    className="h-10 w-9 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
          {errors.items?.message && <p className="text-xs text-red-600 mt-1">{errors.items.message}</p>}
        </div>

        <Textarea label="Notes" {...register('notes')} rows={2} placeholder="Any context for the approver..." />

        <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 border border-zinc-200/60">
          <span className="text-[13px] text-zinc-500">Estimated total</span>
          <span className="text-base font-semibold tabular-nums text-zinc-900">{formatCurrency(total)}</span>
        </div>

      </form>
    </Modal>
  )
}

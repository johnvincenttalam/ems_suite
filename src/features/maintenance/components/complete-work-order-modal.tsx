import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { formatCurrency } from '@/shared/utils/format'
import { useInventoryItems } from '@/features/inventory'
import type { InspectionResult, WorkOrder, WorkOrderPart } from '@/features/maintenance/types'
import { cn } from '@/shared/utils/cn'

interface PartDraft {
  itemId: string
  quantity: number
  unitCost: number
}

interface CompleteWorkOrderModalProps {
  open: boolean
  wo: WorkOrder | null
  assetLabel: string
  loading: boolean
  onClose: () => void
  onConfirm: (input: {
    notes?: string
    laborHours?: number
    laborCost?: number
    partsUsed: WorkOrderPart[]
    inspectionResult?: InspectionResult
  }) => void
}

export function CompleteWorkOrderModal({
  open,
  wo,
  assetLabel,
  loading,
  onClose,
  onConfirm,
}: CompleteWorkOrderModalProps) {
  const { data: items = [] } = useInventoryItems()
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const [notes, setNotes] = useState('')
  const [laborHours, setLaborHours] = useState<string>('')
  const [laborCost, setLaborCost] = useState<string>('')
  const [parts, setParts] = useState<PartDraft[]>([])
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | ''>('')

  const isInspection = wo?.type === 'inspection'

  useEffect(() => {
    if (!open) return
    setNotes('')
    setLaborHours('')
    setLaborCost('')
    setParts([])
    setInspectionResult('')
  }, [open, wo?.id])

  const partsTotal = useMemo(
    () => parts.reduce((s, p) => s + p.quantity * p.unitCost, 0),
    [parts],
  )
  const laborCostNum = laborCost === '' ? 0 : Number(laborCost) || 0
  const total = laborCostNum + partsTotal

  function addPart() {
    setParts((prev) => [...prev, { itemId: '', quantity: 1, unitCost: 0 }])
  }

  function updatePart(index: number, patch: Partial<PartDraft>) {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p
        const next = { ...p, ...patch }
        if (patch.itemId !== undefined && patch.itemId !== p.itemId) {
          const item = itemMap[patch.itemId]
          if (item?.unitCost !== undefined) next.unitCost = item.unitCost
        }
        return next
      }),
    )
  }

  function removePart(index: number) {
    setParts((prev) => prev.filter((_, i) => i !== index))
  }

  function handleConfirm() {
    const cleanedParts: WorkOrderPart[] = parts
      .filter((p) => p.itemId && p.quantity > 0)
      .map((p) => ({ itemId: p.itemId, quantity: p.quantity, unitCost: p.unitCost }))
    onConfirm({
      notes: notes.trim() || undefined,
      laborHours: laborHours === '' ? undefined : Number(laborHours),
      laborCost: laborCost === '' ? undefined : Number(laborCost),
      partsUsed: cleanedParts,
      inspectionResult: isInspection && inspectionResult ? inspectionResult : undefined,
    })
  }

  const confirmDisabled = isInspection && !inspectionResult

  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Complete ${wo?.id ?? ''}`}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="success"
            loading={loading}
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            Confirm Completion
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-500">
          Record labor and parts used. If this is the only open work order for{' '}
          <span className="font-medium text-zinc-700">{assetLabel}</span>, the asset returns
          to active status.
        </p>

        {isInspection && (
          <div>
            <label className="text-[12.5px] font-medium text-zinc-700 mb-1.5 block">
              Inspection Result *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInspectionResult('pass')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium transition-colors',
                  inspectionResult === 'pass'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400',
                )}
              >
                Pass
              </button>
              <button
                type="button"
                onClick={() => setInspectionResult('fail')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium transition-colors',
                  inspectionResult === 'fail'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400',
                )}
              >
                Fail
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Labor Hours"
            type="number"
            min={0}
            step="0.25"
            value={laborHours}
            onChange={(e) => setLaborHours(e.target.value)}
            placeholder="e.g. 2.5"
          />
          <Input
            label="Labor Cost"
            type="number"
            min={0}
            step="0.01"
            value={laborCost}
            onChange={(e) => setLaborCost(e.target.value)}
            placeholder="e.g. 112.50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12.5px] font-medium text-zinc-700">Parts Used</label>
            <button
              type="button"
              onClick={addPart}
              className="inline-flex items-center gap-1 text-[12px] text-zinc-600 hover:text-zinc-900"
            >
              <Plus className="w-3.5 h-3.5" />
              Add part
            </button>
          </div>

          {parts.length === 0 ? (
            <p className="text-[12.5px] text-zinc-400 px-3 py-3 bg-zinc-50/70 rounded-lg border border-dashed border-zinc-200">
              No parts recorded.
            </p>
          ) : (
            <div className="space-y-2">
              {parts.map((p, i) => {
                const subtotal = p.quantity * p.unitCost
                return (
                  <div key={i} className="grid grid-cols-[1fr_90px_110px_90px_28px] gap-2 items-end">
                    <Select
                      label={i === 0 ? 'Item' : undefined}
                      value={p.itemId}
                      onChange={(e) => updatePart(i, { itemId: e.target.value })}
                      placeholder="Select item"
                      options={itemOptions}
                    />
                    <Input
                      label={i === 0 ? 'Qty' : undefined}
                      type="number"
                      min={0}
                      step="1"
                      value={p.quantity}
                      onChange={(e) => updatePart(i, { quantity: Number(e.target.value) || 0 })}
                    />
                    <Input
                      label={i === 0 ? 'Unit cost' : undefined}
                      type="number"
                      min={0}
                      step="0.01"
                      value={p.unitCost}
                      onChange={(e) => updatePart(i, { unitCost: Number(e.target.value) || 0 })}
                    />
                    <div className="text-[12.5px] text-zinc-700 tabular-nums text-right pb-2">
                      {formatCurrency(subtotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePart(i)}
                      className="h-[34px] w-7 mb-0 inline-flex items-center justify-center text-zinc-400 hover:text-red-600 rounded"
                      aria-label="Remove part"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <span className="text-[12.5px] text-zinc-500">Total cost</span>
          <span className="text-[14px] font-semibold text-zinc-900 tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>

        <Textarea
          label="Completion Notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Replaced air filter, topped off coolant — operating within spec"
        />
      </div>
    </Modal>
  )
}

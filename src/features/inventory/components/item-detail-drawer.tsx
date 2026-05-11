import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Edit2, Boxes, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Settings2, Inbox, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import { useInventoryItems, useStockMovements, useCycleCountSessions } from '@/features/inventory'
import { useCategories } from '@/features/categories'
import { useUom } from '@/features/uom'
import { useWarehouses } from '@/features/warehouses'
import { useAuditLog } from '@/features/audit-log'
import type {
  InventoryItem,
  StockMovement,
  StockMovementStatus,
  StockMovementType,
  CycleCountSession,
  CycleCountLine,
} from '@/features/inventory/types'
import { Tabs } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

type DrawerTab = 'overview' | 'movements' | 'cycle-counts' | 'history'

interface ItemDetailDrawerProps {
  open: boolean
  item: InventoryItem | null
  onClose: () => void
  onEdit?: (item: InventoryItem) => void
}

export function ItemDetailDrawer({ open, item, onClose, onEdit }: ItemDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('overview')

  useEffect(() => {
    if (open) setTab('overview')
  }, [open, item?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const tabs: { label: string; value: DrawerTab }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Movements', value: 'movements' },
    { label: 'Cycle Counts', value: 'cycle-counts' },
    { label: 'History', value: 'history' },
  ]

  return (
    <AnimatePresence>
      {open && item && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] as const }}
            className="absolute top-0 right-0 h-full w-full sm:w-[640px] bg-white shadow-xl border-l border-zinc-200 flex flex-col"
          >
            <DrawerHeader item={item} onClose={onClose} onEdit={onEdit} />

            <div className="px-6 pt-3 border-b border-zinc-100">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'overview' && <OverviewTab item={item} />}
              {tab === 'movements' && <MovementsTab item={item} />}
              {tab === 'cycle-counts' && <CycleCountsTab item={item} />}
              {tab === 'history' && <HistoryTab item={item} />}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function stockState(item: InventoryItem): { label: string; classes: string } {
  if (item.quantity <= 0) {
    return { label: 'Out of stock', classes: 'bg-red-50 text-red-700 border-red-200' }
  }
  if (item.reorderLevel > 0 && item.quantity <= item.reorderLevel) {
    return { label: 'Low stock', classes: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  return { label: 'In stock', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

function DrawerHeader({
  item,
  onClose,
  onEdit,
}: {
  item: InventoryItem
  onClose: () => void
  onEdit?: (item: InventoryItem) => void
}) {
  const { data: categories = [] } = useCategories()
  const { data: uom = [] } = useUom()
  const category = categories.find((c) => c.id === item.categoryId)
  const itemUom = uom.find((u) => u.id === item.uomId)
  const state = stockState(item)

  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-14 h-14 rounded-md bg-zinc-100 border border-zinc-200/60 flex items-center justify-center flex-shrink-0">
          <Boxes className="w-6 h-6 text-zinc-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-zinc-400">{item.sku}</span>
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium', state.classes)}>
              {state.label}
            </span>
          </div>
          <h2 className="text-base font-semibold text-zinc-900 leading-snug truncate mt-0.5">{item.name}</h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {category?.name ?? '—'}
            {itemUom && <span className="text-zinc-300"> · </span>}
            {itemUom && <>{itemUom.name} ({itemUom.symbol})</>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onEdit && (
          <Button size="sm" variant="outline" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => onEdit(item)}>
            Edit
          </Button>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function OverviewTab({ item }: { item: InventoryItem }) {
  const { data: items = [] } = useInventoryItems()
  const { data: categories = [] } = useCategories()
  const { data: uom = [] } = useUom()
  const { data: warehouses = [] } = useWarehouses()
  const { data: movements = [] } = useStockMovements()

  // Refresh from latest server snapshot — passed-in `item` is whatever was
  // clicked, but movements approvals can change quantity in the background.
  const fresh = items.find((i) => i.id === item.id) ?? item
  const category = categories.find((c) => c.id === fresh.categoryId)
  const itemUom = uom.find((u) => u.id === fresh.uomId)
  const warehouse = warehouses.find((w) => w.id === fresh.warehouseId)

  const itemMovements = useMemo(
    () => movements.filter((m) => m.itemId === fresh.id && m.status === 'applied'),
    [movements, fresh.id],
  )

  const lastIn = useMemo(
    () => itemMovements.filter((m) => m.type === 'in').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [itemMovements],
  )
  const lastOut = useMemo(
    () => itemMovements.filter((m) => m.type === 'out').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [itemMovements],
  )

  const onHandValue = fresh.unitCost ? fresh.unitCost * fresh.quantity : undefined
  const isLow = fresh.reorderLevel > 0 && fresh.quantity <= fresh.reorderLevel
  const symbol = itemUom?.symbol ?? ''

  return (
    <div className="space-y-6">
      <Section title="Identification">
        <Grid>
          <Field label="SKU" mono>{fresh.sku}</Field>
          <Field label="Item ID" mono>{fresh.id}</Field>
          <Field label="Name">{fresh.name}</Field>
          <Field label="Category">{category?.name ?? <span className="text-zinc-400">—</span>}</Field>
        </Grid>
        {fresh.description && (
          <div className="mt-3">
            <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">Description</p>
            <p className="text-[13px] text-zinc-700">{fresh.description}</p>
          </div>
        )}
      </Section>

      <Section title="Stock">
        <Grid>
          <Field label="On Hand">
            <span className={cn('tabular-nums font-semibold', isLow ? 'text-amber-600' : 'text-zinc-900')}>
              {fresh.quantity.toLocaleString()}
            </span>
            {symbol && <span className="text-[11px] text-zinc-400 font-mono ml-1">{symbol}</span>}
            {isLow && <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1" />}
          </Field>
          <Field label="Reorder Level">
            <span className="tabular-nums">{fresh.reorderLevel.toLocaleString()}</span>
            {symbol && <span className="text-[11px] text-zinc-400 font-mono ml-1">{symbol}</span>}
          </Field>
          <Field label="Unit of Measure">{itemUom ? `${itemUom.name} (${itemUom.symbol})` : '—'}</Field>
          <Field label="Last Stock-In">
            {lastIn ? format(parseISO(lastIn.createdAt), 'MMM d, yyyy') : <span className="text-zinc-400">—</span>}
          </Field>
          <Field label="Last Stock-Out">
            {lastOut ? format(parseISO(lastOut.createdAt), 'MMM d, yyyy') : <span className="text-zinc-400">—</span>}
          </Field>
        </Grid>
      </Section>

      <Section title="Location">
        <Grid>
          <Field label="Warehouse">{warehouse?.name ?? <span className="text-zinc-400">—</span>}</Field>
          <Field label="Warehouse Type">
            {warehouse?.type ? <span className="capitalize">{warehouse.type}</span> : <span className="text-zinc-400">—</span>}
          </Field>
        </Grid>
      </Section>

      <Section title="Commercial">
        <Grid>
          <Field label="Unit Cost">
            {typeof fresh.unitCost === 'number' ? formatCurrency(fresh.unitCost) : <span className="text-zinc-400">—</span>}
          </Field>
          <Field label="On-Hand Value">
            {typeof onHandValue === 'number' ? formatCurrency(onHandValue) : <span className="text-zinc-400">—</span>}
          </Field>
          <Field label="Created">{format(parseISO(fresh.createdAt), 'MMM d, yyyy')}</Field>
        </Grid>
      </Section>
    </div>
  )
}

function MovementsTab({ item }: { item: InventoryItem }) {
  const { data: movements = [] } = useStockMovements()
  const { data: warehouses = [] } = useWarehouses()
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])

  const rows = useMemo(
    () =>
      movements
        .filter((m) => m.itemId === item.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50),
    [movements, item.id],
  )

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No stock movements yet"
        message="Stock-ins, transfers, and adjustments for this item will appear here."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map((m) => (
        <MovementRow key={m.id} movement={m} warehouseMap={warehouseMap} />
      ))}
    </ul>
  )
}

const MOVEMENT_META: Record<StockMovementType, { icon: LucideIcon; label: string; classes: string }> = {
  in: { icon: ArrowDownToLine, label: 'Stock In', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  out: { icon: ArrowUpFromLine, label: 'Stock Out', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  adjustment: { icon: Settings2, label: 'Adjustment', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const STATUS_META: Record<StockMovementStatus, { label: string; classes: string }> = {
  applied: { label: 'Applied', classes: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Rejected', classes: 'bg-red-50 text-red-700 border-red-200' },
}

function MovementRow({
  movement,
  warehouseMap,
}: {
  movement: StockMovement
  warehouseMap: Record<string, { name: string }>
}) {
  const meta = MOVEMENT_META[movement.type]
  const Icon = meta.icon
  const status = STATUS_META[movement.status]
  const isInflow = movement.type === 'in' || (movement.type === 'transfer' && !!movement.destinationLocationId)
  const sign = movement.type === 'adjustment' ? '' : isInflow ? '+' : '−'

  return (
    <li className="rounded-lg border border-zinc-200/60 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-md border flex items-center justify-center flex-shrink-0', meta.classes)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-medium text-zinc-900">{meta.label}</span>
            <span className="font-mono text-[10.5px] text-zinc-400">{movement.id}</span>
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-medium', status.classes)}>
              {status.label}
            </span>
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {movement.sourceLocationId && warehouseMap[movement.sourceLocationId] && (
              <>From {warehouseMap[movement.sourceLocationId].name}</>
            )}
            {movement.sourceLocationId && movement.destinationLocationId && <span className="text-zinc-300"> → </span>}
            {movement.destinationLocationId && warehouseMap[movement.destinationLocationId] && (
              <>To {warehouseMap[movement.destinationLocationId].name}</>
            )}
            {movement.reason && (
              <>
                {(movement.sourceLocationId || movement.destinationLocationId) && <span className="text-zinc-300"> · </span>}
                {movement.reason}
              </>
            )}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {movement.createdBy} · {format(parseISO(movement.createdAt), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn(
            'text-[14px] font-semibold tabular-nums',
            movement.type === 'in' && 'text-emerald-600',
            movement.type === 'out' && 'text-rose-600',
            movement.type === 'adjustment' && 'text-amber-600',
            movement.type === 'transfer' && 'text-blue-600',
          )}>
            {sign}{movement.quantity.toLocaleString()}
          </p>
        </div>
      </div>
    </li>
  )
}

function CycleCountsTab({ item }: { item: InventoryItem }) {
  const { data: sessions = [] } = useCycleCountSessions()
  const { data: warehouses = [] } = useWarehouses()
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])

  const rows = useMemo(() => {
    return sessions
      .map((s) => {
        const line = s.lines.find((l) => l.itemId === item.id)
        return line ? { session: s, line } : null
      })
      .filter((r): r is { session: CycleCountSession; line: CycleCountLine } => r !== null)
      .sort((a, b) => b.session.scheduledDate.localeCompare(a.session.scheduledDate))
  }, [sessions, item.id])

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No cycle counts"
        message="When this item is included in a count session it will appear here with the variance."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map(({ session, line }) => {
        const variance =
          typeof line.actualQty === 'number' ? line.actualQty - line.expectedQty : null
        return (
          <li key={session.id} className="rounded-lg border border-zinc-200/60 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10.5px] text-zinc-400">{session.id}</span>
                  <span className="text-[10.5px] uppercase tracking-wider text-zinc-400">{session.status.replace('_', ' ')}</span>
                </div>
                <p className="text-[12.5px] text-zinc-700 mt-0.5">
                  {warehouseMap[session.warehouseId]?.name ?? session.warehouseId} · {format(parseISO(session.scheduledDate), 'MMM d, yyyy')}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Expected <span className="tabular-nums">{line.expectedQty.toLocaleString()}</span>
                  {typeof line.actualQty === 'number' ? (
                    <> · Counted <span className="tabular-nums">{line.actualQty.toLocaleString()}</span></>
                  ) : (
                    <> · Not counted yet</>
                  )}
                </p>
              </div>
              {variance !== null && (
                <span
                  className={cn(
                    'text-[14px] font-semibold tabular-nums whitespace-nowrap',
                    variance === 0 ? 'text-zinc-500' : variance > 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function HistoryTab({ item }: { item: InventoryItem }) {
  const { data: auditEntries = [] } = useAuditLog()
  const entries = useMemo(() => {
    const idLower = item.id.toLowerCase()
    const skuLower = item.sku.toLowerCase()
    return auditEntries
      .filter((e) => {
        const d = e.detail.toLowerCase()
        return d.includes(idLower) || d.includes(skuLower)
      })
      .slice(0, 30)
  }, [auditEntries, item.id, item.sku])

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No history yet"
        message="Edits, stock movements, and admin actions involving this item will appear here."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-zinc-200/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] text-zinc-700">{entry.detail}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {entry.userName} · {format(parseISO(entry.timestamp), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <span className="text-[10.5px] uppercase tracking-wider text-zinc-400">{entry.action}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">{label}</p>
      <div className={cn('text-[13px] text-zinc-800 break-words', mono && 'font-mono')}>{children}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon className="w-7 h-7 text-zinc-300 mx-auto mb-3" />
      <p className="text-[14px] font-medium text-zinc-700">{title}</p>
      <p className="text-[12.5px] text-zinc-500 mt-1 max-w-sm mx-auto">{message}</p>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, ListChecks, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useUsers } from '@/features/users'
import { useSuppliers } from '@/features/suppliers'
import { useInventoryItems } from '@/features/inventory'
import { useUom } from '@/features/uom'
import type { PurchaseOrderWithItems } from '@/features/purchase-orders/types'
import { PO_STATUS_LABEL } from '@/features/purchase-orders/types'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { formatCurrency } from '@/shared/utils/format'

type DrawerTab = 'overview' | 'lines'

interface PoDetailDrawerProps {
  po: PurchaseOrderWithItems | null
  onClose: () => void
}

export function PoDetailDrawer({ po, onClose }: PoDetailDrawerProps) {
  const { data: users = [] } = useUsers()
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useInventoryItems()
  const { data: uom = [] } = useUom()
  const [tab, setTab] = useState<DrawerTab>('overview')

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const uomMap = useMemo(() => Object.fromEntries(uom.map((u) => [u.id, u])), [uom])

  useEffect(() => {
    if (po) setTab('overview')
  }, [po?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (po) {
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [po, onClose])

  if (!po) return <AnimatePresence />

  const supplier = supplierMap[po.supplierId]
  const createdByUser = userMap[po.createdBy]
  const cancelledByUser = po.cancelledBy ? userMap[po.cancelledBy] : null

  const receivedTotal = po.items.reduce((s, l) => s + l.receivedQty, 0)
  const expectedTotal = po.items.reduce((s, l) => s + l.quantity, 0)

  const tabs: { label: string; value: DrawerTab; count?: number }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Lines', value: 'lines', count: po.items.length },
  ]

  return (
    <AnimatePresence>
      {po && (
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
            className="absolute top-0 right-0 h-full w-full sm:w-[560px] bg-white shadow-xl border-l border-zinc-200 flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[11px] text-zinc-400">{po.id}</span>
                  <StatusBadge status={po.status} label={PO_STATUS_LABEL[po.status]} size="sm" />
                </div>
                <h2 className="text-base font-semibold text-zinc-900 truncate">
                  {supplier?.name ?? po.supplierId}
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  From <span className="font-mono">{po.requisitionId}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors flex-shrink-0"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-3">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {tab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Supplier">{supplier?.name ?? po.supplierId}</Field>
                    <Field label="Requisition"><span className="font-mono text-[12px]">{po.requisitionId}</span></Field>
                    <Field label="Lines">{po.items.length}</Field>
                    <Field label="Total"><span className="font-semibold tabular-nums">{formatCurrency(po.totalAmount)}</span></Field>
                    <Field label="Received">
                      <span className="tabular-nums">{receivedTotal}/{expectedTotal}</span>
                    </Field>
                    <Field label="Created">{format(parseISO(po.createdAt), 'MMM dd, yyyy HH:mm')}</Field>
                    <Field label="Created By">{createdByUser?.name ?? po.createdBy}</Field>
                    {po.sentAt && <Field label="Sent">{format(parseISO(po.sentAt), 'MMM dd, yyyy HH:mm')}</Field>}
                    {po.expectedDeliveryDate && <Field label="Expected Delivery">{format(parseISO(po.expectedDeliveryDate), 'MMM dd, yyyy')}</Field>}
                  </div>

                  {po.notes && (
                    <Section title="Notes">
                      <p className="text-[13px] text-zinc-700">{po.notes}</p>
                    </Section>
                  )}

                  {po.status === 'cancelled' && po.cancelReason && (
                    <Section title="Cancellation">
                      <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200">
                        <p className="text-[11px] uppercase tracking-wider text-red-600 font-semibold">
                          Cancelled by {cancelledByUser?.name ?? '—'}
                          {po.cancelledAt && ` · ${format(parseISO(po.cancelledAt), 'MMM dd, HH:mm')}`}
                        </p>
                        <p className="text-[13px] text-red-700 mt-0.5">{po.cancelReason}</p>
                      </div>
                    </Section>
                  )}
                </>
              )}

              {tab === 'lines' && (
                <Section title={`Line Items (${po.items.length})`}>
                  {po.items.length === 0 ? (
                    <EmptyMessage icon={ListChecks} message="No line items." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[11px] uppercase text-zinc-400 tracking-wider">
                            <th className="text-left py-2 font-medium">Item</th>
                            <th className="text-right py-2 font-medium">Ordered</th>
                            <th className="text-right py-2 font-medium">Received</th>
                            <th className="text-right py-2 font-medium">Unit</th>
                            <th className="text-right py-2 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items.map((line) => {
                            const item = itemMap[line.itemId]
                            const symbol = item ? uomMap[item.uomId]?.symbol : ''
                            const allReceived = line.receivedQty >= line.quantity
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
                                <td className="py-2 text-right tabular-nums">
                                  <span className={allReceived ? 'text-emerald-700 font-medium' : 'text-zinc-700'}>
                                    {line.receivedQty.toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 text-right tabular-nums text-zinc-700">{formatCurrency(line.unitCost)}</td>
                                <td className="py-2 text-right tabular-nums font-medium text-zinc-900">{formatCurrency(line.quantity * line.unitCost)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-200">
                            <td colSpan={4} className="py-2 text-right text-[13px] text-zinc-500">Total</td>
                            <td className="py-2 text-right tabular-nums text-base font-semibold text-zinc-900">{formatCurrency(po.totalAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Section>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">{label}</p>
      <div className="text-[13px] text-zinc-700">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{title}</p>
      {children}
    </div>
  )
}

function EmptyMessage({ icon: Icon, message }: { icon: typeof ClipboardList; message: string }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
      <p className="text-[13px] text-zinc-500">{message}</p>
    </div>
  )
}

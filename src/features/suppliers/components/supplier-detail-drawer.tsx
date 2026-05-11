import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Mail, MapPin, Pencil, Phone, Truck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useRequests } from '@/features/procurement'
import { usePurchaseOrders } from '@/features/purchase-orders'
import { PO_STATUS_LABEL } from '@/features/purchase-orders'
import type { Supplier } from '@/features/suppliers/types'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { formatCurrency } from '@/shared/utils/format'

type DrawerTab = 'overview' | 'activity'

interface SupplierDetailDrawerProps {
  supplier: Supplier | null
  onClose: () => void
  onEdit: (supplier: Supplier) => void
}

export function SupplierDetailDrawer({ supplier, onClose, onEdit }: SupplierDetailDrawerProps) {
  const { data: requests = [] } = useRequests()
  const { data: pos = [] } = usePurchaseOrders()
  const [tab, setTab] = useState<DrawerTab>('overview')

  useEffect(() => {
    if (supplier) setTab('overview')
  }, [supplier?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (supplier) {
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [supplier, onClose])

  const supplierPos = useMemo(
    () => (supplier ? pos.filter((p) => p.supplierId === supplier.id) : []),
    [pos, supplier],
  )

  const supplierRequests = useMemo(
    () => (supplier ? requests.filter((r) => r.supplierId === supplier.id) : []),
    [requests, supplier],
  )

  const stats = useMemo(() => {
    const totalPos = supplierPos.length
    const activePos = supplierPos.filter(
      (p) => p.status === 'ordered' || p.status === 'partially_received',
    ).length
    const completedPos = supplierPos.filter((p) => p.status === 'completed')
    const lifetimeSpend = completedPos.reduce((s, p) => s + p.totalAmount, 0)
    const pendingValue = supplierPos
      .filter((p) => p.status === 'ordered' || p.status === 'partially_received')
      .reduce((s, p) => s + p.totalAmount, 0)
    return { totalPos, activePos, lifetimeSpend, pendingValue }
  }, [supplierPos])

  if (!supplier) return <AnimatePresence />

  const tabs: { label: string; value: DrawerTab; count?: number }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Activity', value: 'activity', count: supplierPos.length + supplierRequests.length },
  ]

  return (
    <AnimatePresence>
      {supplier && (
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
              <div className="min-w-0 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[11px] text-zinc-400">{supplier.id}</span>
                    <StatusBadge status={supplier.status} size="sm" />
                  </div>
                  <h2 className="text-base font-semibold text-zinc-900 truncate">{supplier.name}</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{supplier.contactPerson}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="outline" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onEdit(supplier)}>
                  Edit
                </Button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-6 pt-3">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {tab === 'overview' && (
                <>
                  <Section title="Contact">
                    <ul className="space-y-2">
                      <ContactRow icon={Mail} value={supplier.email} href={`mailto:${supplier.email}`} />
                      <ContactRow icon={Phone} value={supplier.contactNumber} href={`tel:${supplier.contactNumber}`} />
                      <ContactRow icon={MapPin} value={supplier.address} />
                    </ul>
                  </Section>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Total POs">{stats.totalPos}</Field>
                    <Field label="Active POs">{stats.activePos}</Field>
                    <Field label="Lifetime Spend">
                      <span className="font-semibold tabular-nums">{formatCurrency(stats.lifetimeSpend)}</span>
                    </Field>
                    <Field label="Open Value">
                      <span className="tabular-nums">{formatCurrency(stats.pendingValue)}</span>
                    </Field>
                    <Field label="Onboarded">{format(parseISO(supplier.createdAt), 'MMM dd, yyyy')}</Field>
                  </div>
                </>
              )}

              {tab === 'activity' && (
                <>
                  <Section title={`Purchase Orders (${supplierPos.length})`}>
                    {supplierPos.length === 0 ? (
                      <EmptyMessage icon={ClipboardList} message="No POs against this supplier yet." />
                    ) : (
                      <ul className="space-y-1.5">
                        {supplierPos.map((po) => (
                          <li key={po.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-zinc-50/60 border border-zinc-200/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[12px] text-zinc-700">{po.id}</span>
                              <StatusBadge status={po.status} label={PO_STATUS_LABEL[po.status]} size="sm" />
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="tabular-nums text-[12px] text-zinc-700">{formatCurrency(po.totalAmount)}</span>
                              <Link to={`../purchase-orders?po=${po.id}`} className="text-[12px] text-zinc-500 hover:text-zinc-900">
                                Open
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <Section title={`Linked Requests (${supplierRequests.length})`}>
                    {supplierRequests.length === 0 ? (
                      <EmptyMessage icon={ClipboardList} message="No requests reference this supplier." />
                    ) : (
                      <ul className="space-y-1.5">
                        {supplierRequests.map((req) => (
                          <li key={req.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-zinc-50/60 border border-zinc-200/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[12px] text-zinc-700">{req.id}</span>
                              <StatusBadge
                                status={req.status}
                                label={req.status === 'rejected' ? 'Declined' : undefined}
                                size="sm"
                              />
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="tabular-nums text-[12px] text-zinc-700">{formatCurrency(req.totalAmount)}</span>
                              <Link to={`../requests?req=${req.id}`} className="text-[12px] text-zinc-500 hover:text-zinc-900">
                                Open
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </>
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

function ContactRow({
  icon: Icon,
  value,
  href,
}: {
  icon: typeof Mail
  value: string
  href?: string
}) {
  const body = (
    <span className="inline-flex items-center gap-2 text-[13px] text-zinc-700">
      <Icon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  )
  return (
    <li>
      {href ? (
        <a href={href} className="hover:text-zinc-900 [&_span]:hover:text-zinc-900">
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  )
}

function EmptyMessage({ icon: Icon, message }: { icon: typeof ClipboardList; message: string }) {
  return (
    <div className="text-center py-6">
      <Icon className="w-7 h-7 mx-auto text-zinc-300 mb-2" />
      <p className="text-[13px] text-zinc-500">{message}</p>
    </div>
  )
}

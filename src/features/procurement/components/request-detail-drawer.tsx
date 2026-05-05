import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ClipboardList, GitBranch, ListChecks, Shield, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { useSuppliers } from '@/features/suppliers'
import { useInventoryItems } from '@/features/inventory'
import { useUom } from '@/features/uom'
import { PRIORITY_LABEL, type RequestPriority, type RequestWithItems } from '@/features/procurement/types'
import { Avatar } from '@/shared/ui/avatar'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

type DrawerTab = 'overview' | 'chain' | 'lines'

interface RequestDetailDrawerProps {
  request: RequestWithItems | null
  onClose: () => void
}

const priorityColors: Record<RequestPriority, string> = {
  low: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
}

export function RequestDetailDrawer({ request, onClose }: RequestDetailDrawerProps) {
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useInventoryItems()
  const { data: uom = [] } = useUom()
  const [tab, setTab] = useState<DrawerTab>('overview')

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const uomMap = useMemo(() => Object.fromEntries(uom.map((u) => [u.id, u])), [uom])

  useEffect(() => {
    if (request) setTab('overview')
  }, [request?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (request) {
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [request, onClose])

  if (!request) return <AnimatePresence />

  const dept = departments.find((d) => d.id === request.departmentId)
  const supplier = request.supplierId ? suppliers.find((s) => s.id === request.supplierId) : null
  const requester = userMap[request.requesterId]

  const tabs: { label: string; value: DrawerTab; count?: number }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Chain', value: 'chain', count: request.approvers?.length ?? 0 },
    { label: 'Lines', value: 'lines', count: request.items.length },
  ]

  const approvalMap = Object.fromEntries((request.approvals ?? []).map((a) => [a.approverId, a]))

  return (
    <AnimatePresence>
      {request && (
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
                  <span className="font-mono text-[11px] text-zinc-400">{request.id}</span>
                  <StatusBadge status={request.status} size="sm" />
                  {request.priority && (
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium',
                      priorityColors[request.priority],
                    )}>
                      {PRIORITY_LABEL[request.priority]}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-zinc-900 truncate">
                  {request.notes || `Request ${request.id}`}
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {requester?.name ?? '—'} · {dept?.name ?? '—'}{supplier ? ` · ${supplier.name}` : ''}
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
                    <Field label="Requester">{requester?.name ?? request.requesterId}</Field>
                    <Field label="Department">{dept?.name ?? '—'}</Field>
                    {supplier && <Field label="Supplier">{supplier.name}</Field>}
                    <Field label="Lines">{request.items.length}</Field>
                    <Field label="Total"><span className="font-semibold tabular-nums">{formatCurrency(request.totalAmount)}</span></Field>
                    <Field label="Created">{format(parseISO(request.createdAt), 'MMM dd, yyyy HH:mm')}</Field>
                    {request.neededBy && <Field label="Needed by">{request.neededBy}</Field>}
                    {request.approvedAt && <Field label="Approved">{format(parseISO(request.approvedAt), 'MMM dd, yyyy HH:mm')}</Field>}
                  </div>

                  {request.notes && (
                    <Section title="Notes">
                      <p className="text-[13px] text-zinc-700">{request.notes}</p>
                    </Section>
                  )}

                  {request.rejectedReason && (
                    <Section title="Rejection">
                      <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200">
                        <p className="text-[11px] uppercase tracking-wider text-red-600 font-semibold">
                          Rejected by {userMap[request.rejectedBy ?? '']?.name ?? '—'}
                          {request.rejectedAt && ` · ${format(parseISO(request.rejectedAt), 'MMM dd, HH:mm')}`}
                        </p>
                        <p className="text-[13px] text-red-700 mt-0.5">{request.rejectedReason}</p>
                      </div>
                    </Section>
                  )}
                </>
              )}

              {tab === 'chain' && (
                <>
                  <Section title="Approval Chain">
                    {!request.approvers || request.approvers.length === 0 ? (
                      <EmptyMessage icon={GitBranch} message="No approval chain configured for this request." />
                    ) : (
                      <ul className="space-y-3">
                        {request.approvers.map((approverId, idx) => {
                          const approval = approvalMap[approverId]
                          const isCurrent = request.currentApproverIndex === idx && request.status === 'pending'
                          const isRejectedHere = request.status === 'rejected' && request.currentApproverIndex === idx
                          return (
                            <li key={`${approverId}-${idx}`} className="flex items-start gap-3 px-3 py-2 rounded-md bg-zinc-50/40 border border-zinc-200/60">
                              <div className="relative">
                                <Avatar name={userMap[approverId]?.name ?? approverId} size="sm" />
                                <div className={cn(
                                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center',
                                  isRejectedHere ? 'bg-red-500' : approval ? 'bg-emerald-500' : isCurrent ? 'bg-blue-500' : 'bg-zinc-300',
                                )}>
                                  {approval && <CheckCircle2 className="w-2 h-2 text-white" />}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[13px] font-medium text-zinc-900">{userMap[approverId]?.name ?? approverId}</span>
                                  <span className="font-mono text-[10px] text-zinc-400">step {idx + 1}/{request.approvers!.length}</span>
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                  {approval
                                    ? `Approved ${format(parseISO(approval.approvedAt), 'MMM dd, HH:mm')}`
                                    : isRejectedHere ? 'Rejected here'
                                    : isCurrent ? 'Pending — your turn'
                                    : 'Waiting'}
                                </p>
                                {approval?.comment && (
                                  <p className="text-[12px] text-zinc-700 mt-1">{approval.comment}</p>
                                )}
                              </div>
                              {approval && <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-1" />}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </Section>
                </>
              )}

              {tab === 'lines' && (
                <Section title={`Line Items (${request.items.length})`}>
                  {request.items.length === 0 ? (
                    <EmptyMessage icon={ListChecks} message="No line items." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[11px] uppercase text-zinc-400 tracking-wider">
                            <th className="text-left py-2 font-medium">Item</th>
                            <th className="text-right py-2 font-medium">Qty</th>
                            <th className="text-right py-2 font-medium">Unit</th>
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

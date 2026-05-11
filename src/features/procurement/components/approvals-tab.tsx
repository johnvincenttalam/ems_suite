import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, ClipboardCheck, Inbox, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useRequests } from '@/features/procurement'
import { procurementApi } from '@/features/procurement/api/procurement-api'
import { useDepartments } from '@/features/departments'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  PRIORITY_LABEL,
  type RequestPriority,
  type RequestWithItems,
} from '@/features/procurement/types'
import { formatCurrency } from '@/shared/utils/format'
import { Tabs } from '@/shared/ui/tabs'
import { SearchInput } from '@/shared/ui/search-input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'
import { RequestDetailDrawer } from './request-detail-drawer'

type TabKey = 'pending' | 'awaiting' | 'approved' | 'declined'

const declineSchema = z.object({
  reason: z.string().min(2, 'Reason is required'),
})

type DeclineForm = z.infer<typeof declineSchema>

const priorityChip: Record<RequestPriority, string> = {
  low: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
}

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

interface DeadlineBadge {
  text: string
  tone: 'normal' | 'urgent' | 'overdue'
}

function deadlineLabel(deadline: string | undefined): DeadlineBadge | null {
  if (!deadline) return null
  const days = differenceInCalendarDays(parseISO(deadline), new Date())
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'overdue' }
  if (days === 0) return { text: 'Today', tone: 'urgent' }
  if (days === 1) return { text: 'Tomorrow', tone: 'urgent' }
  if (days <= 3) return { text: `${days}d`, tone: 'urgent' }
  return { text: format(parseISO(deadline), 'MMM d'), tone: 'normal' }
}

export function ApprovalsTab() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: requests = [], isLoading } = useRequests()
  const { data: departments = [] } = useDepartments()
  const { data: users = [] } = useUsers()

  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [tab, setTab] = useState<TabKey>('pending')
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [declineTarget, setDeclineTarget] = useState<RequestWithItems | null>(null)
  const [drawerReq, setDrawerReq] = useState<RequestWithItems | null>(null)
  const [approveTarget, setApproveTarget] = useState<RequestWithItems | null>(null)
  const approveForm = useForm<{ comment: string }>({ defaultValues: { comment: '' } })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DeclineForm>({ resolver: zodResolver(declineSchema) })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['procurement'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const buckets = useMemo(() => {
    if (!user) {
      return { pending: [], awaiting: [], approved: [], declined: [], totalActionable: 0 }
    }
    const pending: RequestWithItems[] = []
    const awaiting: RequestWithItems[] = []
    const approved: RequestWithItems[] = []
    const declined: RequestWithItems[] = []
    for (const r of requests) {
      const inChain = !!r.approvers && r.approvers.includes(user.id)
      if (r.status === 'pending') {
        const isChain = !!r.approvers && r.approvers.length > 0
        if (!isChain) {
          pending.push(r)
          continue
        }
        const idx = r.currentApproverIndex ?? 0
        if (r.approvers![idx] === user.id) {
          pending.push(r)
        } else if (inChain && (r.approvals ?? []).some((a) => a.approverId === user.id)) {
          awaiting.push(r)
        }
      } else if (r.status === 'approved' && inChain) {
        approved.push(r)
      } else if (r.status === 'rejected' && (inChain || r.rejectedBy === user.id)) {
        declined.push(r)
      }
    }
    const sortNewest = (a: RequestWithItems, b: RequestWithItems) => b.createdAt.localeCompare(a.createdAt)
    pending.sort(sortNewest)
    awaiting.sort(sortNewest)
    approved.sort(sortNewest)
    declined.sort(sortNewest)
    return { pending, awaiting, approved, declined, totalActionable: pending.length }
  }, [requests, user])

  const approveMutation = useMutation({
    mutationFn: ({ req, comment }: { req: RequestWithItems; comment?: string }) => {
      if (!user) throw new Error('Not signed in')
      return procurementApi.approve(req.id, user.id, comment)
    },
    onSuccess: (updated, { req }) => {
      if (updated.status === 'approved') {
        toast.success(`${req.id} fully approved — ${req.items.length} stock-in movement${req.items.length === 1 ? '' : 's'} created`, {
          description: `Inventory updated · ${formatCurrency(req.totalAmount)}`,
        })
      } else {
        const idx = updated.currentApproverIndex ?? 0
        const nextApprover = updated.approvers?.[idx]
        const nextName = nextApprover ? userMap[nextApprover]?.name ?? nextApprover : '—'
        toast.success(`Signed off on ${req.id}`, { description: `Next approver: ${nextName}` })
      }
      invalidate()
    },
    onError: (err) => toast.error('Approve failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const declineMutation = useMutation({
    mutationFn: ({ req, reason }: { req: RequestWithItems; reason: string }) => {
      if (!user) throw new Error('Not signed in')
      return procurementApi.reject(req.id, reason, user.id)
    },
    onSuccess: (_data, { req }) => {
      toast.success(`${req.id} declined`)
      invalidate()
    },
    onError: (err) => toast.error('Decline failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const handleApprove = (data: { comment: string }) => {
    if (!approveTarget) return
    approveMutation.mutate(
      { req: approveTarget, comment: data.comment || undefined },
      { onSettled: () => { setApproveTarget(null); approveForm.reset() } },
    )
  }

  const handleDecline = (data: DeclineForm) => {
    if (!declineTarget) return
    declineMutation.mutate(
      { req: declineTarget, reason: data.reason },
      { onSettled: () => { setDeclineTarget(null); reset() } },
    )
  }

  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'All Departments' },
      ...departments.map((d) => ({ value: d.id, label: d.name })),
    ],
    [departments],
  )

  const filterFn = (r: RequestWithItems) => {
    if (departmentFilter && r.departmentId !== departmentFilter) return false
    if (priorityFilter && r.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const requester = userMap[r.requesterId]?.name?.toLowerCase() ?? ''
      const dept = deptMap[r.departmentId]?.name?.toLowerCase() ?? ''
      const haystack = `${r.id} ${r.notes ?? ''} ${requester} ${dept}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }

  const visible = useMemo(() => buckets[tab].filter(filterFn), [buckets, tab, search, departmentFilter, priorityFilter, userMap, deptMap])

  const tabItems = [
    { value: 'pending', label: 'Pending Approvals', count: buckets.pending.length },
    { value: 'awaiting', label: 'Awaiting Others', count: buckets.awaiting.length },
    { value: 'approved', label: 'Approved', count: buckets.approved.length },
    { value: 'declined', label: 'Declined', count: buckets.declined.length },
  ]

  if (isLoading) return <TableSkeleton columns={3} rows={5} />

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <div className="px-5 pt-3">
          <Tabs items={tabItems} value={tab} onChange={(v) => setTab(v as TabKey)} />
        </div>

        <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-100">
          <Select
            options={departmentOptions}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="!h-9 w-[180px] text-[13px]"
          />
          <Select
            options={PRIORITY_OPTIONS}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="!h-9 w-[160px] text-[13px]"
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search requests…"
            className="flex-1 min-w-[220px]"
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={tab === 'pending' || tab === 'awaiting' ? ClipboardCheck : Inbox}
            title={emptyTitle(tab)}
            description={emptyDescription(tab)}
          />
        ) : (
          <ul>
            {visible.map((req, i) => (
              <li
                key={req.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-zinc-50/50',
                  i !== visible.length - 1 && 'border-b border-zinc-100/60',
                )}
                onClick={() => setDrawerReq(req)}
              >
                <RequestRowBody
                  tab={tab}
                  req={req}
                  requesterName={userMap[req.requesterId]?.name}
                  departmentName={deptMap[req.departmentId]?.name}
                />
                <div
                  className="flex items-center gap-2 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    tab={tab}
                    onApprove={() => setApproveTarget(req)}
                    onDecline={() => setDeclineTarget(req)}
                    onOpen={() => setDrawerReq(req)}
                    busy={approveMutation.isPending || declineMutation.isPending}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!approveTarget}
        onClose={() => { setApproveTarget(null); approveForm.reset() }}
        title={`Approve ${approveTarget?.id ?? ''}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => { setApproveTarget(null); approveForm.reset() }} disabled={approveMutation.isPending}>Cancel</Button>
            <Button type="submit" form="approve-request-form" variant="success" loading={approveMutation.isPending}>Confirm Approval</Button>
          </>
        }
      >
        <form id="approve-request-form" onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Your approval will be timestamped. If you're the final approver, stock-in movements will be created immediately.
          </p>
          <Textarea label="Comment (optional)" {...approveForm.register('comment')} rows={3} placeholder="Reviewed and approved..." />
        </form>
      </Modal>

      <Modal
        open={!!declineTarget}
        onClose={() => { setDeclineTarget(null); reset() }}
        title={`Decline ${declineTarget?.id ?? 'Request'}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => { setDeclineTarget(null); reset() }} disabled={declineMutation.isPending}>Cancel</Button>
            <Button type="submit" form="decline-request-form" variant="danger" loading={declineMutation.isPending}>Confirm Decline</Button>
          </>
        }
      >
        <form id="decline-request-form" onSubmit={handleSubmit(handleDecline)} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Provide a reason — the requester will see this in the audit log.
          </p>
          <Textarea label="Reason *" {...register('reason')} rows={3} error={errors.reason?.message} placeholder="e.g. Insufficient budget, defer to next quarter" />
        </form>
      </Modal>

      <RequestDetailDrawer request={drawerReq} onClose={() => setDrawerReq(null)} />
    </motion.div>
  )
}

function emptyTitle(tab: TabKey): string {
  switch (tab) {
    case 'pending': return 'All caught up'
    case 'awaiting': return 'Nothing awaiting others'
    case 'approved': return 'No approved requests yet'
    case 'declined': return 'No declined requests'
  }
}

function emptyDescription(tab: TabKey): string {
  switch (tab) {
    case 'pending': return 'No requests are waiting on your approval right now.'
    case 'awaiting': return 'Requests you have signed off but are waiting on other approvers appear here.'
    case 'approved': return 'Requests fully approved through your chain will appear here.'
    case 'declined': return 'Requests you declined or that were declined in chains you participate in.'
  }
}

interface RequestRowBodyProps {
  tab: TabKey
  req: RequestWithItems
  requesterName?: string
  departmentName?: string
}

function RequestRowBody({ tab, req, requesterName, departmentName }: RequestRowBodyProps) {
  const idx = req.currentApproverIndex ?? 0
  const total = req.approvers?.length ?? 1
  const dl = deadlineLabel(req.neededBy)

  let stepText = ''
  if (tab === 'pending') stepText = total > 1 ? `Step ${idx + 1}/${total} — awaiting your approval` : 'Awaiting your approval'
  else if (tab === 'awaiting') stepText = `Step ${idx + 1}/${total} — awaiting next approver`
  else if (tab === 'approved') stepText = req.approvedAt ? `Approved ${format(parseISO(req.approvedAt), 'MMM d, HH:mm')}` : 'Approved'
  else if (tab === 'declined') stepText = req.rejectedReason ? `Declined: ${req.rejectedReason}` : 'Declined'

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[12px] font-semibold text-zinc-700">{req.id}</span>
        <span className="text-zinc-300">·</span>
        <span className="text-[13px] font-medium text-zinc-900 truncate">
          {req.notes || `${req.items.length} line${req.items.length === 1 ? '' : 's'}`}
        </span>
        {req.priority && (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium', priorityChip[req.priority])}>
            {PRIORITY_LABEL[req.priority]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-1 text-[12px] text-zinc-500">
        {requesterName && <span>From: {requesterName}</span>}
        {departmentName && (
          <>
            <span className="text-zinc-300">·</span>
            <span>{departmentName}</span>
          </>
        )}
        <span className="text-zinc-300">·</span>
        <span className="truncate">{stepText}</span>
        <span className="text-zinc-300">·</span>
        <span className="tabular-nums font-medium text-zinc-700">{formatCurrency(req.totalAmount)}</span>
        {(tab === 'pending' || tab === 'awaiting') && dl && (
          <>
            <span className="text-zinc-300">·</span>
            <span
              className={cn(
                dl.tone === 'overdue' && 'text-red-600 font-medium',
                dl.tone === 'urgent' && 'text-amber-700 font-medium',
              )}
            >
              Due: {dl.text}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

interface RowActionsProps {
  tab: TabKey
  onApprove: () => void
  onDecline: () => void
  onOpen: () => void
  busy: boolean
}

function RowActions({ tab, onApprove, onDecline, onOpen, busy }: RowActionsProps) {
  if (tab === 'pending') {
    return (
      <>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-red-200 text-red-700 text-[12px] font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Decline
        </button>
      </>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-700 text-[12px] font-medium hover:bg-zinc-50 transition-colors"
    >
      Open
      <ChevronRight className="w-3.5 h-3.5" />
    </button>
  )
}

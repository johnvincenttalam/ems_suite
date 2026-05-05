import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, GitBranch, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useRequests } from '@/features/procurement'
import { procurementApi } from '@/features/procurement/api/procurement-api'
import { useDepartments } from '@/features/departments'
import { useSuppliers } from '@/features/suppliers'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  PRIORITY_LABEL,
  type RequestPriority,
  type RequestWithItems,
} from '@/features/procurement/types'
import { formatCurrency } from '@/shared/utils/format'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'
import { RequestDetailDrawer } from './request-detail-drawer'

const rejectSchema = z.object({
  reason: z.string().min(2, 'Reason is required'),
})

type RejectForm = z.infer<typeof rejectSchema>

const priorityChip: Record<RequestPriority, string> = {
  low: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
}

export function ApprovalsTab() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: requests = [], isLoading } = useRequests()
  const { data: departments = [] } = useDepartments()
  const { data: suppliers = [] } = useSuppliers()
  const { data: users = [] } = useUsers()

  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments])
  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  /**
   * In chain mode, only show requests where the current user is the next
   * expected approver. In legacy mode (no `approvers` array), show all
   * pending requests so the page is still useful for orgs that haven't
   * adopted chains yet.
   */
  const myQueue = useMemo(() => {
    if (!user) return []
    return requests.filter((r) => {
      if (r.status !== 'pending') return false
      const isChain = !!r.approvers && r.approvers.length > 0
      if (!isChain) return true
      const idx = r.currentApproverIndex ?? 0
      return r.approvers![idx] === user.id
    })
  }, [requests, user])

  const [rejectTarget, setRejectTarget] = useState<RequestWithItems | null>(null)
  const [drawerReq, setDrawerReq] = useState<RequestWithItems | null>(null)
  const [approveTarget, setApproveTarget] = useState<RequestWithItems | null>(null)
  const approveForm = useForm<{ comment: string }>({ defaultValues: { comment: '' } })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['procurement'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

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

  const rejectMutation = useMutation({
    mutationFn: ({ req, reason }: { req: RequestWithItems; reason: string }) => {
      if (!user) throw new Error('Not signed in')
      return procurementApi.reject(req.id, reason, user.id)
    },
    onSuccess: (_data, { req }) => {
      toast.success(`${req.id} rejected`)
      invalidate()
    },
    onError: (err) => toast.error('Reject failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const handleApprove = (data: { comment: string }) => {
    if (!approveTarget) return
    approveMutation.mutate(
      { req: approveTarget, comment: data.comment || undefined },
      { onSettled: () => { setApproveTarget(null); approveForm.reset() } },
    )
  }

  const handleReject = (data: RejectForm) => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { req: rejectTarget, reason: data.reason },
      { onSettled: () => { setRejectTarget(null); reset() } },
    )
  }

  if (isLoading) return <TableSkeleton columns={4} rows={6} />

  if (myQueue.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={ClipboardCheck}
          title="All caught up"
          description="No pending requests need your approval right now."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {myQueue.map((req) => {
        const requester = userMap[req.requesterId]
        const dept = deptMap[req.departmentId]
        const supplier = req.supplierId ? supplierMap[req.supplierId] : null
        const idx = req.currentApproverIndex ?? 0
        const total = req.approvers?.length ?? 1
        const daysLeft = req.neededBy ? differenceInCalendarDays(parseISO(req.neededBy), new Date()) : null
        const overdue = daysLeft !== null && daysLeft < 0

        return (
          <div key={req.id} className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
            <div className="px-6 py-4 flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={() => setDrawerReq(req)}
                className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer"
              >
                {requester && <Avatar name={requester.name} size="md" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[12px] text-zinc-500">{req.id}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-[13px] font-medium text-zinc-900">{requester?.name ?? 'Unknown'}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-[13px] text-zinc-500">{dept?.name ?? '—'}</span>
                    {req.priority && (
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ml-1', priorityChip[req.priority])}>
                        {PRIORITY_LABEL[req.priority]}
                      </span>
                    )}
                  </div>
                  {req.notes && <p className="text-[13px] text-zinc-600 mt-1">{req.notes}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[12px] text-zinc-400 flex-wrap">
                    <span>{format(new Date(req.createdAt), 'MMM dd, yyyy · HH:mm')}</span>
                    {supplier && <span>· Supplier: <span className="text-zinc-600">{supplier.name}</span></span>}
                    <span>· {req.items.length} {req.items.length === 1 ? 'line' : 'lines'}</span>
                    <span>· <span className="font-medium text-zinc-900">{formatCurrency(req.totalAmount)}</span></span>
                    {req.approvers && req.approvers.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        <GitBranch className="w-3 h-3" />
                        Step {idx + 1}/{total}
                      </span>
                    )}
                    {req.neededBy && (
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium',
                        overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
                      )}>
                        {overdue ? `Overdue by ${Math.abs(daysLeft!)}d` : `Needed in ${daysLeft}d`}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" leftIcon={<XCircle className="w-4 h-4" />} onClick={() => setRejectTarget(req)} disabled={approveMutation.isPending || rejectMutation.isPending}>Reject</Button>
                <Button variant="success" size="sm" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setApproveTarget(req)} disabled={approveMutation.isPending || rejectMutation.isPending}>Approve</Button>
              </div>
            </div>
          </div>
        )
      })}

      <Modal open={!!approveTarget} onClose={() => { setApproveTarget(null); approveForm.reset() }} title={`Approve ${approveTarget?.id ?? ''}`} size="md">
        <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Your approval will be timestamped. If you're the final approver, stock-in movements will be created immediately.
          </p>
          <Textarea label="Comment (optional)" {...approveForm.register('comment')} rows={3} placeholder="Reviewed and approved..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setApproveTarget(null); approveForm.reset() }} disabled={approveMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="success" fullWidth loading={approveMutation.isPending}>Confirm Approval</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); reset() }} title={`Reject ${rejectTarget?.id ?? 'Request'}`} size="md">
        <form onSubmit={handleSubmit(handleReject)} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Provide a reason — the requester will see this in the audit log.
          </p>
          <Textarea label="Reason *" {...register('reason')} rows={3} error={errors.reason?.message} placeholder="e.g. Insufficient budget, defer to next quarter" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setRejectTarget(null); reset() }} disabled={rejectMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="danger" fullWidth loading={rejectMutation.isPending}>Confirm Rejection</Button>
          </div>
        </form>
      </Modal>

      <RequestDetailDrawer request={drawerReq} onClose={() => setDrawerReq(null)} />
    </div>
  )
}

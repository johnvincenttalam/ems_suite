import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, ChevronRight, Inbox } from 'lucide-react'
import { format, parseISO, formatDistanceToNow, differenceInCalendarDays } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useSdmsTaskBuckets } from '@/features/documents/hooks/use-sdms-task-buckets'
import { documentsApi } from '@/features/documents/api/documents-api'
import {
  CATEGORY_LABEL,
  type AppDocument,
  type DocumentCategory,
  type DocumentPriority,
} from '@/features/documents/types'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { PageHeader } from '@/shared/ui/page-header'
import { Tabs } from '@/shared/ui/tabs'
import { SearchInput } from '@/shared/ui/search-input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { CategoryBadge, PriorityBadge } from '@/features/documents/components/document-meta'
import { getModulePath } from '@/config/modules'
import { cn } from '@/shared/utils/cn'

type TabKey = 'pending' | 'review' | 'returned' | 'completed'

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Types' },
  ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
]

const rejectSchema = z.object({
  reason: z.string().min(2, 'Reason is required'),
})
type RejectForm = z.infer<typeof rejectSchema>

function deadlineLabel(deadline: string | undefined): { text: string; tone: 'normal' | 'urgent' | 'overdue' } {
  if (!deadline) return { text: '—', tone: 'normal' }
  const days = differenceInCalendarDays(parseISO(deadline), new Date())
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'overdue' }
  if (days === 0) return { text: 'Today', tone: 'urgent' }
  if (days === 1) return { text: 'Tomorrow', tone: 'urgent' }
  if (days <= 3) return { text: format(parseISO(deadline), 'MMM d'), tone: 'urgent' }
  return { text: format(parseISO(deadline), 'MMM d'), tone: 'normal' }
}

export function SdmsMyTasksPage() {
  const { user } = useAuthStore()
  const { isLoading } = useDocuments()
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [tab, setTab] = useState<TabKey>('pending')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const openViewer = (doc: AppDocument) => navigate(getModulePath('sdms', `documents/${doc.id}`))

  const [rejectTarget, setRejectTarget] = useState<AppDocument | null>(null)
  const rejectForm = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const signMutation = useMutation({
    mutationFn: (doc: AppDocument) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.sign(doc.id, user.id, undefined, {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      })
    },
    onSuccess: (updated) => {
      toast.success(updated.status === 'approved' ? `${updated.id} approved — final signature` : `${updated.id} signed`)
      invalidate()
    },
    onError: (err) => {
      toast.error('Approve failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ doc, reason }: { doc: AppDocument; reason: string }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.reject(doc.id, reason, user.id)
    },
    onSuccess: (updated) => {
      toast.success(`${updated.id} disapproved`)
      invalidate()
    },
    onError: (err) => {
      toast.error('Disapprove failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const onReject = (data: RejectForm) => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { doc: rejectTarget, reason: data.reason },
      { onSettled: () => { setRejectTarget(null); rejectForm.reset() } },
    )
  }

  const buckets = useSdmsTaskBuckets()

  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'All Departments' },
      ...departments.map((d) => ({ value: d.id, label: d.name })),
    ],
    [departments],
  )

  const filterFn = (d: AppDocument) => {
    if (categoryFilter && d.category !== categoryFilter) return false
    if (departmentFilter && d.departmentId !== departmentFilter) return false
    if (priorityFilter && d.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const author = userMap[d.createdBy]?.name?.toLowerCase() ?? ''
      const haystack = `${d.id} ${d.title} ${d.trackingNumber ?? ''} ${author}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }

  const visible = useMemo(() => buckets[tab].filter(filterFn), [buckets, tab, search, categoryFilter, departmentFilter, priorityFilter, userMap])

  const tabItems = [
    { value: 'pending', label: 'Pending Approvals', count: buckets.pending.length },
    { value: 'review', label: 'For Review', count: buckets.review.length },
    { value: 'returned', label: 'Returned', count: buckets.returned.length },
    { value: 'completed', label: 'Completed', count: buckets.completed.length },
  ]

  const totalActionable = buckets.totalActionable

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Tasks" subtitle="Loading…" />
        <TableSkeleton columns={3} rows={5} />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="My Tasks"
        subtitle={
          totalActionable === 0
            ? "You're all caught up — no tasks waiting on you."
            : `${totalActionable} task${totalActionable === 1 ? '' : 's'} waiting on you.`
        }
      />

      <div className="bg-white rounded-xl border border-zinc-200/60">
        <div className="px-5 pt-3">
          <Tabs items={tabItems} value={tab} onChange={(v) => setTab(v as TabKey)} />
        </div>

        <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-100">
          <Select
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="!h-9 w-[160px] text-[13px]"
          />
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
            placeholder="Search tasks…"
            className="flex-1 min-w-[220px]"
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={tab === 'pending' || tab === 'review' || tab === 'returned' ? CheckCircle2 : Inbox}
            title={emptyTitle(tab)}
            description={emptyDescription(tab)}
          />
        ) : (
          <ul>
            {visible.map((doc, i) => (
              <li
                key={doc.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-zinc-50/50',
                  i !== visible.length - 1 && 'border-b border-zinc-100/60',
                )}
                onClick={() => openViewer(doc)}
              >
                <TaskRowBody
                  tab={tab}
                  doc={doc}
                  authorName={userMap[doc.createdBy]?.name}
                  signerCount={doc.signatures.filter((s) => !s.revokedAt).length}
                />
                <div
                  className="flex items-center gap-2 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    tab={tab}
                    onApprove={() => signMutation.mutate(doc)}
                    onReject={() => setRejectTarget(doc)}
                    onOpen={() => openViewer(doc)}
                    busy={signMutation.isPending && signMutation.variables?.id === doc.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); rejectForm.reset() }}
        title={`Disapprove ${rejectTarget?.id ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectTarget(null); rejectForm.reset() }}>Cancel</Button>
            <Button
              variant="danger"
              onClick={rejectForm.handleSubmit(onReject)}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Disapproving…' : 'Disapprove'}
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={rejectForm.handleSubmit(onReject)}>
          <Textarea
            label="Reason"
            rows={4}
            placeholder="Explain why this is being disapproved — the author will see this."
            error={rejectForm.formState.errors.reason?.message}
            {...rejectForm.register('reason')}
          />
        </form>
      </Modal>
    </motion.div>
  )
}

function emptyTitle(tab: TabKey): string {
  switch (tab) {
    case 'pending': return 'No pending approvals'
    case 'review': return 'No documents for review'
    case 'returned': return 'No returned documents'
    case 'completed': return 'No completed tasks yet'
  }
}

function emptyDescription(tab: TabKey): string {
  switch (tab) {
    case 'pending': return "You're caught up. New approval requests will appear here."
    case 'review': return 'Documents routed to you for review will appear here.'
    case 'returned': return 'Documents that were returned to you for revision appear here.'
    case 'completed': return 'Documents you have signed off will appear here.'
  }
}

interface TaskRowBodyProps {
  tab: TabKey
  doc: AppDocument
  authorName?: string
  signerCount: number
}

function TaskRowBody({ tab, doc, authorName, signerCount }: TaskRowBodyProps) {
  const total = doc.approvers.length || 0
  const stepIndex = (doc.currentApproverIndex ?? 0) + 1
  const lastSig = doc.signatures[doc.signatures.length - 1]
  const dl = deadlineLabel(doc.deadline)

  let stepText = ''
  if (tab === 'pending') stepText = `Step ${stepIndex}/${total} — awaiting your approval`
  else if (tab === 'review') stepText = 'For your review'
  else if (tab === 'returned') {
    const prefix = doc.rejectionType === 'revision_request' ? 'Revision requested' : 'Disapproved'
    stepText = doc.rejectedReason ? `${prefix}: ${doc.rejectedReason}` : prefix
  }
  else if (tab === 'completed' && lastSig) {
    stepText = `Approved ${formatDistanceToNow(parseISO(lastSig.signedAt), { addSuffix: true })} (${signerCount} signature${signerCount === 1 ? '' : 's'})`
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[12px] font-semibold text-zinc-700">{doc.id}</span>
        <span className="text-zinc-300">·</span>
        <span className="text-[13px] font-medium text-zinc-900 truncate">{doc.title}</span>
        {doc.category && <CategoryBadge value={doc.category as DocumentCategory} size="sm" />}
        {doc.priority && <PriorityBadge value={doc.priority as DocumentPriority} size="sm" />}
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-1 text-[12px] text-zinc-500">
        {authorName && <span>From: {authorName}</span>}
        <span className="text-zinc-300">·</span>
        <span className="truncate">{stepText}</span>
        {(tab === 'pending' || tab === 'review') && doc.deadline && (
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
  onReject: () => void
  onOpen: () => void
  busy: boolean
}

function RowActions({ tab, onApprove, onReject, onOpen, busy }: RowActionsProps) {
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
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-red-200 text-red-700 text-[12px] font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Disapprove
        </button>
      </>
    )
  }
  if (tab === 'review') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent text-accent-fg text-[12px] font-medium hover:bg-accent-hover transition-colors"
      >
        Review
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    )
  }
  // returned / completed
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

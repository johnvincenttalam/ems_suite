import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, GitBranch, PenLine } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useDocuments } from '@/features/documents'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import type { AppDocument } from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { differenceInCalendarDays } from 'date-fns'
import { cn } from '@/shared/utils/cn'
import { FileIcon, formatFileSize } from './file-icon'
import { WorkflowChain } from './workflow-chain'
import { CategoryBadge, ConfidentialityBadge, PriorityBadge, TrackingBadge } from './document-meta'
import { DocumentDetailDrawer } from './document-detail-drawer'
import { SignatureModal } from './signature'

const rejectSchema = z.object({
  reason: z.string().min(2, 'Reason is required'),
})

type RejectForm = z.infer<typeof rejectSchema>

export function WorkflowTab() {
  const { data: documents = [], isLoading } = useDocuments()
  const { data: users = [] } = useUsers()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const inReview = useMemo(() => documents.filter((d) => d.status === 'in_review'), [documents])

  const [signTarget, setSignTarget] = useState<AppDocument | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AppDocument | null>(null)
  const [drawerDoc, setDrawerDoc] = useState<AppDocument | null>(null)

  const rejectForm = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const signMutation = useMutation({
    mutationFn: ({ doc, comment, signatureImage }: { doc: AppDocument; comment?: string; signatureImage?: string }) => {
      if (!user) throw new Error('Not signed in')
      const slotKey = doc.signatureSlots?.[doc.currentApproverIndex ?? 0]?.key
      return documentsApi.sign(doc.id, user.id, comment, {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        signatureImage,
        slotKey,
      })
    },
    onSuccess: (updated) => {
      toast.success(updated.status === 'approved' ? `${updated.id} approved — final signature` : `${updated.id} signed`)
      invalidate()
    },
    onError: (err) => {
      toast.error('Sign failed', { description: err instanceof Error ? err.message : 'Unknown error' })
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

  const onSignatureConfirm = (signatureImage: string, comment?: string) => {
    if (!signTarget) return
    signMutation.mutate(
      { doc: signTarget, comment, signatureImage },
      { onSettled: () => setSignTarget(null) },
    )
  }

  const onReject = (data: RejectForm) => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { doc: rejectTarget, reason: data.reason },
      { onSettled: () => { setRejectTarget(null); rejectForm.reset() } },
    )
  }

  if (isLoading) return <TableSkeleton columns={3} rows={4} />

  if (inReview.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={GitBranch}
          title="No documents in review"
          description="Documents currently in workflow will appear here as they move through approvers."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {inReview.map((doc) => {
        const currentApproverId = doc.approvers[doc.currentApproverIndex ?? 0]
        const currentApprover = userMap[currentApproverId]
        const author = userMap[doc.createdBy]
        const daysToDeadline = doc.deadline ? differenceInCalendarDays(parseISO(doc.deadline), new Date()) : null
        const overdue = daysToDeadline !== null && daysToDeadline < 0

        return (
          <div key={doc.id} className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <button
                type="button"
                className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer"
                onClick={() => setDrawerDoc(doc)}
              >
                <FileIcon type={doc.fileType} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TrackingBadge trackingNumber={doc.trackingNumber} />
                    <span className="font-mono text-[11px] text-zinc-400">{doc.id}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-[14px] font-semibold text-zinc-900">{doc.title}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-[11px] font-mono text-zinc-400">v{doc.version}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {doc.category && <CategoryBadge value={doc.category} size="sm" />}
                    {doc.priority && <PriorityBadge value={doc.priority} size="sm" />}
                    {doc.confidentiality && <ConfidentialityBadge value={doc.confidentiality} size="sm" />}
                    {doc.deadline && (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap',
                        overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
                      )}>
                        {overdue ? `Overdue by ${Math.abs(daysToDeadline!)}d` : `Due in ${daysToDeadline}d`}
                      </span>
                    )}
                  </div>
                  {doc.description && <p className="text-[13px] text-zinc-600 mt-2 line-clamp-2">{doc.description}</p>}
                  <p className="text-[12px] text-zinc-400 mt-1">
                    Uploaded by {author?.name ?? '—'} · {format(parseISO(doc.createdAt), 'MMM dd, yyyy')} · {formatFileSize(doc.fileSizeBytes)}
                  </p>
                </div>
              </button>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" leftIcon={<XCircle className="w-4 h-4" />} onClick={() => setRejectTarget(doc)}>Disapprove</Button>
                <Button size="sm" variant="success" leftIcon={<PenLine className="w-4 h-4" />} onClick={() => setSignTarget(doc)}>Sign</Button>
              </div>
            </div>
            <div className="bg-zinc-50/40 px-5 py-4 border-t border-zinc-100">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Workflow</p>
              <WorkflowChain document={doc} userMap={userMap} />
              {currentApprover && (
                <p className="text-[12px] text-blue-700 mt-3 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Awaiting signature from <span className="font-semibold">{currentApprover.name}</span>
                </p>
              )}
            </div>
          </div>
        )
      })}

      <DocumentDetailDrawer document={drawerDoc} onClose={() => setDrawerDoc(null)} />

      <SignatureModal
        open={!!signTarget}
        onClose={() => setSignTarget(null)}
        onConfirm={onSignatureConfirm}
        title={`Sign ${signTarget?.title ?? ''}`}
        busy={signMutation.isPending}
      />

      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); rejectForm.reset() }} title={`Disapprove ${rejectTarget?.title ?? ''}`} size="md">
        <form onSubmit={rejectForm.handleSubmit(onReject)} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            The author will see this in the audit log and may revise and resubmit.
          </p>
          <Textarea label="Reason *" {...rejectForm.register('reason')} rows={3} error={rejectForm.formState.errors.reason?.message} placeholder="e.g. Section 3 contradicts the new policy — please revise" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setRejectTarget(null); rejectForm.reset() }} disabled={rejectMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="danger" fullWidth loading={rejectMutation.isPending}>Confirm Disapproval</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  Move,
  RotateCcw,
  Send,
  ShieldOff,
  X,
  XCircle,
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { documentsApi } from '@/features/documents/api/documents-api'
import {
  CATEGORY_LABEL,
  DOCUMENT_STATUS_LABEL,
  SIGNATURE_METHOD_LABEL,
  SIGNATURE_REASON_LABEL,
  isFinalized,
  isSignatureActive,
  type AppDocument,
  type SignatureSlot,
} from '@/features/documents/types'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { useAuditLog } from '@/features/audit-log'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { Tabs } from '@/shared/ui/tabs'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Spinner } from '@/shared/ui/spinner'
import { Avatar } from '@/shared/ui/avatar'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { CategoryBadge, ConfidentialityBadge, PriorityBadge, TrackingBadge } from '@/features/documents/components/document-meta'
import { formatFileSize } from '@/features/documents/components/file-icon'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/ui/button'
import { PlacementOverlay, SignatureLayer, SignatureModal } from '@/features/documents/components/signature'
import { RevokeSignatureModal } from '@/features/documents/components/revoke-signature-modal'
import { safeAssetUrl } from '@/features/documents/lib/safe-asset-url'

const PdfViewer = lazy(() => import('@/features/documents/components/pdf-viewer'))

type ViewerTab = 'preview' | 'metadata' | 'versions' | 'audit'

export function SdmsDocumentViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: documents = [], isLoading } = useDocuments()
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()
  const { data: auditEntries = [] } = useAuditLog()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const doc = useMemo(() => documents.find((d) => d.id === id), [documents, id])
  const dept = doc?.departmentId ? departments.find((d) => d.id === doc.departmentId) : null

  const [tab, setTab] = useState<ViewerTab>('preview')
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [placementMode, setPlacementMode] = useState(false)
  const [placementSlot, setPlacementSlot] = useState<Omit<SignatureSlot, 'key'> | null>(null)
  const [repositioningSlotKey, setRepositioningSlotKey] = useState<string | null>(null)

  const accessMutation = useMutation({
    mutationFn: ({ docId, activity }: { docId: string; activity: 'view' | 'download' }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.recordAccess(docId, user.id, activity)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  useEffect(() => {
    if (doc && user) {
      accessMutation.mutate({ docId: doc.id, activity: 'view' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const signMutation = useMutation({
    mutationFn: ({ docId, comment, signatureImage, slotKey, placementSlot }: { docId: string; comment?: string; signatureImage?: string; slotKey?: string; placementSlot?: Omit<SignatureSlot, 'key'> }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.sign(docId, user.id, comment, {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        signatureImage,
        slotKey,
        placementSlot,
      })
    },
    onSuccess: (updated) => {
      toast.success(updated.status === 'approved' ? `${updated.id} approved — final signature` : `${updated.id} signed`)
      setComment('')
      invalidate()
    },
    onError: (err) => {
      toast.error('Approve failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.reject(docId, reason, user.id)
    },
    onSuccess: (updated) => {
      toast.success(`${updated.id} disapproved`)
      setComment('')
      invalidate()
    },
    onError: (err) => {
      toast.error('Disapprove failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const revisionMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.requestRevision(docId, reason, user.id)
    },
    onSuccess: (updated) => {
      toast.success(`${updated.id} returned for revision`)
      setComment('')
      invalidate()
    },
    onError: (err) => {
      toast.error('Revision request failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const resubmitMutation = useMutation({
    mutationFn: (docId: string) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.resubmitRevision(docId, user.id)
    },
    onSuccess: (updated) => {
      toast.success(`${updated.id} resubmitted — workflow restarted at v${updated.version}`)
      invalidate()
    },
    onError: (err) => {
      toast.error('Resubmit failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const moveSlotMutation = useMutation({
    mutationFn: ({ docId, slotKey, coords }: { docId: string; slotKey: string; coords: Omit<SignatureSlot, 'key'> }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.moveSlot(docId, slotKey, coords, user.id)
    },
    onSuccess: () => {
      toast.success('Signature repositioned')
      invalidate()
    },
    onError: (err) => {
      toast.error('Reposition failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60 p-12 text-center">
        <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-zinc-900">Document not found</h2>
        <p className="text-[13px] text-zinc-500 mt-1">It may have been deleted, or the link is incorrect.</p>
        <Link
          to=".."
          relative="path"
          className="inline-flex items-center gap-1.5 mt-4 text-[13px] text-accent hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Documents
        </Link>
      </div>
    )
  }

  const idx = doc.currentApproverIndex ?? 0
  const currentApproverId = doc.status === 'in_review' ? doc.approvers[idx] : undefined
  const isCurrentApprover = !!user && currentApproverId === user.id
  const finalized = isFinalized(doc)
  const preDefinedSlot = doc.signatureSlots?.[idx]
  const needsPlacement = isCurrentApprover && !preDefinedSlot

  const tabs = [
    { value: 'preview', label: 'Preview' },
    { value: 'metadata', label: 'Metadata' },
    { value: 'versions', label: 'Versions', count: doc.signatures.length },
    { value: 'audit', label: 'Audit Trail' },
  ]

  const onApprove = () => {
    setCommentError(null)
    const preDefinedSlot = doc.signatureSlots?.[doc.currentApproverIndex ?? 0]
    if (preDefinedSlot) {
      // Slot already exists for this approver — open modal directly.
      setSignatureModalOpen(true)
    } else {
      // No slot — enter placement mode and let the user draw one.
      setPlacementMode(true)
      setTab('preview')
    }
  }

  const onSlotPlaced = (slot: Omit<SignatureSlot, 'key'>) => {
    if (repositioningSlotKey) {
      moveSlotMutation.mutate(
        { docId: doc.id, slotKey: repositioningSlotKey, coords: slot },
        { onSettled: () => { setPlacementMode(false); setRepositioningSlotKey(null) } },
      )
      return
    }
    setPlacementSlot(slot)
    setPlacementMode(false)
    setSignatureModalOpen(true)
  }

  const cancelPlacement = () => {
    setPlacementMode(false)
    setPlacementSlot(null)
    setRepositioningSlotKey(null)
  }

  const startReposition = (slotKey: string) => {
    setRepositioningSlotKey(slotKey)
    setPlacementMode(true)
    setTab('preview')
  }

  const onSignatureConfirm = (signatureImage: string, modalComment?: string) => {
    const preDefinedSlot = doc.signatureSlots?.[doc.currentApproverIndex ?? 0]
    signMutation.mutate(
      {
        docId: doc.id,
        comment: modalComment,
        signatureImage,
        slotKey: preDefinedSlot?.key,
        placementSlot: !preDefinedSlot && placementSlot ? placementSlot : undefined,
      },
      {
        onSettled: () => {
          setSignatureModalOpen(false)
          setPlacementSlot(null)
        },
      },
    )
  }

  const onSignatureModalClose = () => {
    setSignatureModalOpen(false)
    setPlacementSlot(null)
  }

  const onDisapprove = () => {
    if (comment.trim().length < 2) {
      setCommentError('Add a reason before disapproving.')
      return
    }
    setCommentError(null)
    rejectMutation.mutate({ docId: doc.id, reason: comment.trim() })
  }

  const onRequestRevision = () => {
    if (comment.trim().length < 2) {
      setCommentError('Describe what needs to change.')
      return
    }
    setCommentError(null)
    revisionMutation.mutate({ docId: doc.id, reason: comment.trim() })
  }

  const onResubmit = () => {
    setResubmitConfirmOpen(true)
  }

  const onConfirmResubmit = () => {
    resubmitMutation.mutate(doc.id, {
      onSettled: () => setResubmitConfirmOpen(false),
    })
  }

  const actionsBusy = signMutation.isPending || rejectMutation.isPending || revisionMutation.isPending || resubmitMutation.isPending
  const isAuthor = !!user && doc.createdBy === user.id
  const canResubmit = doc.status === 'rejected' && doc.rejectionType === 'revision_request' && isAuthor

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2 text-[12px] text-zinc-500">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Documents
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-700 font-medium">
          {doc.trackingNumber ?? doc.id} {doc.title}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
              {doc.trackingNumber ? `${doc.trackingNumber} ` : ''}{doc.title}
            </h1>
            <StatusBadge status={doc.status} label={DOCUMENT_STATUS_LABEL[doc.status]} />
          </div>
          <p className="text-[13px] text-zinc-500 mt-1">
            {doc.category && <>Type: {CATEGORY_LABEL[doc.category]} · </>}
            {dept && <>Department: {dept.name} · </>}
            Created: {format(parseISO(doc.createdAt), 'MMM d, yyyy')} by {userMap[doc.createdBy]?.name ?? doc.createdBy}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              accessMutation.mutate({ docId: doc.id, activity: 'download' })
              toast.success('Mock download — recorded in access log')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="bg-white rounded-xl border border-zinc-200/60">
          <div className="px-5 pt-3">
            <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as ViewerTab)} />
          </div>
          <div className="p-5">
            {tab === 'preview' && (
              <>
                {placementMode && (
                  <div className="mb-3 flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-[12px] text-emerald-800">
                    <span>
                      {repositioningSlotKey ? (
                        <>
                          <span className="font-semibold">Reposition your signature.</span>{' '}
                          Click and drag on the document to set a new rectangle.
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">Place your signature.</span>{' '}
                          Click and drag on the document to draw a rectangle where it should land.
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={cancelPlacement}
                      className="text-[12px] text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <PreviewArea
                  doc={doc}
                  userMap={userMap}
                  placementMode={placementMode}
                  onSlotPlaced={onSlotPlaced}
                />
              </>
            )}
            {tab === 'metadata' && <MetadataView doc={doc} authorName={userMap[doc.createdBy]?.name} departmentName={dept?.name} />}
            {tab === 'versions' && <VersionsView doc={doc} userMap={userMap} currentUserId={user?.id} onRevoke={() => setRevokeOpen(true)} onReposition={startReposition} />}
            {tab === 'audit' && <AuditTrailView doc={doc} entries={auditEntries} />}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--topbar-h)+1rem)] lg:self-start">
          <WorkflowProgress doc={doc} userMap={userMap} currentUserId={user?.id} />

          <div className="bg-white rounded-xl border border-zinc-200/60 p-4 space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Actions</p>

            {canResubmit && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
                <p className="text-[12px] text-amber-800">
                  Revision was requested. Edit the document, then resubmit to restart the workflow.
                </p>
                {doc.rejectedReason && (
                  <p className="text-[11px] text-amber-700">Reason: {doc.rejectedReason}</p>
                )}
                <button
                  type="button"
                  onClick={onResubmit}
                  disabled={actionsBusy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-[13px] font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resubmit for Approval
                </button>
              </div>
            )}

            {!isCurrentApprover && !canResubmit && (
              <p className="text-[12px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2">
                {finalized
                  ? 'Document is finalized — actions are locked.'
                  : doc.status === 'in_review'
                  ? `Awaiting ${userMap[currentApproverId ?? '']?.name ?? 'next approver'}.`
                  : doc.status === 'approved'
                  ? 'Workflow complete — no actions needed.'
                  : doc.status === 'rejected'
                  ? doc.rejectionType === 'revision_request'
                    ? 'Revision requested — awaiting author resubmission.'
                    : 'Workflow ended in disapproval.'
                  : 'Not yet in review.'}
              </p>
            )}

            {needsPlacement && (
              <p className="text-[11.5px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2">
                No signature placement defined — you&rsquo;ll be asked to place it on the document before signing.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onApprove}
                disabled={!isCurrentApprover || actionsBusy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {needsPlacement ? 'Place & Sign' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={onDisapprove}
                disabled={!isCurrentApprover || actionsBusy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-[13px] font-medium hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Disapprove
              </button>
            </div>

            <button
              type="button"
              onClick={onRequestRevision}
              disabled={!isCurrentApprover || actionsBusy}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Request Revision
            </button>
          </div>

          <CommentsPanel
            doc={doc}
            userMap={userMap}
            comment={comment}
            setComment={setComment}
            error={commentError}
            disabled={!isCurrentApprover}
            onSubmit={onApprove}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={resubmitConfirmOpen}
        onCancel={() => setResubmitConfirmOpen(false)}
        onConfirm={onConfirmResubmit}
        title="Resubmit for approval?"
        message={
          <>
            Prior signatures will be cleared and the workflow restarts at <span className="font-medium text-zinc-900">step 1</span>. The document version will be incremented to <span className="font-medium text-zinc-900">v{doc.version + 1}</span>.
          </>
        }
        confirmLabel="Resubmit"
        tone="warning"
        busy={resubmitMutation.isPending}
      />

      <SignatureModal
        open={signatureModalOpen}
        onClose={onSignatureModalClose}
        onConfirm={onSignatureConfirm}
        title={`Sign ${doc.title}`}
        busy={signMutation.isPending}
      />

      <RevokeSignatureModal document={revokeOpen ? doc : null} onClose={() => setRevokeOpen(false)} />
    </motion.div>
  )
}

interface PreviewAreaProps {
  doc: AppDocument
  userMap: Record<string, { name: string }>
  placementMode?: boolean
  onSlotPlaced?: (slot: Omit<SignatureSlot, 'key'>) => void
}

function PreviewArea({ doc, userMap, placementMode, onSlotPlaced }: PreviewAreaProps) {
  const safeUrl = safeAssetUrl(doc.assetUrl)
  const isImage = (doc.fileType === 'png' || doc.fileType === 'jpg') && !!safeUrl
  if (isImage && safeUrl) {
    return (
      <div className="rounded-lg border border-zinc-200/60 bg-zinc-100/50 p-4">
        <div className="relative mx-auto bg-white shadow-sm" style={{ maxWidth: 800 }}>
          <img
            src={safeUrl}
            alt={doc.title}
            className="block w-full h-auto select-none"
            draggable={false}
          />
          <SignatureLayer doc={doc} userMap={userMap} />
          {placementMode && onSlotPlaced && (
            <PlacementOverlay active page={1} onPlaced={onSlotPlaced} />
          )}
        </div>
      </div>
    )
  }
  if (doc.fileType === 'pdf' && safeUrl) {
    return (
      <Suspense fallback={<div className="rounded-lg border border-zinc-200/60 bg-zinc-50/50 min-h-[480px] flex items-center justify-center"><Spinner size="lg" /></div>}>
        <PdfViewer doc={doc} url={safeUrl} userMap={userMap} placementMode={placementMode} onSlotPlaced={onSlotPlaced} />
      </Suspense>
    )
  }
  return (
    <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/50 min-h-[480px] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
        <FileText className="w-8 h-8 text-zinc-400" />
      </div>
      <p className="text-[13px] font-medium text-zinc-900">{doc.fileName}</p>
      <p className="text-[12px] text-zinc-500 mt-1">
        {doc.fileType.toUpperCase()} · {formatFileSize(doc.fileSizeBytes)}
      </p>
      <p className="text-[12px] text-zinc-400 mt-6 max-w-md">
        Inline file rendering isn&rsquo;t wired up — use Download to fetch the original.
      </p>
    </div>
  )
}

function MetadataView({ doc, authorName, departmentName }: { doc: AppDocument; authorName?: string; departmentName?: string }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tracking #">{doc.trackingNumber ? <TrackingBadge trackingNumber={doc.trackingNumber} /> : '—'}</Field>
        <Field label="ID"><span className="font-mono text-[12px]">{doc.id}</span></Field>
        <Field label="Status"><StatusBadge status={doc.status} label={DOCUMENT_STATUS_LABEL[doc.status]} /></Field>
        <Field label="Version"><span className="font-mono text-[12px]">v{doc.version}</span></Field>
        {doc.category && <Field label="Category"><CategoryBadge value={doc.category} /></Field>}
        {doc.priority && <Field label="Priority"><PriorityBadge value={doc.priority} /></Field>}
        {doc.confidentiality && <Field label="Confidentiality"><ConfidentialityBadge value={doc.confidentiality} /></Field>}
        {departmentName && <Field label="Department">{departmentName}</Field>}
        <Field label="Created">{format(parseISO(doc.createdAt), 'MMM d, yyyy HH:mm')}</Field>
        {authorName && <Field label="Created by">{authorName}</Field>}
        {doc.deadline && <Field label="Deadline">{doc.deadline}</Field>}
        {doc.validityUntil && <Field label="Valid until">{doc.validityUntil}</Field>}
        <Field label="Size">{formatFileSize(doc.fileSizeBytes)}</Field>
        <Field label="File"><span className="font-mono text-[12px] text-zinc-500">{doc.fileName}</span></Field>
      </div>

      {doc.description && (
        <Section title="Summary">
          <p className="text-[13px] text-zinc-700 leading-relaxed">{doc.description}</p>
        </Section>
      )}

      {doc.tags && doc.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-medium">{t}</span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

interface VersionsViewProps {
  doc: AppDocument
  userMap: Record<string, { name: string }>
  currentUserId?: string
  onRevoke: () => void
  onReposition: (slotKey: string) => void
}

function VersionsView({ doc, userMap, currentUserId, onRevoke, onReposition }: VersionsViewProps) {
  if (doc.signatures.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-[13px] text-zinc-500">No signatures yet — workflow hasn&rsquo;t produced versions.</p>
      </div>
    )
  }
  const finalized = isFinalized(doc)
  return (
    <ul className="space-y-2">
      {doc.signatures.map((s, i) => {
        const active = isSignatureActive(s)
        const canRevoke = active && !finalized && !!currentUserId && s.signerId === currentUserId
        return (
          <li
            key={i}
            className={cn(
              'flex items-start gap-3 px-3 py-3 rounded-lg border',
              active ? 'border-zinc-200/60 bg-zinc-50/40' : 'border-red-200 bg-red-50/40',
            )}
          >
            <Avatar name={userMap[s.signerId]?.name ?? s.signerId} size="sm" />
            <div className="flex-1 min-w-0">
              <p className={cn('text-[13px] font-medium', active ? 'text-zinc-900' : 'text-red-700 line-through')}>
                {userMap[s.signerId]?.name ?? s.signerId}
                <span className="ml-2 text-[11px] font-mono text-zinc-400">v{i + 1}</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{format(parseISO(s.signedAt), 'MMM d, yyyy HH:mm')}</p>
              {s.comment && <p className="text-[12px] text-zinc-700 mt-1">{s.comment}</p>}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                {s.method && (
                  <span>Method: <span className="text-zinc-700">{SIGNATURE_METHOD_LABEL[s.method]}</span></span>
                )}
                {s.reason && (
                  <span>Reason: <span className="text-zinc-700">{SIGNATURE_REASON_LABEL[s.reason]}</span></span>
                )}
                {s.documentVersion !== undefined && (
                  <span>Doc version: <span className="text-zinc-700 font-mono">v{s.documentVersion}</span></span>
                )}
                {s.userAgent && (
                  <span title={s.userAgent} className="truncate max-w-[240px]">
                    Device: <span className="text-zinc-700">{summarizeUserAgent(s.userAgent)}</span>
                  </span>
                )}
              </div>
              {s.signatureImage && (
                <img src={s.signatureImage} alt={`Signature by ${userMap[s.signerId]?.name ?? s.signerId}`} className="mt-2 max-h-[60px] rounded border border-zinc-200 bg-white p-1" />
              )}
              {!active && (
                <p className="text-[12px] text-red-700 mt-1">
                  Revoked
                  {s.revokedAt && ` ${format(parseISO(s.revokedAt), 'MMM d, HH:mm')}`}
                  {s.revocationReason && ` — ${s.revocationReason}`}
                </p>
              )}
              {canRevoke && (
                <div className="mt-2 flex gap-2">
                  {s.slotKey && (
                    <Button size="sm" variant="outline" leftIcon={<Move className="w-3.5 h-3.5" />} onClick={() => onReposition(s.slotKey!)}>
                      Reposition
                    </Button>
                  )}
                  <Button size="sm" variant="outline" leftIcon={<ShieldOff className="w-3.5 h-3.5" />} onClick={onRevoke}>
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function summarizeUserAgent(ua: string): string {
  // Cheap heuristics — full UA goes in the title attribute for hover detail.
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua) && !/OPR\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
  return 'Browser'
}

function AuditTrailView({ doc, entries }: { doc: AppDocument; entries: { id: string; userName: string; action: string; module: string; detail: string; timestamp: string }[] }) {
  const matches = useMemo(() => {
    const titleNeedle = `"${doc.title}"`
    const idNeedle = doc.id
    const trackingNeedle = doc.trackingNumber
    return entries
      .filter((e) =>
        e.module === 'Documents' &&
        (e.detail.includes(titleNeedle) ||
         e.detail.includes(idNeedle) ||
         (trackingNeedle ? e.detail.includes(trackingNeedle) : false)),
      )
  }, [entries, doc.id, doc.title, doc.trackingNumber])

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-[13px] text-zinc-500">No audit entries for this document yet.</p>
      </div>
    )
  }

  return (
    <ul className="relative space-y-3 pl-6">
      <span className="absolute left-[10px] top-1 bottom-1 w-px bg-zinc-200" aria-hidden />
      {matches.map((e) => {
        const tone =
          e.action === 'approve' ? 'bg-emerald-500' :
          e.action === 'reject' ? 'bg-red-500' :
          e.action === 'create' ? 'bg-blue-500' : 'bg-zinc-400'
        return (
          <li key={e.id} className="relative">
            <span className={cn('absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white', tone)} aria-hidden />
            <p className="text-[13px] text-zinc-900 font-medium capitalize">{e.action}</p>
            <p className="text-[12px] text-zinc-600">{e.detail}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {e.userName} · {format(parseISO(e.timestamp), 'MMM d, yyyy HH:mm')}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

interface WorkflowProgressProps {
  doc: AppDocument
  userMap: Record<string, { name: string }>
  currentUserId?: string
}

function WorkflowProgress({ doc, userMap, currentUserId }: WorkflowProgressProps) {
  const signatureMap = Object.fromEntries(
    doc.signatures.filter((s) => !s.revokedAt).map((s) => [s.signerId, s]),
  )
  const idx = doc.currentApproverIndex ?? 0

  type Step = {
    label: string
    actor?: string
    statusText: string
    state: 'done' | 'current' | 'pending' | 'rejected'
    isYou?: boolean
  }

  const steps: Step[] = [
    {
      label: 'Requested',
      actor: userMap[doc.createdBy]?.name ?? doc.createdBy,
      statusText: format(parseISO(doc.createdAt), 'MMM d, HH:mm'),
      state: 'done',
    },
    ...doc.approvers.map<Step>((approverId, i) => {
      const sig = signatureMap[approverId]
      const isCurrent = i === idx && doc.status === 'in_review'
      const isRejected = doc.status === 'rejected' && doc.rejectedBy === approverId
      const actor = userMap[approverId]?.name ?? approverId
      const isYou = approverId === currentUserId
      let statusText = 'Pending'
      let state: Step['state'] = 'pending'
      if (sig) {
        statusText = format(parseISO(sig.signedAt), 'MMM d, HH:mm')
        state = 'done'
      } else if (isRejected) {
        statusText = 'Disapproved'
        state = 'rejected'
      } else if (isCurrent) {
        statusText = 'Pending'
        state = 'current'
      }
      return {
        label: `Step ${i + 2}`,
        actor: isYou && isCurrent ? `${actor} (You)` : actor,
        statusText,
        state,
        isYou: isYou && isCurrent,
      }
    }),
  ]

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Workflow Progress</p>
      <ol className="relative space-y-3">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          return (
            <li key={i} className="relative pl-9">
              {!isLast && (
                <span
                  className={cn(
                    'absolute left-[12px] top-6 bottom-[-12px] w-px',
                    step.state === 'done' ? 'bg-emerald-300' : 'bg-zinc-200',
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold',
                  step.state === 'done' && 'bg-emerald-500 text-white',
                  step.state === 'current' && 'bg-amber-500 text-white',
                  step.state === 'rejected' && 'bg-red-500 text-white',
                  step.state === 'pending' && 'bg-zinc-200 text-zinc-500',
                )}
              >
                {step.state === 'done' ? <Check className="w-3.5 h-3.5" /> :
                 step.state === 'rejected' ? <X className="w-3.5 h-3.5" /> :
                 i}
              </span>
              <p className="text-[13px] font-medium text-zinc-900">{step.label}</p>
              {step.actor && (
                <p className={cn('text-[12px]', step.isYou ? 'text-amber-700 font-medium' : 'text-zinc-600')}>
                  {step.actor}
                </p>
              )}
              <p className={cn(
                'text-[11px] mt-0.5',
                step.state === 'rejected' ? 'text-red-600' :
                step.state === 'current' ? 'text-amber-600' :
                'text-zinc-400',
              )}>
                {step.statusText}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

interface CommentsPanelProps {
  doc: AppDocument
  userMap: Record<string, { name: string }>
  comment: string
  setComment: (s: string) => void
  error: string | null
  disabled: boolean
  onSubmit: () => void
}

function CommentsPanel({ doc, userMap, comment, setComment, error, disabled, onSubmit }: CommentsPanelProps) {
  const thread = useMemo(() => {
    const items: { who: string; text: string; when: string; tone: 'sig' | 'rejection' }[] = []
    for (const s of doc.signatures) {
      if (s.comment) {
        items.push({
          who: userMap[s.signerId]?.name ?? s.signerId,
          text: s.comment,
          when: s.signedAt,
          tone: 'sig',
        })
      }
    }
    if (doc.rejectedReason && doc.rejectedBy) {
      items.push({
        who: userMap[doc.rejectedBy]?.name ?? doc.rejectedBy,
        text: doc.rejectedReason,
        when: doc.rejectedAt ?? doc.createdAt,
        tone: 'rejection',
      })
    }
    return items.sort((a, b) => a.when.localeCompare(b.when))
  }, [doc, userMap])

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-4 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Comments</p>
      {thread.length > 0 && (
        <ul className="space-y-2">
          {thread.map((c, i) => (
            <li key={i} className={cn(
              'rounded-md px-3 py-2 text-[12px]',
              c.tone === 'rejection' ? 'bg-red-50 border border-red-200' : 'bg-zinc-50 border border-zinc-100',
            )}>
              <p className={cn('font-medium', c.tone === 'rejection' ? 'text-red-700' : 'text-zinc-900')}>{c.who}</p>
              <p className={cn('mt-0.5', c.tone === 'rejection' ? 'text-red-700' : 'text-zinc-700')}>{c.text}</p>
              <p className="text-[10.5px] text-zinc-400 mt-1">{formatDistanceToNow(parseISO(c.when), { addSuffix: true })}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={disabled ? 'Comments locked — you are not the current approver.' : 'Add a comment…'}
          rows={3}
          disabled={disabled}
          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !comment.trim()}
          title="Approve the document with this comment attached"
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-fg text-[13px] font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          Sign &amp; Send
        </button>
      </div>
      {error && <p className="text-[11.5px] text-red-600">{error}</p>}
    </div>
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


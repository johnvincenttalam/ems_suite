import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  CheckCircle2,
  Download,
  Eye,
  GitBranch,
  History,
  Lock,
  Route as RouteIcon,
  Shield,
  ShieldOff,
  TriangleAlert,
  X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import {
  DOCUMENT_STATUS_LABEL,
  RECEIPT_MODE_LABEL,
  ROUTING_PURPOSE_LABEL,
  type AppDocument,
} from '@/features/documents/types'
import { isModuleManagerOrAbove } from '@/features/auth'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { cn } from '@/shared/utils/cn'
import { ISSUE_LABEL, verifySignatures } from '@/features/documents/lib/verify-signatures'
import { isFinalized, isSignatureActive } from '@/features/documents/types'
import { ChecklistPanel } from '@/shared/checklists'
import { FileIcon, formatFileSize } from './file-icon'
import { CategoryBadge, ConfidentialityBadge, PriorityBadge, TrackingBadge } from './document-meta'
import { WorkflowChain } from './workflow-chain'
import { RouteModal } from './route-modal'
import { RevokeSignatureModal } from './revoke-signature-modal'

type DrawerTab = 'overview' | 'workflow' | 'routing' | 'access' | 'checklist' | 'archive'

interface DocumentDetailDrawerProps {
  document: AppDocument | null
  onClose: () => void
  /** Optional — when provided, the Related documents section switches the
   * drawer to the clicked doc instead of just opening it. */
  onSelectDocument?: (doc: AppDocument) => void
}

export function DocumentDetailDrawer({ document, onClose, onSelectDocument }: DocumentDetailDrawerProps) {
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()
  const { data: allDocuments = [] } = useDocuments()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<DrawerTab>('overview')

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const dept = document?.departmentId ? departments.find((d) => d.id === document.departmentId) : null

  const [routeTarget, setRouteTarget] = useState<AppDocument | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AppDocument | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)

  const accessMutation = useMutation({
    mutationFn: ({ id, activity }: { id: string; activity: 'view' | 'download' }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.recordAccess(id, user.id, activity)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
    onError: (err) => toast.error('Access record failed', { description: err instanceof Error ? err.message : 'Unknown' }),
  })

  const completeRoutingMutation = useMutation({
    mutationFn: ({ id, routingId }: { id: string; routingId: string }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.completeRouting(id, routingId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success('Routing marked complete')
    },
    onError: (err) => toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown' }),
  })

  useEffect(() => {
    if (document && user) {
      accessMutation.mutate({ id: document.id, activity: 'view' })
      setTab('overview')
      setVerifyOpen(false)
    }
    // accessMutation is stable enough — we deliberately fire on document change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (document) {
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [document, onClose])

  // Access log is sensitive — surface the audit trail only to the doc's
  // author and to SDMS managers/admins. Other members see a placeholder so
  // they know access IS being recorded; they just can't view it.
  const canSeeAccessLog = useMemo(() => {
    if (!document || !user) return false
    return document.createdBy === user.id || isModuleManagerOrAbove(user, 'sdms')
  }, [document, user])

  // Suggest documents sharing a category + at least one tag (or, lacking
  // tags, the same department). Capped at 5; excludes the current doc.
  // Cheap derivation — no schema, just pattern matching against the cache.
  const related = useMemo<AppDocument[]>(() => {
    if (!document) return []
    const tagSet = new Set(document.tags ?? [])
    const score = (other: AppDocument): number => {
      if (other.id === document.id) return -1
      if (other.category && other.category === document.category) {
        const sharedTags = (other.tags ?? []).filter((t) => tagSet.has(t)).length
        if (sharedTags > 0) return 10 + sharedTags
        if (other.departmentId && other.departmentId === document.departmentId) return 5
        return 3
      }
      return -1
    }
    return allDocuments
      .map((d) => ({ d, s: score(d) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || b.d.createdAt.localeCompare(a.d.createdAt))
      .slice(0, 5)
      .map((x) => x.d)
  }, [document, allDocuments])

  const tabs: { label: string; value: DrawerTab; count?: number }[] = useMemo(() => {
    if (!document) return []
    return [
      { label: 'Overview', value: 'overview' },
      { label: 'Workflow', value: 'workflow', count: document.signatures.length },
      { label: 'Routing', value: 'routing', count: document.routings?.length ?? 0 },
      { label: 'Access Log', value: 'access', count: canSeeAccessLog ? (document.accessLog?.length ?? 0) : undefined },
      ...(document.checklistId ? [{ label: 'Checklist', value: 'checklist' as const }] : []),
      { label: 'Archive', value: 'archive' },
    ]
  }, [document, canSeeAccessLog])

  return (
    <AnimatePresence>
      {document && (
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
              <div className="flex items-start gap-3 min-w-0">
                <FileIcon type={document.fileType} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <TrackingBadge trackingNumber={document.trackingNumber} />
                    <span className="font-mono text-[11px] text-zinc-400">{document.id}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-[11px] text-zinc-400">v{document.version}</span>
                  </div>
                  <h2 className="text-base font-semibold text-zinc-900 truncate">{document.title}</h2>
                  <p className="text-[11px] text-zinc-400 truncate font-mono">{document.fileName}</p>
                </div>
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
                    <Field label="Status"><StatusBadge status={document.status} label={DOCUMENT_STATUS_LABEL[document.status]} /></Field>
                    <Field label="Size">{formatFileSize(document.fileSizeBytes)}</Field>
                    {document.category && <Field label="Category"><CategoryBadge value={document.category} /></Field>}
                    {document.priority && <Field label="Priority"><PriorityBadge value={document.priority} /></Field>}
                    {document.confidentiality && <Field label="Confidentiality"><ConfidentialityBadge value={document.confidentiality} /></Field>}
                    {dept && <Field label="Owner Dept">{dept.name}</Field>}
                    <Field label="Created">{format(parseISO(document.createdAt), 'MMM dd, yyyy HH:mm')}</Field>
                    <Field label="Created by">{userMap[document.createdBy]?.name ?? document.createdBy}</Field>
                    {document.deadline && <Field label="Deadline">{document.deadline}</Field>}
                    {document.validityUntil && <Field label="Valid until">{document.validityUntil}</Field>}
                  </div>

                  {document.description && (
                    <Section title="Summary">
                      <p className="text-[13px] text-zinc-700 leading-relaxed">{document.description}</p>
                    </Section>
                  )}

                  {document.tags && document.tags.length > 0 && (
                    <Section title="Tags">
                      <div className="flex flex-wrap gap-1.5">
                        {document.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-medium">{t}</span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {related.length > 0 && (
                    <Section title="Related documents">
                      <ul className="space-y-1.5">
                        {related.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => onSelectDocument?.(r)}
                              disabled={!onSelectDocument}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-zinc-200/60 hover:border-zinc-300 transition-colors text-left disabled:cursor-default disabled:hover:border-zinc-200/60"
                            >
                              <FileIcon type={r.fileType} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[12.5px] font-medium text-zinc-900 truncate">{r.title}</p>
                                <p className="text-[11px] text-zinc-400 truncate">
                                  {r.trackingNumber ?? r.id}
                                  {r.tags && r.tags.length > 0 && ` · ${r.tags.slice(0, 2).join(', ')}`}
                                </p>
                              </div>
                              <StatusBadge status={r.status} label={DOCUMENT_STATUS_LABEL[r.status]} size="sm" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {document.receipt && (
                    <Section title="Receipt">
                      <DefList rows={[
                        ['Mode', RECEIPT_MODE_LABEL[document.receipt.mode]],
                        ['Sender / source', document.receipt.senderSource],
                        document.receipt.recipientDept ? ['Recipient dept', departments.find((d) => d.id === document.receipt!.recipientDept)?.name ?? document.receipt.recipientDept] : null,
                        ['Received', format(parseISO(document.receipt.receivedAt), 'MMM dd, yyyy HH:mm')],
                        ['Logged by', userMap[document.receipt.receivedBy]?.name ?? document.receipt.receivedBy],
                        document.receipt.pageCount ? ['Pages', String(document.receipt.pageCount)] : null,
                        document.receipt.attachments ? ['Attachments', String(document.receipt.attachments)] : null,
                        document.receipt.senderRefNumber ? ['Sender ref', document.receipt.senderRefNumber] : null,
                      ].filter(Boolean) as [string, string][]} />
                    </Section>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      leftIcon={<Download className="w-4 h-4" />}
                      onClick={() => {
                        accessMutation.mutate({ id: document.id, activity: 'download' })
                        toast.success(`Mock download — recorded in access log`)
                      }}
                    >
                      Download
                    </Button>
                  </div>
                </>
              )}

              {tab === 'workflow' && (
                <>
                  {isFinalized(document) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Lock className="w-4 h-4 text-amber-700 mt-0.5" />
                      <div className="text-[12px] text-amber-900">
                        <p className="font-semibold">Document is finalized — signatures are locked.</p>
                        <p className="mt-0.5">
                          Finalized by {userMap[document.finalizedBy ?? '']?.name ?? '—'} on {format(parseISO(document.finalizedAt!), 'MMM dd, yyyy HH:mm')}.
                          {document.validityUntil && ` Valid until ${document.validityUntil}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  <Section title="Approval Chain">
                    {document.approvers.length === 0 ? (
                      <EmptyMessage icon={GitBranch} message="No workflow started yet — classify and start a workflow from the Inbox or Documents page." />
                    ) : (
                      <WorkflowChain document={document} userMap={userMap} />
                    )}
                  </Section>

                  {document.signatures.length > 0 && (
                    <Section title={`Signatures (${document.signatures.length})`}>
                      <ul className="space-y-3">
                        {document.signatures.map((s, i) => {
                          const active = isSignatureActive(s)
                          const canRevoke = active && s.signerId === user?.id && !isFinalized(document)
                          return (
                            <li key={i} className={cn(
                              'px-3 py-2 rounded-md border',
                              active ? 'bg-zinc-50/40 border-zinc-200/60' : 'bg-red-50 border-red-200',
                            )}>
                              <div className="flex items-center gap-2">
                                <Avatar name={userMap[s.signerId]?.name ?? s.signerId} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    'text-[13px] font-medium',
                                    active ? 'text-zinc-900' : 'text-red-700 line-through',
                                  )}>
                                    {userMap[s.signerId]?.name ?? s.signerId}
                                  </p>
                                  <p className="text-[11px] text-zinc-400">{format(parseISO(s.signedAt), 'MMM dd, yyyy HH:mm')}</p>
                                </div>
                                {active ? (
                                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <ShieldOff className="w-3.5 h-3.5 text-red-500" />
                                )}
                              </div>
                              {s.comment && (
                                <p className={cn('text-[13px] mt-2', active ? 'text-zinc-700' : 'text-zinc-500 line-through')}>{s.comment}</p>
                              )}
                              {s.signatureImage && (
                                <img src={s.signatureImage} alt={`Signature by ${userMap[s.signerId]?.name ?? s.signerId}`} className="surface-paper mt-2 max-h-[60px] rounded border border-zinc-200 p-1" />
                              )}
                              {!active && (
                                <p className="text-[12px] text-red-700 mt-2">
                                  <span className="font-semibold">Revoked</span>
                                  {s.revokedAt && ` ${format(parseISO(s.revokedAt), 'MMM dd, HH:mm')}`}
                                  {s.revocationReason && ` — ${s.revocationReason}`}
                                </p>
                              )}
                              {canRevoke && (
                                <div className="mt-2">
                                  <Button size="sm" variant="outline" leftIcon={<ShieldOff className="w-3.5 h-3.5" />} onClick={() => setRevokeTarget(document)}>
                                    Revoke
                                  </Button>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </Section>
                  )}

                  {document.rejectedReason && (
                    <Section title="Disapproval">
                      <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200">
                        <p className="text-[11px] uppercase tracking-wider text-red-600 font-semibold">
                          Disapproved by {userMap[document.rejectedBy ?? '']?.name ?? '—'}
                          {document.rejectedAt && ` · ${format(parseISO(document.rejectedAt), 'MMM dd, HH:mm')}`}
                        </p>
                        <p className="text-[13px] text-red-700 mt-0.5">{document.rejectedReason}</p>
                      </div>
                    </Section>
                  )}

                  {document.signatures.length > 0 && (
                    <Section title="Verification">
                      {!verifyOpen ? (
                        <Button variant="outline" leftIcon={<Shield className="w-4 h-4" />} onClick={() => setVerifyOpen(true)}>
                          Verify Signature Chain
                        </Button>
                      ) : (
                        <VerificationPanel document={document} userMap={userMap} />
                      )}
                    </Section>
                  )}
                </>
              )}

              {tab === 'routing' && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-zinc-500">
                      {(document.routings?.length ?? 0)} routing {(document.routings?.length ?? 0) === 1 ? 'entry' : 'entries'}
                    </p>
                    <Button size="sm" leftIcon={<RouteIcon className="w-3.5 h-3.5" />} onClick={() => setRouteTarget(document)}>
                      New Routing
                    </Button>
                  </div>
                  {(document.routings?.length ?? 0) === 0 ? (
                    <EmptyMessage icon={RouteIcon} message="No routing entries yet. Click “New Routing” to forward this document." />
                  ) : (
                    <ul className="space-y-3">
                      {document.routings!.map((r) => {
                        const isMine = r.recipientId === user?.id
                        const canComplete = isMine && r.status !== 'completed'
                        return (
                          <li key={r.id} className="px-3 py-3 rounded-lg bg-white border border-zinc-200/60">
                            <div className="flex items-start gap-2">
                              <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                                r.status === 'completed' ? 'bg-emerald-500' :
                                r.status === 'in_review' ? 'bg-blue-500' : 'bg-amber-500',
                              )} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[12px] font-medium text-zinc-900">
                                    {userMap[r.senderId]?.name ?? r.senderId} <span className="text-zinc-400">→</span> {userMap[r.recipientId]?.name ?? r.recipientId}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600">
                                    {ROUTING_PURPOSE_LABEL[r.purpose]}
                                  </span>
                                  <StatusBadge status={r.status} size="sm" />
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1">
                                  Routed {format(parseISO(r.routedAt), 'MMM dd, HH:mm')}
                                  {r.deadline && <> · Deadline {r.deadline}</>}
                                  {r.completedAt && <> · Completed {format(parseISO(r.completedAt), 'MMM dd, HH:mm')}</>}
                                </p>
                                {r.notes && <p className="text-[12px] text-zinc-700 mt-1">{r.notes}</p>}
                                {canComplete && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      loading={completeRoutingMutation.isPending && completeRoutingMutation.variables?.routingId === r.id}
                                      onClick={() => completeRoutingMutation.mutate({ id: document.id, routingId: r.id })}
                                    >
                                      Mark complete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              )}

              {tab === 'access' && !canSeeAccessLog && (
                <EmptyMessage
                  icon={Shield}
                  message="Access activity is recorded but visible only to the document's author and SDMS managers."
                />
              )}

              {tab === 'access' && canSeeAccessLog && (
                <>
                  {(document.accessLog?.length ?? 0) === 0 ? (
                    <EmptyMessage icon={Eye} message="No access activity recorded yet." />
                  ) : (
                    <ul className="space-y-2">
                      {document.accessLog!.slice().reverse().map((a) => (
                        <li key={a.id} className="flex items-start gap-3 px-3 py-2 rounded-md bg-zinc-50/40 border border-zinc-200/60">
                          <Avatar name={userMap[a.userId]?.name ?? a.userId} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px]">
                              <span className="font-medium text-zinc-900">{userMap[a.userId]?.name ?? a.userId}</span>
                              <span className="text-zinc-400"> · {a.activity}</span>
                            </p>
                            <p className="text-[11px] text-zinc-400">{format(parseISO(a.timestamp), 'MMM dd, yyyy HH:mm:ss')}</p>
                            {a.purpose && <p className="text-[12px] text-zinc-600 mt-0.5">{a.purpose}</p>}
                          </div>
                          {a.activity === 'download' && <Download className="w-3.5 h-3.5 text-zinc-400" />}
                          {a.activity === 'view' && <Eye className="w-3.5 h-3.5 text-zinc-400" />}
                          {a.activity === 'edit' && <History className="w-3.5 h-3.5 text-zinc-400" />}
                          {a.activity === 'print' && <Lock className="w-3.5 h-3.5 text-zinc-400" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {tab === 'checklist' && document.checklistId && (
                <ChecklistPanel
                  templateId={document.checklistId}
                  assignedToUserId={document.approvers[document.currentApproverIndex ?? 0]}
                  readOnly={document.status === 'approved' || document.status === 'archived'}
                />
              )}

              {tab === 'archive' && (
                <>
                  {document.status !== 'archived' ? (
                    <EmptyMessage icon={Archive} message="Not archived. Approved documents can be archived from the Documents page." />
                  ) : document.archiveInfo ? (
                    <Section title="Archive Details">
                      <DefList rows={[
                        ['Storage location', document.archiveInfo.storageLocation],
                        ['Retention', `${document.archiveInfo.retentionMonths} months`],
                        document.archiveInfo.disposalDate ? ['Disposal date', document.archiveInfo.disposalDate] : null,
                        document.archiveInfo.backupLocation ? ['Backup', document.archiveInfo.backupLocation] : null,
                        document.archivedAt ? ['Archived', format(parseISO(document.archivedAt), 'MMM dd, yyyy HH:mm')] : null,
                      ].filter(Boolean) as [string, string][]} />
                    </Section>
                  ) : (
                    <p className="text-[13px] text-zinc-500">Archived without retention metadata.</p>
                  )}
                </>
              )}
            </div>
          </motion.aside>
          <RouteModal document={routeTarget} onClose={() => setRouteTarget(null)} />
          <RevokeSignatureModal document={revokeTarget} onClose={() => setRevokeTarget(null)} />
        </div>
      )}
    </AnimatePresence>
  )
}

function VerificationPanel({ document, userMap }: { document: AppDocument; userMap: Record<string, { name: string }> }) {
  const result = verifySignatures(document)
  return (
    <div className="space-y-3">
      <div className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        result.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
      )}>
        {result.ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5" />
        ) : (
          <TriangleAlert className="w-4 h-4 text-red-700 mt-0.5" />
        )}
        <div className="text-[12px]">
          <p className={cn('font-semibold', result.ok ? 'text-emerald-900' : 'text-red-900')}>
            {result.ok ? 'Signature chain verified' : 'Verification found issues'}
          </p>
          <p className={cn('mt-0.5', result.ok ? 'text-emerald-700' : 'text-red-700')}>
            {result.ok
              ? 'Every active signature passes structural checks (signer, ordering, finalization).'
              : 'See per-signature details below. In a real system, missing PKI cert validation would also be flagged here.'}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {result.signatures.map((s) => (
          <li key={s.index} className={cn(
            'px-3 py-2 rounded-md border text-[12px]',
            s.ok ? 'bg-zinc-50/40 border-zinc-200/60' : 'bg-red-50 border-red-200',
          )}>
            <div className="flex items-center gap-2">
              {s.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <TriangleAlert className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              )}
              <span className="font-medium text-zinc-900">{userMap[s.signature.signerId]?.name ?? s.signature.signerId}</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-500">{s.ok ? 'verified' : 'failed'}</span>
            </div>
            {!s.ok && (
              <ul className="mt-1.5 ml-5 list-disc space-y-0.5 text-red-700">
                {s.issues.map((i) => <li key={i}>{ISSUE_LABEL[i]}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
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

function DefList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 gap-x-4 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-400">{k}</dt>
          <dd className="text-zinc-700">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function EmptyMessage({ icon: Icon, message }: { icon: typeof Eye; message: string }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
      <p className="text-[13px] text-zinc-500">{message}</p>
    </div>
  )
}


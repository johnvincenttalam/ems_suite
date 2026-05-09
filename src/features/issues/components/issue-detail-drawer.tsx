import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  X,
  ExternalLink,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Send,
  CheckCircle2,
  Eye,
  Loader2,
  Archive,
  Wrench,
} from 'lucide-react'
import { useUsers } from '@/features/users'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import { useAuthStore } from '@/features/auth'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import type { Issue, IssueStatus } from '@/features/issues/types'
import { IssueSeverityBadge } from '@/features/issues/components/issue-severity-badge'
import { IssueStatusBadge } from '@/features/issues/components/issue-status-badge'
import {
  useAddIssueComment,
  useSetIssueStatus,
} from '@/features/issues/hooks/use-issues'
import {
  formatIssueTarget,
  targetModulePath,
} from '@/features/issues/lib/format-target'
import { CreateWorkOrderFromIssueModal } from '@/features/issues/components/create-wo-from-issue-modal'
import { cn } from '@/shared/utils/cn'

interface IssueDetailDrawerProps {
  open: boolean
  issue: Issue | null
  onClose: () => void
}

export function IssueDetailDrawer({ open, issue, onClose }: IssueDetailDrawerProps) {
  const { data: users = [] } = useUsers()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()
  const { user } = useAuthStore()
  const setStatus = useSetIssueStatus()
  const addComment = useAddIssueComment()

  const [commentBody, setCommentBody] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [escalating, setEscalating] = useState(false)

  useEffect(() => {
    if (!open) {
      setCommentBody('')
      setResolving(false)
      setResolutionNotes('')
      setEscalating(false)
    }
  }, [open, issue?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const reporter = useMemo(
    () => users.find((u) => u.id === issue?.reportedByUserId),
    [users, issue?.reportedByUserId],
  )
  const resolver = useMemo(
    () => users.find((u) => u.id === issue?.resolvedByUserId),
    [users, issue?.resolvedByUserId],
  )

  if (!issue) return null

  const targetInfo = formatIssueTarget(issue.target, { vehicles, assets })

  const onChangeStatus = async (next: IssueStatus, notes?: string) => {
    if (!user) return
    try {
      await setStatus.mutateAsync({
        id: issue.id,
        status: next,
        actorUserId: user.id,
        resolutionNotes: notes,
      })
      toast.success(`Issue ${next === 'in_progress' ? 'started' : next}`)
      setResolving(false)
      setResolutionNotes('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status')
    }
  }

  const onResolve = () => {
    if (issue.severity === 'critical' && !resolutionNotes.trim()) {
      toast.error('Resolution notes are required for critical issues')
      return
    }
    onChangeStatus('resolved', resolutionNotes.trim() || undefined)
  }

  const onAddComment = async () => {
    if (!user || !commentBody.trim()) return
    try {
      await addComment.mutateAsync({
        id: issue.id,
        authorUserId: user.id,
        body: commentBody,
      })
      setCommentBody('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add comment')
    }
  }

  return (
    <AnimatePresence>
      {open && (
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
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-mono text-[11px] text-zinc-400">{issue.id}</span>
                  <IssueSeverityBadge severity={issue.severity} size="sm" />
                  <IssueStatusBadge status={issue.status} size="sm" />
                </div>
                <h2 className="text-base font-semibold text-zinc-900 leading-snug">{issue.title}</h2>
                <p className="text-[12px] text-zinc-500 mt-1">
                  Reported by {reporter?.name ?? issue.reportedByUserId} ·{' '}
                  {formatDistanceToNow(parseISO(issue.reportedAt), { addSuffix: true })}
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

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <Section title="Affected">
                <Link
                  to={targetModulePath(issue.target)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200/60 hover:border-zinc-300 transition-colors"
                >
                  <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-medium">
                    {issue.target.kind}
                  </span>
                  <span className="text-[13px] font-medium text-zinc-900">{targetInfo.label}</span>
                  {targetInfo.sublabel && (
                    <span className="text-[12px] text-zinc-500">· {targetInfo.sublabel}</span>
                  )}
                  <ExternalLink className="w-3 h-3 text-zinc-400 ml-auto" />
                </Link>
              </Section>

              {issue.description && (
                <Section title="Description">
                  <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {issue.description}
                  </p>
                </Section>
              )}

              {issue.source === 'inspection' && issue.sourceChecklistRunId && (
                <Section title="Source">
                  <div className="rounded-lg bg-zinc-50/40 border border-zinc-200/60 px-3 py-2.5 flex items-start gap-2">
                    <ClipboardList className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <div className="text-[12.5px] text-zinc-700">
                      Auto-created from inspection run{' '}
                      <span className="font-mono text-zinc-500">{issue.sourceChecklistRunId}</span>
                      {issue.sourceChecklistItemKey && (
                        <>
                          {' · failed item '}
                          <span className="font-mono text-zinc-500">{issue.sourceChecklistItemKey}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              {issue.workOrderId && (
                <Section title="Linked Work Order">
                  <Link
                    to={`/module/maintenance/work-orders?wo=${issue.workOrderId}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/40 border border-blue-200/60 hover:border-blue-300 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-mono text-[12px] text-blue-700">{issue.workOrderId}</span>
                    <span className="text-[11.5px] text-zinc-500 ml-1">Open in Maintenance</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400 ml-auto" />
                  </Link>
                </Section>
              )}

              {(issue.status === 'resolved' || issue.status === 'closed') && (
                <Section title="Resolution">
                  <div className="rounded-lg bg-emerald-50/40 border border-emerald-200/60 px-4 py-3 space-y-1">
                    <p className="text-[12px] text-emerald-700 font-medium">
                      {issue.status === 'closed' ? 'Closed' : 'Resolved'}
                      {resolver && ` by ${resolver.name}`}
                      {issue.resolvedAt && ` · ${format(parseISO(issue.resolvedAt), 'MMM d, yyyy HH:mm')}`}
                    </p>
                    {issue.resolutionNotes && (
                      <p className="text-[13px] text-zinc-700 whitespace-pre-wrap">
                        {issue.resolutionNotes}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              <Section
                title={`Comments (${issue.comments.length})`}
                icon={MessageSquare}
              >
                {issue.comments.length === 0 ? (
                  <p className="text-[12.5px] text-zinc-400 italic">No comments yet</p>
                ) : (
                  <ul className="space-y-3">
                    {issue.comments.map((c) => {
                      const author = users.find((u) => u.id === c.authorUserId)
                      return (
                        <li key={c.id} className="flex items-start gap-3">
                          <Avatar name={author?.name ?? '?'} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[12.5px] font-medium text-zinc-900">
                                {author?.name ?? c.authorUserId}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-[13px] text-zinc-700 whitespace-pre-wrap mt-0.5">{c.body}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {issue.status !== 'closed' && (
                  <div className="mt-4">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      rows={2}
                      placeholder="Add a comment…"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                        disabled={!commentBody.trim() || addComment.isPending}
                        onClick={onAddComment}
                      >
                        {addComment.isPending ? 'Posting…' : 'Post comment'}
                      </Button>
                    </div>
                  </div>
                )}
              </Section>
            </div>

            <StatusActionBar
              issue={issue}
              resolving={resolving}
              setResolving={setResolving}
              resolutionNotes={resolutionNotes}
              setResolutionNotes={setResolutionNotes}
              onChangeStatus={onChangeStatus}
              onResolve={onResolve}
              onEscalate={() => setEscalating(true)}
              pending={setStatus.isPending}
            />
          </motion.aside>

          <CreateWorkOrderFromIssueModal
            open={escalating}
            issue={issue}
            onClose={() => setEscalating(false)}
          />
        </div>
      )}
    </AnimatePresence>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: typeof MessageSquare
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400" />}
        <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

interface StatusActionBarProps {
  issue: Issue
  resolving: boolean
  setResolving: (v: boolean) => void
  resolutionNotes: string
  setResolutionNotes: (v: string) => void
  onChangeStatus: (next: IssueStatus) => void
  onResolve: () => void
  onEscalate: () => void
  pending: boolean
}

function StatusActionBar({
  issue,
  resolving,
  setResolving,
  resolutionNotes,
  setResolutionNotes,
  onChangeStatus,
  onResolve,
  onEscalate,
  pending,
}: StatusActionBarProps) {
  if (issue.status === 'closed') return null

  if (resolving) {
    return (
      <div className="border-t border-zinc-200/60 bg-zinc-50/40 px-6 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-[13px] font-medium text-zinc-900">Resolve issue</span>
        </div>
        {issue.severity === 'critical' && (
          <p className="text-[12px] text-amber-700 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Resolution notes are required for critical issues
          </p>
        )}
        <Textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          rows={2}
          placeholder={
            issue.severity === 'critical'
              ? 'What was done? (required)'
              : 'Optional notes on what was done'
          }
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={() => setResolving(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={onResolve} disabled={pending} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            {pending ? 'Resolving…' : 'Resolve'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-zinc-200/60 bg-zinc-50/40 px-6 py-4 flex flex-wrap gap-2 items-center">
      <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mr-1">
        Actions
      </span>

      {(issue.status === 'open' || issue.status === 'monitor') && (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Loader2 className="w-3.5 h-3.5" />}
          onClick={() => onChangeStatus('in_progress')}
          disabled={pending}
        >
          Start work
        </Button>
      )}

      {issue.status === 'open' && (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => onChangeStatus('monitor')}
          disabled={pending}
        >
          Move to monitor
        </Button>
      )}

      {(issue.status === 'open' || issue.status === 'in_progress' || issue.status === 'monitor') && (
        <Button
          size="sm"
          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          onClick={() => setResolving(true)}
          disabled={pending}
        >
          Resolve
        </Button>
      )}

      {issue.status === 'resolved' && (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Archive className="w-3.5 h-3.5" />}
          onClick={() => onChangeStatus('closed')}
          disabled={pending}
        >
          Close
        </Button>
      )}

      {(issue.status === 'open' || issue.status === 'in_progress' || issue.status === 'monitor') &&
        !issue.workOrderId && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Wrench className="w-3.5 h-3.5" />}
            onClick={onEscalate}
            disabled={pending}
            className="ml-auto"
          >
            Create Work Order
          </Button>
        )}

      {issue.workOrderId && (
        <span
          className={cn(
            'inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-md',
            'bg-blue-50 text-blue-700 text-[11px] font-medium',
          )}
        >
          <Wrench className="w-3 h-3" />
          Linked to {issue.workOrderId}
        </span>
      )}
    </div>
  )
}

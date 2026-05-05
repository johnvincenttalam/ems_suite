import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardList, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useEntityChecklist } from '@/shared/checklists/hooks/use-entity-checklist'
import { useUsers } from '@/features/users'
import type { AssignmentStatus } from '@/features/checklists'
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'
import { cn } from '@/shared/utils/cn'

interface ChecklistPanelProps {
  /** Template ID to render (e.g., wo.checklistId). */
  templateId: string | undefined
  /** Optional assignee — surfaces their last attempt as the starting state. */
  assignedToUserId?: string
  /** Custom empty-state message when the consumer entity has no checklist set. */
  emptyMessage?: string
  /** Read-only mode (e.g., for already-completed work orders). */
  readOnly?: boolean
}

const statusStyles: Record<AssignmentStatus, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'bg-zinc-100',    text: 'text-zinc-600',    label: 'Pending' },
  in_progress: { bg: 'bg-blue-50',     text: 'text-blue-700',    label: 'In Progress' },
  completed:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Completed' },
}

/**
 * Reusable inspection surface for any owning module that links to a checklist
 * template (work order, trip, asset, document). Shows the template's items as
 * checkboxes, seeds from the latest assignment if one matches, and tracks
 * progress + per-item notes locally.
 *
 * No persistence in this template — wiring to a real backend is a single
 * mutation when ChecklistAssignment links to the owning entity.
 */
export function ChecklistPanel({
  templateId,
  assignedToUserId,
  emptyMessage,
  readOnly = false,
}: ChecklistPanelProps) {
  const { isLoading, template, latestAssignment } = useEntityChecklist(templateId, assignedToUserId)
  const { data: users = [] } = useUsers()

  const seedChecks = useMemo(() => {
    const map: Record<string, boolean> = {}
    if (!latestAssignment) return map
    for (const r of latestAssignment.results) map[r.itemId] = r.completed
    return map
  }, [latestAssignment])

  const seedNotes = useMemo(() => {
    const map: Record<string, string> = {}
    if (!latestAssignment) return map
    for (const r of latestAssignment.results) if (r.notes) map[r.itemId] = r.notes
    return map
  }, [latestAssignment])

  const [checks, setChecks] = useState<Record<string, boolean>>(seedChecks)
  const [notes, setNotes] = useState<Record<string, string>>(seedNotes)
  const [openNote, setOpenNote] = useState<string | null>(null)

  useEffect(() => {
    setChecks(seedChecks)
    setNotes(seedNotes)
  }, [seedChecks, seedNotes])

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (!templateId) {
    return (
      <div className="py-10 px-6 text-center">
        <ClipboardList className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-[14px] font-medium text-zinc-700">No checklist attached</p>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          {emptyMessage ?? 'Attach a checklist template to require inspection sign-off.'}
        </p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="py-10 px-6 text-center">
        <AlertCircle className="w-8 h-8 text-amber-300 mx-auto mb-3" />
        <p className="text-[14px] font-medium text-zinc-700">Checklist template not found</p>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          The referenced template <span className="font-mono">{templateId}</span> no longer exists.
        </p>
      </div>
    )
  }

  const completedCount = template.items.filter((i) => checks[i.id]).length
  const requiredItems = template.items.filter((i) => i.required)
  const requiredCompleted = requiredItems.filter((i) => checks[i.id]).length
  const allRequiredDone = requiredCompleted === requiredItems.length
  const completion = Math.round((completedCount / template.items.length) * 100)

  const completedByUser = latestAssignment?.completedBy
    ? users.find((u) => u.id === latestAssignment.completedBy)
    : undefined

  const status: AssignmentStatus = readOnly && latestAssignment?.status === 'completed'
    ? 'completed'
    : completedCount === 0
    ? 'pending'
    : completedCount === template.items.length
    ? 'completed'
    : 'in_progress'

  const statusCfg = statusStyles[status]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <h3 className="text-[14px] font-semibold text-zinc-900 truncate">{template.name}</h3>
          </div>
          {template.description && (
            <p className="text-[12.5px] text-zinc-500 mt-1">{template.description}</p>
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wide',
            statusCfg.bg,
            statusCfg.text,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-semibold">Progress</span>
          <span className="text-[13px] tabular-nums text-zinc-700 font-medium">
            {completedCount} <span className="text-zinc-400">/</span> {template.items.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              completion === 100 ? 'bg-emerald-500' : 'bg-blue-500',
            )}
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-2 text-[11.5px] text-zinc-500">
          <span>
            <span className="tabular-nums font-medium">{requiredCompleted}/{requiredItems.length}</span> required
          </span>
          {!allRequiredDone && (
            <span className="text-amber-600">Required items incomplete</span>
          )}
        </div>
      </div>

      {/* Items */}
      <ul className="rounded-lg border border-zinc-200/60 overflow-hidden">
        {template.items.map((item, i) => {
          const checked = !!checks[item.id]
          const note = notes[item.id]
          const isNoteOpen = openNote === item.id
          return (
            <li
              key={item.id}
              className={cn(
                'px-4 py-3',
                i !== template.items.length - 1 && 'border-b border-zinc-100/60',
                checked && 'bg-emerald-50/30',
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setChecks((c) => ({ ...c, [item.id]: !checked }))}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                    checked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-white border-zinc-300 hover:border-zinc-500',
                    readOnly && 'opacity-60 cursor-not-allowed',
                  )}
                  aria-checked={checked}
                  role="checkbox"
                  aria-label={item.label}
                >
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        'text-[13px] text-zinc-800',
                        checked && 'text-zinc-500',
                      )}
                    >
                      {item.label}
                    </p>
                    {item.required && (
                      <span className="text-[10px] uppercase tracking-wider text-red-600 font-semibold">
                        Required
                      </span>
                    )}
                  </div>
                  {note && !isNoteOpen && (
                    <p className="text-[12px] text-zinc-500 mt-1 italic">"{note}"</p>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setOpenNote(isNoteOpen ? null : item.id)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-700 mt-1"
                    >
                      {note ? 'Edit note' : isNoteOpen ? 'Cancel' : 'Add note'}
                    </button>
                  )}
                  {isNoteOpen && !readOnly && (
                    <Textarea
                      value={notes[item.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                      onBlur={() => setOpenNote(null)}
                      rows={2}
                      placeholder="Note (e.g. observation, issue, follow-up)"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Footer / completion record */}
      {latestAssignment?.status === 'completed' && completedByUser && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50/50 border border-emerald-200/60">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="text-[12.5px] text-emerald-800">
            Completed by <span className="font-medium">{completedByUser.name}</span>
            {' · '}
            {latestAssignment.completedAt && format(parseISO(latestAssignment.completedAt), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
      )}

      {!readOnly && (
        <p className="text-[11.5px] text-zinc-400 text-center">
          Changes here aren't persisted in this template — wire <span className="font-mono">checklistsApi.complete()</span>{' '}
          to a backend when integrating real data.
        </p>
      )}
    </div>
  )
}

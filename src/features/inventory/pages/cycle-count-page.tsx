import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ClipboardList, CheckCircle2, ChevronRight, Lock, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  useInventoryItems,
  useCycleCountSessions,
  cycleCountApi,
} from '@/features/inventory'
import type { CycleCountSession, CycleCountStatus } from '@/features/inventory'
import { useWarehouses } from '@/features/warehouses'
import { useCategories } from '@/features/categories'
import { useAuthStore } from '@/features/auth'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { PageHeader } from '@/shared/ui/page-header'
import { Spinner } from '@/shared/ui/spinner'
import { cn } from '@/shared/utils/cn'

const scheduleSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  categoryId: z.string().optional(),
  scheduledDate: z.string().min(1, 'Schedule date is required'),
})

type ScheduleForm = z.infer<typeof scheduleSchema>

const STATUS_PILL: Record<CycleCountStatus, string> = {
  scheduled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<CycleCountStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'Counting',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function CycleCountPage() {
  const { data: sessions = [], isLoading } = useCycleCountSessions()
  const { data: warehouses = [] } = useWarehouses()
  const { data: categories = [] } = useCategories()
  const { data: items = [] } = useInventoryItems()
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // Default-select the first in-progress session for fastest demo entry.
    return null
  })
  const [finalizeTarget, setFinalizeTarget] = useState<CycleCountSession | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CycleCountSession | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const selected = useMemo(() => {
    if (selectedId) return sessions.find((s) => s.id === selectedId) ?? null
    return sessions.find((s) => s.status === 'in_progress') ?? sessions[0] ?? null
  }, [sessions, selectedId])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { warehouseId: '', categoryId: '', scheduledDate: format(new Date(), 'yyyy-MM-dd') },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'cycle-counts'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const scheduleMutation = useMutation({
    mutationFn: (values: ScheduleForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return cycleCountApi.scheduleSession({
        warehouseId: values.warehouseId,
        categoryId: values.categoryId || undefined,
        scheduledDate: values.scheduledDate,
        createdBy: currentUser.name,
      })
    },
    onSuccess: (s) => {
      toast.success(`Scheduled ${s.id} — ${s.lines.length} items`)
      reset({ warehouseId: '', categoryId: '', scheduledDate: format(new Date(), 'yyyy-MM-dd') })
      setSelectedId(s.id)
      invalidate()
    },
    onError: (err) => toast.error('Schedule failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const recordMutation = useMutation({
    mutationFn: ({ sessionId, itemId, actualQty }: { sessionId: string; itemId: string; actualQty: number }) => {
      if (!currentUser) throw new Error('Not signed in')
      return cycleCountApi.recordCount(sessionId, itemId, actualQty, currentUser.name)
    },
    onSuccess: () => invalidate(),
    onError: (err) => toast.error('Count failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const finalizeMutation = useMutation({
    mutationFn: (sessionId: string) => {
      if (!currentUser) throw new Error('Not signed in')
      return cycleCountApi.finalizeSession(sessionId, currentUser.name)
    },
    onSuccess: (s) => {
      toast.success(`Finalized ${s.id} — adjustments posted`)
      setFinalizeTarget(null)
      invalidate()
    },
    onError: (err) => toast.error('Finalize failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return cycleCountApi.cancelSession(sessionId, currentUser.name, reason)
    },
    onSuccess: (s) => {
      toast.success(`Cancelled ${s.id}`)
      setCancelTarget(null); setCancelReason('')
      invalidate()
    },
    onError: (err) => toast.error('Cancel failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))
  const categoryOptions = [{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cycle Count"
        subtitle="Schedule, run, and finalize spot-check counts. Variances post as auto-approved adjustments on finalization."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Schedule form */}
        <form
          onSubmit={handleSubmit((v) => scheduleMutation.mutate(v))}
          className="bg-white rounded-xl border border-zinc-200/60 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
              <Plus className="w-4 h-4" />
            </span>
            <p className="text-[13px] font-semibold text-zinc-900">Schedule New Count</p>
          </div>

          <Select
            label="Warehouse *"
            placeholder="Select warehouse"
            options={warehouseOptions}
            {...register('warehouseId')}
            error={errors.warehouseId?.message}
          />

          <Select
            label="Category"
            options={categoryOptions}
            {...register('categoryId')}
          />
          <p className="text-[11px] text-zinc-400 -mt-2">Leave blank to count every item in the warehouse.</p>

          <Input
            label="Schedule Date *"
            type="date"
            {...register('scheduledDate')}
            error={errors.scheduledDate?.message}
          />

          <Button type="submit" loading={scheduleMutation.isPending} fullWidth>
            Schedule Count
          </Button>
        </form>

        {/* Active sessions list */}
        <div className="bg-white rounded-xl border border-zinc-200/60">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-zinc-900">Sessions</p>
            <span className="text-[11px] text-zinc-400">{sessions.length} total</span>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-zinc-500">
              No sessions yet — schedule your first count to get started.
            </div>
          ) : (
            <ul>
              {sessions.map((s, i) => {
                const counted = s.lines.filter((l) => l.actualQty !== undefined).length
                const total = s.lines.length
                const progress = total > 0 ? Math.round((counted / total) * 100) : 0
                const isSelected = selected?.id === s.id
                const isLast = i === sessions.length - 1
                return (
                  <li key={s.id} className={cn(!isLast && 'border-b border-zinc-100')}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        'w-full text-left px-5 py-4 hover:bg-zinc-50/50 transition-colors',
                        isSelected && 'bg-zinc-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-[12px] text-zinc-500">{s.id}</p>
                            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-medium', STATUS_PILL[s.status])}>
                              {STATUS_LABEL[s.status]}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium text-zinc-900 mt-1">
                            {warehouseMap[s.warehouseId]?.name ?? s.warehouseId}
                            {s.categoryId && (
                              <span className="text-zinc-500 font-normal"> · {categories.find((c) => c.id === s.categoryId)?.name ?? s.categoryId}</span>
                            )}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {format(new Date(s.scheduledDate), 'MMM d, yyyy')} · {total} item{total === 1 ? '' : 's'}
                          </p>
                        </div>
                        <ChevronRight className={cn('w-4 h-4 mt-1 transition-transform', isSelected && 'text-zinc-700')} />
                      </div>
                      {s.status !== 'scheduled' && total > 0 && (
                        <div className="mt-2.5">
                          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                s.status === 'completed' ? 'bg-emerald-500' : s.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-500',
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[10.5px] text-zinc-500 mt-1">
                            {counted} / {total} counted ({progress}%)
                          </p>
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Selected session detail */}
      {selected && (
        <SessionDetail
          session={selected}
          itemMap={itemMap}
          warehouseName={warehouseMap[selected.warehouseId]?.name ?? selected.warehouseId}
          onRecord={(itemId, actualQty) => recordMutation.mutate({ sessionId: selected.id, itemId, actualQty })}
          isRecording={recordMutation.isPending}
          onFinalize={() => setFinalizeTarget(selected)}
          onCancel={() => setCancelTarget(selected)}
        />
      )}

      <Modal
        open={!!finalizeTarget}
        onClose={() => setFinalizeTarget(null)}
        title={`Finalize ${finalizeTarget?.id ?? ''}?`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Posts auto-approved adjustments for every counted line with a non-zero variance.
            Uncounted lines are ignored. Once finalized the session can&rsquo;t be re-edited.
          </p>
          {finalizeTarget && (
            <FinalizePreview session={finalizeTarget} itemMap={itemMap} />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setFinalizeTarget(null)} disabled={finalizeMutation.isPending}>Cancel</Button>
            <Button variant="success" fullWidth loading={finalizeMutation.isPending} onClick={() => finalizeTarget && finalizeMutation.mutate(finalizeTarget.id)}>
              Finalize &amp; Post Adjustments
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason('') }}
        title={`Cancel ${cancelTarget?.id ?? ''}?`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            The session is dropped without posting any adjustments. Counts entered so far are kept on the record for audit.
          </p>
          <Textarea
            label="Reason *"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Counter unavailable — rescheduling"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => { setCancelTarget(null); setCancelReason('') }} disabled={cancelMutation.isPending}>Back</Button>
            <Button
              variant="danger"
              fullWidth
              loading={cancelMutation.isPending}
              disabled={cancelReason.trim().length < 2}
              onClick={() => cancelTarget && cancelMutation.mutate({ sessionId: cancelTarget.id, reason: cancelReason.trim() })}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface SessionDetailProps {
  session: CycleCountSession
  itemMap: Record<string, { id: string; sku: string; name: string; quantity: number }>
  warehouseName: string
  onRecord: (itemId: string, actualQty: number) => void
  isRecording: boolean
  onFinalize: () => void
  onCancel: () => void
}

function SessionDetail({ session, itemMap, warehouseName, onRecord, isRecording, onFinalize, onCancel }: SessionDetailProps) {
  const counted = session.lines.filter((l) => l.actualQty !== undefined).length
  const total = session.lines.length
  const matches = session.lines.filter((l) => l.actualQty !== undefined && l.actualQty === l.expectedQty).length
  const variances = session.lines.filter((l) => l.actualQty !== undefined && l.actualQty !== l.expectedQty).length
  const notCounted = total - counted
  const readonly = session.status === 'completed' || session.status === 'cancelled'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[13px] font-semibold text-zinc-900">Cycle Count Details · {session.id}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{warehouseName} · scheduled {format(new Date(session.scheduledDate), 'MMM d, yyyy')}</p>
          </div>
          {readonly && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
              <Lock className="w-3 h-3" />
              Read-only
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Variance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {session.lines.map((line) => {
                const item = itemMap[line.itemId]
                const variance = line.actualQty !== undefined ? line.actualQty - line.expectedQty : null
                const status = line.actualQty === undefined
                  ? 'pending'
                  : variance === 0 ? 'match' : 'variance'
                return (
                  <tr key={line.itemId} className="border-b border-zinc-100/60">
                    <td className="px-4 py-3 text-[13px] text-zinc-700">
                      <span className="font-mono text-[11px] text-zinc-400 block">{item?.sku ?? line.itemId}</span>
                      {item?.name ?? line.itemId}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-700">{line.expectedQty}</td>
                    <td className="px-4 py-3 text-right">
                      {readonly ? (
                        <span className="text-[13px] tabular-nums text-zinc-700">{line.actualQty ?? '—'}</span>
                      ) : (
                        <ActualInput
                          line={line}
                          disabled={isRecording}
                          onCommit={(qty) => onRecord(line.itemId, qty)}
                        />
                      )}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right text-[13px] tabular-nums font-medium whitespace-nowrap',
                      variance === null && 'text-zinc-300',
                      variance !== null && variance === 0 && 'text-emerald-700',
                      variance !== null && variance < 0 && 'text-red-700',
                      variance !== null && variance > 0 && 'text-blue-700',
                    )}>
                      {variance === null ? '—' : `${variance > 0 ? '+' : ''}${variance}`}
                    </td>
                    <td className="px-4 py-3">
                      {status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[11px] font-medium">
                          Pending
                        </span>
                      )}
                      {status === 'match' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                          Match
                        </span>
                      )}
                      {status === 'variance' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
                          Variance
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Count Summary</p>
          <SummaryDonut total={total} match={matches} variance={variances} notCounted={notCounted} />
          <ul className="mt-4 space-y-1.5 text-[12px]">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-700"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Match</span>
              <span className="tabular-nums font-medium">{matches}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-700"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Variance</span>
              <span className="tabular-nums font-medium">{variances}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-700"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-300" /> Not Counted</span>
              <span className="tabular-nums font-medium">{notCounted}</span>
            </li>
          </ul>
        </div>

        {!readonly && (
          <div className="bg-white rounded-xl border border-zinc-200/60 p-5 space-y-2">
            <Button
              fullWidth
              variant="success"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              disabled={counted === 0}
              onClick={onFinalize}
            >
              Finalize Session
            </Button>
            <Button
              fullWidth
              variant="ghost"
              leftIcon={<X className="w-4 h-4" />}
              onClick={onCancel}
            >
              Cancel session
            </Button>
            {counted === 0 && (
              <p className="text-[11px] text-zinc-400 text-center">Count at least one line to finalize.</p>
            )}
          </div>
        )}

        {session.status === 'completed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[12px] text-emerald-800">
            <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</p>
            <p className="mt-1">
              Finalized by <span className="font-medium">{session.finalizedBy ?? '—'}</span>
              {session.completedAt && <> on {format(parseISO(session.completedAt), 'MMM d, HH:mm')}</>}.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

interface ActualInputProps {
  line: CycleCountSession['lines'][number]
  disabled: boolean
  onCommit: (qty: number) => void
}

function ActualInput({ line, disabled, onCommit }: ActualInputProps) {
  const [draft, setDraft] = useState<string>(line.actualQty !== undefined ? String(line.actualQty) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync from external updates (e.g. another counter recorded this line)
  // unless the field is currently focused — don't clobber typing in progress.
  useEffect(() => {
    if (document.activeElement === inputRef.current) return
    setDraft(line.actualQty !== undefined ? String(line.actualQty) : '')
  }, [line.actualQty])

  return (
    <input
      ref={inputRef}
      type="number"
      min={0}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        // Empty / whitespace-only → leave the line uncounted; do NOT commit 0.
        if (draft.trim() === '') {
          setDraft(line.actualQty !== undefined ? String(line.actualQty) : '')
          return
        }
        const n = Number(draft)
        if (!Number.isFinite(n) || n < 0) {
          setDraft(line.actualQty !== undefined ? String(line.actualQty) : '')
          return
        }
        if (n !== line.actualQty) onCommit(n)
      }}
      disabled={disabled}
      placeholder="—"
      className="w-20 px-2 py-1 rounded border border-zinc-200 text-[13px] tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 disabled:opacity-60"
    />
  )
}

function SummaryDonut({ total, match, variance, notCounted }: { total: number; match: number; variance: number; notCounted: number }) {
  if (total === 0) return null
  const matchPct = (match / total) * 100
  const variancePct = (variance / total) * 100
  // Use a stacked SVG arc to draw a donut without extra deps.
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const matchLen = (matchPct / 100) * circumference
  const varianceLen = (variancePct / 100) * circumference
  const notCountedLen = circumference - matchLen - varianceLen
  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-zinc-200" strokeWidth="14" />
        {match > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="14"
            strokeDasharray={`${matchLen} ${circumference - matchLen}`}
          />
        )}
        {variance > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="14"
            strokeDasharray={`${varianceLen} ${circumference - varianceLen}`}
            strokeDashoffset={-matchLen}
          />
        )}
        {notCounted > 0 && match + variance > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-zinc-300"
            strokeWidth="14"
            strokeDasharray={`${notCountedLen} ${circumference - notCountedLen}`}
            strokeDashoffset={-(matchLen + varianceLen)}
          />
        )}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="600" fill="currentColor" className="text-zinc-900" transform="rotate(90, 50, 50)">
          {total}
        </text>
        <text x="50" y="62" textAnchor="middle" dominantBaseline="central" fontSize="6" fill="currentColor" className="text-zinc-400" transform="rotate(90, 50, 50)">
          ITEMS
        </text>
      </svg>
    </div>
  )
}

// Helper for Modal preview — shows what will actually be posted on finalize.
// Variance is computed against the live `book` quantity (current item.quantity),
// matching the API's reconciliation logic. expectedQty is shown alongside for
// context but is no longer the basis for the adjustment math.
function FinalizePreview({ session, itemMap }: { session: CycleCountSession; itemMap: Record<string, { sku: string; name: string; quantity: number }> }) {
  type Line = CycleCountSession['lines'][number]
  type PreviewRow = { line: Line; book: number; variance: number }

  const counted = session.lines.filter((l) => l.actualQty !== undefined)
  const previews: PreviewRow[] = counted.map((l) => {
    const item = itemMap[l.itemId]
    const book = item?.quantity ?? l.expectedQty
    return { line: l, book, variance: (l.actualQty ?? 0) - book }
  })
  const willPost = previews.filter((p) => p.variance !== 0)

  if (willPost.length === 0) {
    return (
      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800">
        All counted lines match current stock — no adjustments will be posted. Session simply closes.
      </div>
    )
  }
  return (
    <div className="rounded-md border border-zinc-200/60 bg-zinc-50/50 max-h-48 overflow-y-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-zinc-400">
            <th className="px-3 py-1.5 text-left font-medium uppercase tracking-wider text-[10px]">Item</th>
            <th className="px-3 py-1.5 text-right font-medium uppercase tracking-wider text-[10px]">Book</th>
            <th className="px-3 py-1.5 text-right font-medium uppercase tracking-wider text-[10px]">Counted</th>
            <th className="px-3 py-1.5 text-right font-medium uppercase tracking-wider text-[10px]">Adjustment</th>
          </tr>
        </thead>
        <tbody>
          {willPost.map(({ line, book, variance }) => {
            const item = itemMap[line.itemId]
            return (
              <tr key={line.itemId} className="border-t border-zinc-100">
                <td className="px-3 py-1.5 text-zinc-700">
                  <span className="font-mono text-[11px] text-zinc-400">{item?.sku ?? line.itemId}</span> {item?.name ?? ''}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{book}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">{line.actualQty}</td>
                <td className={cn('px-3 py-1.5 text-right tabular-nums font-medium', variance < 0 ? 'text-red-700' : 'text-blue-700')}>
                  {variance > 0 ? '+' : ''}{variance}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Re-export for the placeholder cycle-count-tab that's no longer used; kept so
// any orphan imports don't break.
export { ClipboardList }

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getModulePath } from '@/config/modules'
import { maintenanceApi } from '@/features/maintenance'
import type { WorkOrder, WorkOrderPriority } from '@/features/maintenance/types'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { isModuleManagerOrAbove } from '@/features/auth'
import { useClickOutside } from '@/shared/hooks/use-click-outside'
import { cn } from '@/shared/utils/cn'

/** Chip-only colours — priority dot inside the chip. Border + text only,
 * background stays white so a busy day doesn't turn into a colour fight. */
const PRIORITY_DOT: Record<WorkOrderPriority, string> = {
  low: 'bg-zinc-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
}

const PRIORITY_RING: Record<WorkOrderPriority, string> = {
  low: 'border-zinc-200',
  medium: 'border-blue-200',
  high: 'border-amber-200',
  critical: 'border-red-200',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Max chips rendered inside a day cell before collapsing the rest into "+N". */
const MAX_VISIBLE_PER_DAY = 3

/** dataTransfer mime type for the WO id payload. Custom type keeps native
 * browser drag targets (URLs, files) from mistakenly accepting our drag. */
const WO_DRAG_MIME = 'application/x-ems-workorder-id'

interface ScheduleCalendarProps {
  workOrders: WorkOrder[]
}

export function ScheduleCalendar({ workOrders }: ScheduleCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today))
  const [overflowDayKey, setOverflowDayKey] = useState<string | null>(null)
  const [dragWoId, setDragWoId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const overflowRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  // Manager+ can reschedule; members get the calendar as a read-only view.
  const canReschedule = isModuleManagerOrAbove(currentUser, 'maintenance')

  useClickOutside(overflowRef, () => setOverflowDayKey(null), !!overflowDayKey)

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newDate }: { id: string; newDate: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.reschedule(id, newDate, currentUser.id)
    },
    // Optimistic update — the cache stores a sorted array of WOs (see
    // maintenanceApi.list). React Query won't re-derive that array from the
    // mutated source, so we patch the cached copy directly and resort it.
    onMutate: async ({ id, newDate }) => {
      const key = ['maintenance', 'work-orders'] as const
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<WorkOrder[]>(key)
      if (previous) {
        const next = previous
          .map((w) => (w.id === id ? { ...w, scheduledDate: newDate } : w))
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        queryClient.setQueryData<WorkOrder[]>(key, next)
      }
      return { previous }
    },
    onError: (err, _vars, context) => {
      // Roll back on failure so the chip snaps to its original day.
      if (context?.previous) {
        queryClient.setQueryData(['maintenance', 'work-orders'], context.previous)
      }
      toast.error('Reschedule failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
    onSuccess: (wo, vars) => {
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Rescheduled ${wo.id}`, { description: format(new Date(vars.newDate), 'MMM d, yyyy') })
    },
    onSettled: () => {
      // Final reconciliation with server state — runs after success or error.
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] })
    },
  })

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  // ISO-date → list of WOs on that day. Keyed by 'YYYY-MM-DD' so we can lookup
  // by the raw scheduledDate string without re-parsing on every render.
  const ordersByDay = useMemo(() => {
    const map = new Map<string, WorkOrder[]>()
    for (const wo of workOrders) {
      if (!wo.scheduledDate) continue
      const list = map.get(wo.scheduledDate) ?? []
      list.push(wo)
      map.set(wo.scheduledDate, list)
    }
    // Sort each day by priority (critical → low) so the most important chip
    // is the first one visible above the fold.
    const rank: Record<WorkOrderPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    for (const list of map.values()) {
      list.sort((a, b) => rank[a.priority] - rank[b.priority])
    }
    return map
  }, [workOrders])

  // Close any open overflow popover when the user navigates months.
  useEffect(() => {
    setOverflowDayKey(null)
  }, [cursor])

  const openWorkOrder = (woId: string) => {
    navigate(`${getModulePath('maintenance', 'work-orders')}?wo=${woId}`)
  }

  const handleDragStart = (e: React.DragEvent, wo: WorkOrder) => {
    if (!canReschedule) {
      e.preventDefault()
      return
    }
    setDragWoId(wo.id)
    e.dataTransfer.setData(WO_DRAG_MIME, wo.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDragWoId(null)
    setDragOverDay(null)
  }

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    if (!dragWoId) return
    if (!e.dataTransfer.types.includes(WO_DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverDay !== dayKey) setDragOverDay(dayKey)
  }

  const handleDrop = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault()
    const woId = e.dataTransfer.getData(WO_DRAG_MIME)
    setDragWoId(null)
    setDragOverDay(null)
    if (!woId) return
    // Skip no-op drops onto the source day — the API tolerates them, but we
    // don't want a confirmation toast for what looks like a misclick.
    const wo = workOrders.find((w) => w.id === woId)
    if (wo && wo.scheduledDate === dayKey) return
    rescheduleMutation.mutate({ id: woId, newDate: dayKey })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((d) => subMonths(d, 1))}
            aria-label="Previous month"
            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-[14px] font-semibold text-zinc-900 tabular-nums min-w-[140px] text-center">
            {format(cursor, 'MMMM yyyy')}
          </h3>
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, 1))}
            aria-label="Next month"
            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCursor(startOfMonth(today))}
          className="px-2.5 py-1 rounded-md text-[12px] font-medium text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
        >
          Today
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-100">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium text-center"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" ref={overflowRef}>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const list = ordersByDay.get(key) ?? []
            const visible = list.slice(0, MAX_VISIBLE_PER_DAY)
            const hidden = list.length - visible.length
            const inMonth = isSameMonth(day, cursor)
            const isCurrent = isSameDay(day, today)
            const isOverflowOpen = overflowDayKey === key
            const isDropTarget = dragOverDay === key && !!dragWoId

            return (
              <div
                key={key}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={() => setDragOverDay((prev) => (prev === key ? null : prev))}
                onDrop={(e) => handleDrop(e, key)}
                className={cn(
                  'relative min-h-[112px] border-b border-r border-zinc-100 p-1.5 transition-colors',
                  // last column in each row drops the right border
                  '[&:nth-child(7n)]:border-r-0',
                  inMonth ? 'bg-white' : 'bg-zinc-50/40',
                  isDropTarget && 'bg-blue-50/70 ring-1 ring-inset ring-blue-300',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center text-[11px] font-medium w-6 h-6 rounded-md tabular-nums',
                      isCurrent
                        ? 'bg-zinc-900 text-white'
                        : inMonth
                          ? 'text-zinc-700'
                          : 'text-zinc-300',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {visible.map((wo) => (
                    <WorkOrderChip
                      key={wo.id}
                      wo={wo}
                      isDragging={dragWoId === wo.id}
                      draggable={canReschedule}
                      onOpen={openWorkOrder}
                      onDragStart={(e) => handleDragStart(e, wo)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setOverflowDayKey(isOverflowOpen ? null : key)}
                      className="block w-full text-left text-[10.5px] font-medium text-zinc-500 hover:text-zinc-900 px-1.5 py-0.5 rounded transition-colors"
                    >
                      +{hidden} more
                    </button>
                  )}
                </div>

                {isOverflowOpen && (
                  <div className="absolute left-1.5 right-1.5 top-9 z-20 bg-white rounded-lg border border-zinc-200 p-2 max-h-72 overflow-y-auto">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-1.5 px-1">
                      {format(day, 'MMM d')} · {list.length} orders
                    </p>
                    <div className="space-y-1">
                      {list.map((wo) => (
                        <WorkOrderChip
                          key={wo.id}
                          wo={wo}
                          isDragging={dragWoId === wo.id}
                          draggable={canReschedule}
                          onOpen={openWorkOrder}
                          onDragStart={(e) => handleDragStart(e, wo)}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-medium">Priority:</span>
          {(['critical', 'high', 'medium', 'low'] as WorkOrderPriority[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1 capitalize">
              <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[p])} />
              {p}
            </span>
          ))}
        </div>
        {canReschedule ? (
          <span className="text-zinc-400">Tip: drag a chip onto another day to reschedule.</span>
        ) : (
          <span className="text-zinc-400">Read-only view. Ask a maintenance manager to reschedule.</span>
        )}
      </div>
    </div>
  )
}

interface WorkOrderChipProps {
  wo: WorkOrder
  isDragging: boolean
  draggable: boolean
  onOpen: (woId: string) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function WorkOrderChip({ wo, isDragging, draggable, onOpen, onDragStart, onDragEnd }: WorkOrderChipProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(wo.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(wo.id)
        }
      }}
      title={`${wo.id} — ${wo.title}${draggable ? ' · drag to reschedule' : ''}`}
      className={cn(
        'flex items-center gap-1.5 px-1.5 py-0.5 rounded border bg-white text-[10.5px] truncate transition-colors',
        'hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'opacity-40',
        PRIORITY_RING[wo.priority],
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[wo.priority])} />
      <span className="text-zinc-700 truncate font-medium">{wo.title}</span>
    </div>
  )
}

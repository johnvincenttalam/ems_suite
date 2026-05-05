import { useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, FileText, GitBranch } from 'lucide-react'
import { useDocuments } from '@/features/documents'
import type { AppDocument } from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'
import { FileIcon } from './file-icon'
import { TrackingBadge, PriorityBadge } from './document-meta'

type EventType = 'deadline' | 'validity' | 'received'

interface CalendarEvent {
  id: string
  date: Date
  type: EventType
  title: string
  document: AppDocument
}

const eventStyles: Record<EventType, { dot: string; label: string }> = {
  deadline: { dot: 'bg-red-500', label: 'Deadline' },
  validity: { dot: 'bg-amber-500', label: 'Validity ends' },
  received: { dot: 'bg-blue-500', label: 'Received' },
}

function buildEvents(docs: AppDocument[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const d of docs) {
    if (d.deadline) {
      events.push({ id: `${d.id}-deadline`, date: parseISO(d.deadline), type: 'deadline', title: d.title, document: d })
    }
    if (d.validityUntil) {
      events.push({ id: `${d.id}-validity`, date: parseISO(d.validityUntil), type: 'validity', title: d.title, document: d })
    }
    events.push({ id: `${d.id}-received`, date: parseISO(d.createdAt), type: 'received', title: d.title, document: d })
  }
  return events
}

export function CalendarTab() {
  const { data: documents = [], isLoading } = useDocuments()

  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const events = useMemo(() => buildEvents(documents), [documents])

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(() => {
    const out: Date[] = []
    let d = gridStart
    while (d <= gridEnd) {
      out.push(d)
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    }
    return out
  }, [gridStart, gridEnd])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const key = format(e.date, 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return map
  }, [events])

  const selectedEvents = selected
    ? (eventsByDay.get(format(selected, 'yyyy-MM-dd')) ?? []).slice().sort((a, b) => a.type.localeCompare(b.type))
    : []

  if (isLoading) return <TableSkeleton columns={7} rows={6} />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">{format(cursor, 'MMMM yyyy')}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setCursor(new Date()); setSelected(new Date()) }}>Today</Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/40">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="px-2 py-2 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = isSameMonth(day, cursor)
            const isToday = isSameDay(day, new Date())
            const isSelected = selected && isSameDay(day, selected)
            const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? []

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(day)}
                className={cn(
                  'min-h-[88px] px-2 py-2 text-left border-b border-r border-zinc-100 hover:bg-zinc-50 transition-colors flex flex-col gap-1 cursor-pointer',
                  !inMonth && 'bg-zinc-50/30 text-zinc-400',
                  isSelected && 'bg-violet-50',
                )}
              >
                <span className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium',
                  isToday ? 'bg-zinc-900 text-white' : inMonth ? 'text-zinc-700' : 'text-zinc-400',
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className="flex items-center gap-1 truncate text-[11px]">
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', eventStyles[e.type].dot)} />
                      <span className="truncate text-zinc-700">{e.title}</span>
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-zinc-400">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <div className="px-4 py-3 border-t border-zinc-100 flex flex-wrap gap-3 text-[11px] text-zinc-500">
          {(Object.entries(eventStyles) as [EventType, typeof eventStyles[EventType]][]).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', v.dot)} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">
            {selected ? format(selected, 'EEEE, MMMM d, yyyy') : 'Pick a day'}
          </h3>
          <p className="text-[12px] text-zinc-400">
            {selected ? `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}` : 'Click a date to see entries'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!selected || selectedEvents.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nothing scheduled"
              description="Document deadlines, validity expirations, and receipts appear here."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {selectedEvents.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FileIcon type={e.document.fileType} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                          e.type === 'deadline' && 'bg-red-50 text-red-700',
                          e.type === 'validity' && 'bg-amber-50 text-amber-700',
                          e.type === 'received' && 'bg-blue-50 text-blue-700',
                        )}>
                          {e.type === 'deadline' && <Clock className="w-2.5 h-2.5" />}
                          {e.type === 'received' && <FileText className="w-2.5 h-2.5" />}
                          {e.type === 'validity' && <GitBranch className="w-2.5 h-2.5" />}
                          {eventStyles[e.type].label}
                        </span>
                        <TrackingBadge trackingNumber={e.document.trackingNumber} />
                      </div>
                      <p className="text-[13px] font-medium text-zinc-900 mt-1 truncate">{e.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {e.document.priority && <PriorityBadge value={e.document.priority} size="sm" />}
                        <span className="text-[11px] text-zinc-400">{format(e.date, 'HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

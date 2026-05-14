import { useMemo, useState } from 'react'
import { format, isToday, isPast, isThisWeek, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, Clock, LayoutList, CalendarDays } from 'lucide-react'
import { getModulePath } from '@/config/modules'
import { useWorkOrders } from '@/features/maintenance'
import { useAssets } from '@/features/assets'
import { useVehicles } from '@/features/fleet/hooks/use-fleet'
import { useUsers } from '@/features/users'
import type { WorkOrder, WorkOrderPriority } from '@/features/maintenance/types'
import { Avatar } from '@/shared/ui/avatar'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'
import { ScheduleCalendar } from './schedule-calendar'

type ViewMode = 'list' | 'calendar'

const priorityStyles: Record<WorkOrderPriority, string> = {
  low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

interface Bucket {
  key: 'overdue' | 'today' | 'this-week' | 'later'
  label: string
  description: string
  orders: WorkOrder[]
}

function bucketize(orders: WorkOrder[]): Bucket[] {
  const overdue: WorkOrder[] = []
  const today: WorkOrder[] = []
  const thisWeek: WorkOrder[] = []
  const later: WorkOrder[] = []

  for (const wo of orders) {
    if (wo.status !== 'pending' && wo.status !== 'ongoing') continue
    const date = parseISO(wo.scheduledDate)
    if (isToday(date)) today.push(wo)
    else if (isPast(date)) overdue.push(wo)
    else if (isThisWeek(date, { weekStartsOn: 1 })) thisWeek.push(wo)
    else later.push(wo)
  }

  return [
    { key: 'overdue',   label: 'Overdue',   description: 'Past their scheduled date', orders: overdue },
    { key: 'today',     label: 'Today',     description: 'Scheduled for today',       orders: today },
    { key: 'this-week', label: 'This Week', description: 'Coming up this week',       orders: thisWeek },
    { key: 'later',     label: 'Later',     description: 'Future schedule',           orders: later },
  ]
}

export function ScheduleTab() {
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: assets = [] } = useAssets()
  const { data: vehicles = [] } = useVehicles()
  const { data: users = [] } = useUsers()
  const [view, setView] = useState<ViewMode>('list')
  const navigate = useNavigate()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])

  const activeOrders = useMemo(
    () => workOrders.filter((w) => w.status === 'pending' || w.status === 'ongoing'),
    [workOrders],
  )

  const buckets = useMemo(() => bucketize(workOrders), [workOrders])

  if (isLoading) return <TableSkeleton columns={3} rows={6} />

  if (activeOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled"
          description="No active work orders. Use the Work Orders tab to create one."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center bg-zinc-100 rounded-lg p-0.5">
          <ViewToggleButton active={view === 'list'} onClick={() => setView('list')} icon={LayoutList} label="List" />
          <ViewToggleButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarDays} label="Calendar" />
        </div>
      </div>

      {view === 'calendar' ? (
        <ScheduleCalendar workOrders={activeOrders} />
      ) : (
        <div className="space-y-6">
          {buckets.map((bucket) => {
        if (bucket.orders.length === 0) return null
        const isOverdue = bucket.key === 'overdue'
        const Icon = isOverdue ? AlertTriangle : bucket.key === 'today' ? Clock : Calendar
        return (
          <div key={bucket.key}>
            <div className="flex items-baseline gap-2 mb-3">
              <Icon className={cn('w-4 h-4', isOverdue ? 'text-red-500' : bucket.key === 'today' ? 'text-blue-500' : 'text-zinc-400')} />
              <h3 className={cn('text-[13px] font-semibold tracking-tight', isOverdue ? 'text-red-700' : 'text-zinc-900')}>{bucket.label}</h3>
              <span className="text-[12px] text-zinc-400">· {bucket.orders.length} {bucket.orders.length === 1 ? 'order' : 'orders'}</span>
              <span className="text-[12px] text-zinc-400">· {bucket.description}</span>
            </div>
            <div className="space-y-2">
              {bucket.orders.map((wo) => {
                const vehicle = wo.vehicleId ? vehicleMap[wo.vehicleId] : undefined
                const asset = wo.assetId ? assetMap[wo.assetId] : undefined
                const user = userMap[wo.assignedTo]
                const subjectLabel = vehicle
                  ? `🚛 ${vehicle.plateNumber} · ${vehicle.model}`
                  : asset?.name ?? (wo.assetId ?? wo.vehicleId ?? '—')
                return (
                  <div
                    key={wo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`${getModulePath('maintenance', 'work-orders')}?wo=${wo.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`${getModulePath('maintenance', 'work-orders')}?wo=${wo.id}`)
                      }
                    }}
                    className={cn(
                      'bg-white rounded-lg border px-4 py-3 flex items-center gap-4 cursor-pointer transition-colors',
                      'hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10',
                      isOverdue ? 'border-red-200/60 hover:border-red-300' : 'border-zinc-200/60',
                    )}
                  >
                    <div className="flex-shrink-0 w-14 text-center">
                      <p className={cn('text-[11px] uppercase tracking-wider font-semibold', isOverdue ? 'text-red-600' : 'text-zinc-400')}>
                        {format(parseISO(wo.scheduledDate), 'MMM')}
                      </p>
                      <p className={cn('text-xl font-semibold tabular-nums', isOverdue ? 'text-red-700' : 'text-zinc-900')}>
                        {format(parseISO(wo.scheduledDate), 'dd')}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-zinc-400">{wo.id}</span>
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize', priorityStyles[wo.priority])}>{wo.priority}</span>
                      </div>
                      <p className="text-[13px] font-medium text-zinc-900 mt-0.5">{wo.title}</p>
                      <p className="text-[12px] text-zinc-500">{subjectLabel}</p>
                    </div>
                    {user && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Avatar name={user.name} size="sm" />
                        <span className="text-[12px] text-zinc-600 hidden sm:inline">{user.name}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
        </div>
      )}
    </div>
  )
}

function ViewToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof LayoutList
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] font-medium transition-colors',
        active ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-900',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

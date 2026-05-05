import { useMemo } from 'react'
import { format, isToday, isPast, isThisWeek, parseISO } from 'date-fns'
import { Calendar, AlertTriangle, Clock } from 'lucide-react'
import { useWorkOrders } from '@/features/maintenance'
import { useAssets } from '@/features/assets'
import { useUsers } from '@/features/users'
import type { WorkOrder, WorkOrderPriority } from '@/features/maintenance/types'
import { Avatar } from '@/shared/ui/avatar'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'

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
    if (wo.status === 'completed') continue
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
  const { data: users = [] } = useUsers()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const buckets = useMemo(() => bucketize(workOrders), [workOrders])

  if (isLoading) return <TableSkeleton columns={3} rows={6} />

  if (workOrders.filter((w) => w.status !== 'completed').length === 0) {
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
                const asset = assetMap[wo.assetId]
                const user = userMap[wo.assignedTo]
                return (
                  <div key={wo.id} className={cn(
                    'bg-white rounded-lg border px-4 py-3 flex items-center gap-4',
                    isOverdue ? 'border-red-200/60' : 'border-zinc-200/60'
                  )}>
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
                      <p className="text-[12px] text-zinc-500">{asset?.name ?? wo.assetId}</p>
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
  )
}

import { useMemo } from 'react'
import { Users as UsersIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useWorkOrders } from '@/features/maintenance'
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

export function TechniciansTab() {
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: users = [] } = useUsers()

  const grouped = useMemo(() => {
    const map = new Map<string, WorkOrder[]>()
    for (const wo of workOrders) {
      if (!map.has(wo.assignedTo)) map.set(wo.assignedTo, [])
      map.get(wo.assignedTo)!.push(wo)
    }
    return Array.from(map.entries())
      .map(([userId, orders]) => ({
        userId,
        user: users.find((u) => u.id === userId),
        pending: orders.filter((o) => o.status === 'pending').length,
        ongoing: orders.filter((o) => o.status === 'ongoing').length,
        completed: orders.filter((o) => o.status === 'completed').length,
        active: orders.filter((o) => o.status !== 'completed').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
      }))
      .filter((g) => g.user)
      .sort((a, b) => (b.pending + b.ongoing) - (a.pending + a.ongoing))
  }, [workOrders, users])

  if (isLoading) return <TableSkeleton columns={3} rows={4} />

  if (grouped.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={UsersIcon}
          title="No technicians assigned"
          description="Create a work order and assign a technician to see workload here."
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {grouped.map((g) => (
        <div key={g.userId} className="bg-white rounded-xl border border-zinc-200/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={g.user!.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-zinc-900 truncate">{g.user!.name}</p>
              <p className="text-[12px] text-zinc-400 truncate">{g.user!.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center px-2 py-2 rounded-lg bg-amber-50/60 border border-amber-100">
              <p className="text-lg font-semibold text-amber-700 tabular-nums">{g.pending}</p>
              <p className="text-[10px] uppercase tracking-wider text-amber-600">Pending</p>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <p className="text-lg font-semibold text-blue-700 tabular-nums">{g.ongoing}</p>
              <p className="text-[10px] uppercase tracking-wider text-blue-600">Ongoing</p>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <p className="text-lg font-semibold text-emerald-700 tabular-nums">{g.completed}</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-600">Done</p>
            </div>
          </div>

          {g.active.length > 0 && (
            <div className="border-t border-zinc-100 pt-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Active queue</p>
              {g.active.slice(0, 4).map((wo) => (
                <div key={wo.id} className="flex items-center gap-3 text-[12px]">
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize', priorityStyles[wo.priority])}>{wo.priority}</span>
                  <span className="text-zinc-700 truncate flex-1">{wo.title}</span>
                  <span className="text-zinc-400 tabular-nums whitespace-nowrap">{format(parseISO(wo.scheduledDate), 'MMM dd')}</span>
                </div>
              ))}
              {g.active.length > 4 && (
                <p className="text-[11px] text-zinc-400">+ {g.active.length - 4} more</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

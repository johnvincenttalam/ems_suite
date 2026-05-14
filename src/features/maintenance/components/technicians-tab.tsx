import { useMemo } from 'react'
import { Users as UsersIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useWorkOrders } from '@/features/maintenance'
import { useUsers } from '@/features/users'
import { hasModuleAccess, moduleRoleOf } from '@/features/auth'
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
    // Start with the full Maintenance roster — every active user with module
    // access, even if they have zero assigned WOs. That way the page doubles
    // as a roster (capacity slack is visible) instead of only surfacing
    // already-busy technicians.
    const technicians = users.filter((u) => u.status === 'active' && hasModuleAccess(u, 'maintenance'))

    const ordersByUser = new Map<string, WorkOrder[]>()
    for (const wo of workOrders) {
      if (!ordersByUser.has(wo.assignedTo)) ordersByUser.set(wo.assignedTo, [])
      ordersByUser.get(wo.assignedTo)!.push(wo)
    }

    // Also surface any user holding WOs even if their module role was removed
    // — they still appear in the audit trail, and the supervisor needs to see
    // the dangling assignment to reassign it.
    const orphanIds = Array.from(ordersByUser.keys()).filter(
      (id) => !technicians.some((t) => t.id === id),
    )
    const orphans = orphanIds
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => !!u)

    return [...technicians, ...orphans]
      .map((user) => {
        const orders = ordersByUser.get(user.id) ?? []
        return {
          userId: user.id,
          user,
          role: moduleRoleOf(user, 'maintenance'),
          isOrphan: !technicians.some((t) => t.id === user.id),
          pending: orders.filter((o) => o.status === 'pending').length,
          ongoing: orders.filter((o) => o.status === 'ongoing').length,
          completed: orders.filter((o) => o.status === 'completed').length,
          active: orders
            .filter((o) => o.status === 'pending' || o.status === 'ongoing')
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
        }
      })
      // Busy first, then free, orphans last (highlighted so they get attention).
      .sort((a, b) => {
        if (a.isOrphan !== b.isOrphan) return a.isOrphan ? 1 : -1
        return (b.pending + b.ongoing) - (a.pending + a.ongoing)
      })
  }, [workOrders, users])

  if (isLoading) return <TableSkeleton columns={3} rows={4} />

  if (grouped.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={UsersIcon}
          title="No technicians yet"
          description="Grant a user Maintenance access (member, manager, or admin) under Maintenance → Users to add them to the roster."
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {grouped.map((g) => {
        const totalActive = g.pending + g.ongoing
        const isFree = totalActive === 0 && !g.isOrphan
        return (
        <div
          key={g.userId}
          className={cn(
            'bg-white rounded-xl border p-5',
            g.isOrphan ? 'border-amber-200/80' : 'border-zinc-200/60',
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={g.user.name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-[13px] font-medium text-zinc-900 truncate">{g.user.name}</p>
                {g.role && !g.isOrphan && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-medium capitalize">
                    {g.role}
                  </span>
                )}
                {g.isOrphan && (
                  <span title="Has work orders but no longer has Maintenance access" className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                    No access
                  </span>
                )}
                {isFree && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                    Available
                  </span>
                )}
              </div>
              <p className="text-[12px] text-zinc-400 truncate">{g.user.email}</p>
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

          {g.active.length > 0 ? (
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
          ) : (
            <div className="border-t border-zinc-100 pt-3">
              <p className="text-[12px] text-zinc-400 italic">No active work orders</p>
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

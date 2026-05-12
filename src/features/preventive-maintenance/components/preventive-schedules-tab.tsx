import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Pencil,
  Wrench,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'
import { usePreventiveSchedules } from '@/features/preventive-maintenance/hooks/use-preventive-schedules'
import { preventiveSchedulesApi } from '@/features/preventive-maintenance/api/preventive-schedules-api'
import type {
  PreventiveSchedule,
  ScheduleStatus,
} from '@/features/preventive-maintenance/types'
import { INTERVAL_UNIT_LABEL, isUsageInterval } from '@/features/preventive-maintenance/types'
import { useAssets } from '@/features/assets'
import { useVehicles } from '@/features/fleet/hooks/use-fleet'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { ExportMenu } from '@/shared/ui/export-menu'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { cn } from '@/shared/utils/cn'
import { ScheduleFormModal } from './schedule-form-modal'

const statusFilters: { value: ScheduleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
]

const statusStyles: Record<ScheduleStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export function PreventiveSchedulesTab() {
  const { data: schedules = [], isLoading } = usePreventiveSchedules()
  const { data: assets = [] } = useAssets()
  const { data: vehicles = [] } = useVehicles()
  const { data: users = [] } = useUsers()
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const vehicleByAssetId = useMemo(() => {
    const map: Record<string, typeof vehicles[number]> = {}
    for (const v of vehicles) if (v.linkedAssetId) map[v.linkedAssetId] = v
    return map
  }, [vehicles])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PreventiveSchedule | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  // Schedule is "due" when:
  //  - time-based: nextServiceDate ≤ today
  //  - usage-based: asset.currentMeter ≥ lastServiceMeter + intervalValue
  const isScheduleDue = (s: PreventiveSchedule): boolean => {
    if (s.status !== 'active') return false
    if (isUsageInterval(s.intervalUnit)) {
      const asset = assetMap[s.assetId]
      if (!asset || asset.currentMeter === undefined || s.lastServiceMeter === undefined) return false
      return asset.currentMeter >= s.lastServiceMeter + s.intervalValue
    }
    return s.nextServiceDate <= today
  }

  const filtered = useMemo(
    () => (statusFilter === 'all' ? schedules : schedules.filter((s) => s.status === statusFilter)),
    [schedules, statusFilter],
  )

  const dueCount = useMemo(
    () => schedules.filter((s) => isScheduleDue(s)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedules, today, assetMap],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['preventive-schedules'] })
    queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScheduleStatus }) => {
      if (!currentUser) throw new Error('Not signed in')
      return preventiveSchedulesApi.setStatus(id, status, currentUser.id)
    },
    onSuccess: (s) => {
      toast.success(`${s.id} ${s.status === 'paused' ? 'paused' : 'resumed'}`)
      invalidate()
    },
    onError: (err) =>
      toast.error('Update failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      }),
  })

  const generateMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => {
      if (!currentUser) throw new Error('Not signed in')
      return preventiveSchedulesApi.generateDueWorkOrder(id, currentUser.id, { force })
    },
    onSuccess: ({ schedule, workOrder }) => {
      toast.success(`Generated ${workOrder.id}`, {
        description: `Next due ${schedule.nextServiceDate}`,
      })
      invalidate()
    },
    onError: (err) =>
      toast.error('Generation failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      }),
  })

  function handleGenerateAllDue() {
    if (!currentUser) return
    const due = schedules.filter((s) => isScheduleDue(s))
    if (due.length === 0) {
      toast.info('Nothing due', { description: 'No active schedules are due as of today.' })
      return
    }
    Promise.allSettled(
      due.map((s) => preventiveSchedulesApi.generateDueWorkOrder(s.id, currentUser.id)),
    ).then((results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      invalidate()
      if (fail === 0) toast.success(`Generated ${ok} work order${ok === 1 ? '' : 's'}`)
      else toast.warning(`Generated ${ok} of ${results.length} — ${fail} failed`)
    })
  }

  const columns = useMemo<ColumnDef<PreventiveSchedule>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Schedule',
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-zinc-900">{row.original.title}</p>
            {row.original.notes && (
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{row.original.notes}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'assetId',
        header: 'Asset / Vehicle',
        cell: ({ getValue }) => {
          const id = getValue() as string
          const vehicle = vehicleByAssetId[id]
          if (vehicle) {
            return (
              <div>
                <p className="text-[13px] text-zinc-700 font-mono">{vehicle.plateNumber}</p>
                <p className="text-[11px] text-zinc-400">{vehicle.model}</p>
              </div>
            )
          }
          const asset = assetMap[id]
          return asset ? (
            <div>
              <p className="text-[13px] text-zinc-700">{asset.name}</p>
              <p className="text-[11px] font-mono text-zinc-400">{asset.serialNumber}</p>
            </div>
          ) : (
            <span className="text-zinc-400">{id}</span>
          )
        },
      },
      {
        id: 'interval',
        header: 'Interval',
        cell: ({ row }) => {
          const s = row.original
          const usage = isUsageInterval(s.intervalUnit)
          return (
            <div>
              <span className="text-[13px] text-zinc-700">
                Every {s.intervalValue} {INTERVAL_UNIT_LABEL[s.intervalUnit]}
              </span>
              {usage && (
                <p className="text-[10.5px] text-zinc-400 uppercase tracking-wide mt-0.5">meter-based</p>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'lastServiceDate',
        header: 'Last Service',
        cell: ({ row }) => {
          const s = row.original
          if (isUsageInterval(s.intervalUnit) && s.lastServiceMeter !== undefined) {
            return (
              <div>
                <p className="text-[13px] text-zinc-700">
                  {s.lastServiceMeter} {INTERVAL_UNIT_LABEL[s.intervalUnit]}
                </p>
                <p className="text-[10.5px] text-zinc-400">{format(parseISO(s.lastServiceDate), 'MMM dd, yyyy')}</p>
              </div>
            )
          }
          return (
            <span className="text-[13px] text-zinc-600">
              {format(parseISO(s.lastServiceDate), 'MMM dd, yyyy')}
            </span>
          )
        },
      },
      {
        accessorKey: 'nextServiceDate',
        header: 'Next Service',
        cell: ({ row }) => {
          const s = row.original
          if (isUsageInterval(s.intervalUnit) && s.lastServiceMeter !== undefined) {
            const triggerAt = s.lastServiceMeter + s.intervalValue
            const asset = assetMap[s.assetId]
            const current = asset?.currentMeter
            const remaining = current !== undefined ? triggerAt - current : null
            const dueNow = remaining !== null && remaining <= 0
            return (
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-zinc-700">
                  {triggerAt} {INTERVAL_UNIT_LABEL[s.intervalUnit]}
                </span>
                {s.status === 'active' && remaining !== null && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-[10.5px] font-medium',
                      dueNow ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600',
                    )}
                  >
                    {dueNow
                      ? `${Math.abs(remaining)} over`
                      : `${remaining} ${INTERVAL_UNIT_LABEL[s.intervalUnit]} to go`}
                  </span>
                )}
              </div>
            )
          }
          const next = s.nextServiceDate
          const days = differenceInCalendarDays(parseISO(next), new Date())
          const overdue = days < 0
          const due = days <= 0 && s.status === 'active'
          return (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-zinc-700">{format(parseISO(next), 'MMM dd, yyyy')}</span>
              {s.status === 'active' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-md text-[10.5px] font-medium',
                    overdue
                      ? 'bg-red-50 text-red-700'
                      : due
                      ? 'bg-amber-50 text-amber-700'
                      : days <= 7
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-zinc-100 text-zinc-600',
                  )}
                >
                  {overdue
                    ? `${Math.abs(days)}d overdue`
                    : days === 0
                    ? 'Today'
                    : days === 1
                    ? 'Tomorrow'
                    : `in ${days}d`}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'defaultAssigneeId',
        header: 'Technician',
        cell: ({ getValue }) => {
          const user = userMap[getValue() as string]
          return user ? (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} size="sm" />
              <span className="text-[13px] text-zinc-700">{user.name}</span>
            </div>
          ) : (
            <span className="text-zinc-400">—</span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const v = getValue() as ScheduleStatus
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize',
                statusStyles[v],
              )}
            >
              {v}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const s = row.original
          const dueNow = isScheduleDue(s)
          const items: ActionMenuItem[] = [
            {
              key: 'edit',
              label: 'Edit schedule',
              icon: Pencil,
              onClick: () => {
                setEditing(s)
                setShowForm(true)
              },
            },
            ...(s.status === 'active'
              ? [
                  {
                    key: 'generate',
                    label: dueNow ? 'Generate work order now' : 'Generate now (force)',
                    icon: Wrench,
                    disabled: generateMutation.isPending,
                    onClick: () => generateMutation.mutate({ id: s.id, force: !dueNow }),
                  },
                  {
                    key: 'pause',
                    label: 'Pause schedule',
                    icon: Pause,
                    onClick: () => setStatusMutation.mutate({ id: s.id, status: 'paused' }),
                  },
                ]
              : [
                  {
                    key: 'resume',
                    label: 'Resume schedule',
                    icon: Play,
                    onClick: () => setStatusMutation.mutate({ id: s.id, status: 'active' }),
                  },
                ]),
          ]
          return (
            <div className="flex items-center justify-end">
              <ActionMenu items={items} />
            </div>
          )
        },
      },
    ],
    [assetMap, userMap, vehicleByAssetId, today, generateMutation, setStatusMutation],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={9} rows={6} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search schedules...' }}
        filter={<FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={schedules as unknown as Record<string, unknown>[]}
          baseFilename="preventive-schedules"
          sheetName="PM Schedules"
          pdfTitle="Preventive Maintenance Schedules"
          columns={[
            { key: 'id', label: 'Schedule' },
            { key: 'title', label: 'Title' },
            { key: 'assetId', label: 'Asset' },
            { key: 'intervalValue', label: 'Interval' },
            { key: 'intervalUnit', label: 'Unit' },
            { key: 'lastServiceDate', label: 'Last Service' },
            { key: 'nextServiceDate', label: 'Next Service' },
            { key: 'priority', label: 'Priority' },
            { key: 'status', label: 'Status' },
          ]}
        />
        <Button
          variant="outline"
          leftIcon={<CalendarClock className="w-4 h-4" />}
          onClick={handleGenerateAllDue}
          disabled={dueCount === 0}
        >
          Generate Due {dueCount > 0 ? `(${dueCount})` : ''}
        </Button>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
        >
          New Schedule
        </Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={CalendarClock}
        emptyMessage="No preventive schedules match your filters"
      />

      <ScheduleFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        schedule={editing}
        onSaved={invalidate}
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Truck, Zap, Fuel, Plus, ClipboardList } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ChecklistPanel } from '@/shared/checklists'
import { format, parseISO } from 'date-fns'
import { useVehicles } from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import type { Vehicle, VehicleStatus, FuelType } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { StatusBadge } from '@/shared/ui/status-badge'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { VehicleFormModal } from '@/features/fleet/components/vehicle-form-modal'
import { VehicleDetailDrawer } from '@/features/fleet/components/vehicle-detail-drawer'
import { VehicleThumbnail } from '@/features/fleet/components/vehicle-thumbnail'

const statusFilters: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
]

const fuelIcon: Record<FuelType, typeof Fuel> = {
  petrol: Fuel,
  diesel: Fuel,
  electric: Zap,
}

export function VehiclesTab() {
  const { data: vehicles = [], isLoading } = useVehicles()
  const { data: drivers = [] } = useDrivers()

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers])

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedVehicleId = searchParams.get('vehicle')

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [inspectionVehicle, setInspectionVehicle] = useState<Vehicle | null>(null)

  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) ?? null : null),
    [selectedVehicleId, vehicles],
  )

  // Drawer is open whenever the URL carries a valid ?vehicle= for a known
  // vehicle. The data may arrive after the URL (vehicles is loading), so we
  // gate on vehicles.length too — otherwise the drawer flashes-empty on
  // direct navigation from the dashboard.
  const drawerOpen = !!selectedVehicle

  const filtered = useMemo(
    () => statusFilter === 'all' ? vehicles : vehicles.filter((v) => v.status === statusFilter),
    [vehicles, statusFilter],
  )

  const openVehicle = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('vehicle', id)
      return next
    }, { replace: false })
  }

  const closeDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('vehicle')
      return next
    }, { replace: false })
  }

  // Stop the row click from re-firing on action-column clicks.
  const stopRowClick = (e: React.MouseEvent) => e.stopPropagation()

  const columns = useMemo<ColumnDef<Vehicle>[]>(() => [
    { accessorKey: 'plateNumber', header: 'Plate', cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <VehicleThumbnail size="sm" imageUrl={row.original.photoUrl} alt={row.original.model} />
        <div>
          <p className="font-mono text-[13px] font-medium text-zinc-900">{row.original.plateNumber}</p>
          <p className="text-xs text-zinc-400">{row.original.model} · {row.original.year}</p>
        </div>
      </div>
    )},
    { accessorKey: 'fuelType', header: 'Fuel', cell: ({ getValue }) => {
      const v = getValue() as FuelType
      const Icon = fuelIcon[v]
      return <span className="inline-flex items-center gap-1.5 capitalize text-zinc-700"><Icon className="w-3.5 h-3.5 text-zinc-400" />{v}</span>
    }},
    { accessorKey: 'currentOdometer', header: 'Odometer', cell: ({ getValue }) => <span className="tabular-nums text-zinc-700">{(getValue() as number).toLocaleString()} km</span> },
    { accessorKey: 'assignedDriverId', header: 'Driver', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? (driverMap[v]?.name ?? '—') : <span className="text-zinc-400">Unassigned</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'createdAt', header: 'Registered', cell: ({ getValue }) => format(parseISO(getValue() as string), 'MMM yyyy') },
    { id: 'actions', header: '', cell: ({ row }) => {
      const vehicle = row.original
      if (!vehicle.checklistId) return null
      return (
        <div className="flex items-center gap-1" onClick={stopRowClick}>
          <button
            onClick={() => setInspectionVehicle(vehicle)}
            title="Pre-trip inspection"
            className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          ><ClipboardList className="w-4 h-4" /></button>
        </div>
      )
    }},
  ], [driverMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  // Defer cleanup of stale ?vehicle= until vehicles have loaded — otherwise we
  // wipe the param mid-fetch and break direct deep-link navigation.
  useEffect(() => {
    if (isLoading) return
    if (selectedVehicleId && !selectedVehicle) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('vehicle')
        return next
      }, { replace: true })
    }
  }, [isLoading, selectedVehicleId, selectedVehicle, setSearchParams])

  if (isLoading) return <TableSkeleton columns={6} rows={5} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search vehicles...' }}
        filter={<FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={vehicles as unknown as Record<string, unknown>[]}
          baseFilename="vehicles"
          sheetName="Vehicles"
          pdfTitle="Fleet Vehicles"
          columns={[
            { key: 'plateNumber', label: 'Plate' },
            { key: 'model', label: 'Model' },
            { key: 'year', label: 'Year' },
            { key: 'fuelType', label: 'Fuel' },
            { key: 'currentOdometer', label: 'Odometer' },
            { key: 'status', label: 'Status' },
            { key: 'assignedDriverId', label: 'Driver' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setEditingVehicle(null); setShowForm(true) }}>
          Register Vehicle
        </Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Truck}
        emptyMessage="No vehicles match your filters"
        onRowClick={(vehicle) => openVehicle(vehicle.id)}
      />

      <VehicleDetailDrawer
        open={drawerOpen}
        vehicle={selectedVehicle}
        onClose={closeDrawer}
        onEdit={(v) => {
          setEditingVehicle(v)
          setShowForm(true)
        }}
      />

      <VehicleFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingVehicle(null) }}
        vehicle={editingVehicle}
        onSaved={(v) => {
          // After registering a brand-new vehicle, jump straight into its drawer
          // so the user can add a driver / linked asset / checklist.
          if (!editingVehicle) openVehicle(v.id)
        }}
      />

      <Modal
        open={!!inspectionVehicle}
        onClose={() => setInspectionVehicle(null)}
        title={
          inspectionVehicle
            ? `Pre-trip Inspection · ${inspectionVehicle.plateNumber}`
            : 'Pre-trip Inspection'
        }
        size="lg"
      >
        {inspectionVehicle && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              {inspectionVehicle.model} · {inspectionVehicle.year}
            </p>
            <ChecklistPanel
              templateId={inspectionVehicle.checklistId}
              assignedToUserId={inspectionVehicle.assignedDriverId}
            />
          </div>
        )}
      </Modal>

    </div>
  )
}

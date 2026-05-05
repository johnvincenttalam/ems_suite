import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useInventoryItems } from '@/features/inventory'
import { useAssets } from '@/features/assets'
import { useRequests } from '@/features/procurement'
import { useWorkOrders } from '@/features/maintenance'
import { useDocuments } from '@/features/documents'
import { useFuelLogs, useTrips, useVehicles } from '@/features/fleet'
import { useTrackingLogs } from '@/features/tracking'
import { useDepartments } from '@/features/departments'
import { useWarehouses } from '@/features/warehouses'
import { useSuppliers } from '@/features/suppliers'
import { useUsers } from '@/features/users'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'

interface DatasetCard {
  id: string
  name: string
  count: number
  download: () => void
}

export function ImportExportTab() {
  const { data: items = [] } = useInventoryItems()
  const { data: assets = [] } = useAssets()
  const { data: requests = [] } = useRequests()
  const { data: workOrders = [] } = useWorkOrders()
  const { data: documents = [] } = useDocuments()
  const { data: fuelLogs = [] } = useFuelLogs()
  const { data: trips = [] } = useTrips()
  const { data: vehicles = [] } = useVehicles()
  const { data: scans = [] } = useTrackingLogs()
  const { data: departments = [] } = useDepartments()
  const { data: warehouses = [] } = useWarehouses()
  const { data: suppliers = [] } = useSuppliers()
  const { data: users = [] } = useUsers()

  const [importPreview, setImportPreview] = useState<{ name: string; size: number; rows: number } | null>(null)

  const datasets: DatasetCard[] = [
    { id: 'items',     name: 'Inventory Items',     count: items.length,     download: () => exportToCSV(items, 'inventory-items', Object.keys(items[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'assets',    name: 'Assets',              count: assets.length,    download: () => exportToCSV(assets, 'assets', Object.keys(assets[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'requests',  name: 'Procurement Requests', count: requests.length, download: () => exportToCSV(requests, 'requests', Object.keys(requests[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'wo',        name: 'Work Orders',         count: workOrders.length, download: () => exportToCSV(workOrders, 'work-orders', Object.keys(workOrders[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'documents', name: 'Documents',           count: documents.length, download: () => exportToCSV(documents, 'documents', Object.keys(documents[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'vehicles',  name: 'Vehicles',            count: vehicles.length,  download: () => exportToCSV(vehicles, 'vehicles', Object.keys(vehicles[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'trips',     name: 'Trips',               count: trips.length,     download: () => exportToCSV(trips, 'trips', Object.keys(trips[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'fuelLogs',  name: 'Fuel Logs',           count: fuelLogs.length,  download: () => exportToCSV(fuelLogs, 'fuel-logs', Object.keys(fuelLogs[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'scans',     name: 'Tracking Scans',      count: scans.length,     download: () => exportToCSV(scans, 'tracking-logs', Object.keys(scans[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'depts',     name: 'Departments',         count: departments.length, download: () => exportToCSV(departments, 'departments', Object.keys(departments[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'whs',       name: 'Warehouses',          count: warehouses.length, download: () => exportToCSV(warehouses, 'warehouses', Object.keys(warehouses[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'suppliers', name: 'Suppliers',           count: suppliers.length, download: () => exportToCSV(suppliers, 'suppliers', Object.keys(suppliers[0] ?? {}).map((k) => ({ key: k, label: k }))) },
    { id: 'users',     name: 'Users',               count: users.length,     download: () => exportToCSV(users, 'users', Object.keys(users[0] ?? {}).map((k) => ({ key: k, label: k }))) },
  ]

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '')
      const lines = text.split('\n').filter((l) => l.trim().length > 0)
      const rows = Math.max(0, lines.length - 1)
      setImportPreview({ name: file.name, size: file.size, rows })
      toast.success(`Parsed ${rows} rows from ${file.name}`)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Export</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <p className="text-[13px] text-zinc-500 mb-4">Download any dataset as CSV. All current rows are included.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {datasets.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={d.download}
                className="text-left bg-white rounded-lg border border-zinc-200/60 px-4 py-3 hover:border-zinc-400 hover:shadow-sm transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900">{d.name}</p>
                  <p className="text-[11px] text-zinc-400 tabular-nums">{d.count.toLocaleString()} rows</p>
                </div>
                <Download className="w-4 h-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <p className="text-[13px] text-zinc-500">
            Pick a CSV to preview row count. Real ingest happens server-side — wire this up to your <code className="px-1 py-0.5 rounded bg-zinc-100 text-[11px] font-mono">/api/imports</code> endpoint.
          </p>
          <label className="border border-dashed border-zinc-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-zinc-400 transition-colors cursor-pointer block">
            <Upload className="w-6 h-6 text-zinc-400 mb-2" />
            <p className="text-[13px] text-zinc-700 font-medium">Click to select a CSV</p>
            <p className="text-[11px] text-zinc-400 mt-1">UTF-8 encoded, comma-delimited, first row = header</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>

          {importPreview && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-emerald-900">{importPreview.name}</p>
                <p className="text-[12px] text-emerald-700 tabular-nums">{importPreview.rows} rows · {(importPreview.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button size="sm" onClick={() => toast.info('Mock import — wire up /api/imports to commit')}>Confirm Import</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

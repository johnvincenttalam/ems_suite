import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useAssets } from '@/features/assets'
import { useInventoryItems } from '@/features/inventory'
import { useRequests } from '@/features/procurement'
import { useWorkOrders } from '@/features/maintenance'
import { useDepartments } from '@/features/departments'
import { useWarehouses } from '@/features/warehouses'
import { useCategories } from '@/features/categories'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { Select } from '@/shared/ui/select'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { countBy } from '@/features/reports/utils/aggregate'

type ReportKey = 'assets-by-location' | 'assets-by-category' | 'inventory-by-warehouse' | 'requests-by-department' | 'work-orders-by-priority'

const reports: { value: ReportKey; label: string }[] = [
  { value: 'assets-by-location', label: 'Assets by Location' },
  { value: 'assets-by-category', label: 'Assets by Category' },
  { value: 'inventory-by-warehouse', label: 'Inventory Items by Warehouse' },
  { value: 'requests-by-department', label: 'Procurement Requests by Department' },
  { value: 'work-orders-by-priority', label: 'Work Orders by Priority' },
]

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

export function DrillDownTab() {
  const [report, setReport] = useState<ReportKey>('assets-by-location')

  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: items = [] } = useInventoryItems()
  const { data: requests = [] } = useRequests()
  const { data: workOrders = [] } = useWorkOrders()
  const { data: departments = [] } = useDepartments()
  const { data: warehouses = [] } = useWarehouses()
  const { data: categories = [] } = useCategories()

  const chartData = useMemo(() => {
    const labelize = (name: string) => name
    if (report === 'assets-by-location') {
      const counts = countBy(assets, (a) => warehouses.find((w) => w.id === a.locationId)?.name ?? a.locationId)
      return Object.entries(counts).map(([name, value]) => ({ name: labelize(name), value }))
    }
    if (report === 'assets-by-category') {
      const counts = countBy(assets, (a) => categories.find((c) => c.id === a.categoryId)?.name ?? a.categoryId)
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }
    if (report === 'inventory-by-warehouse') {
      const counts = countBy(items, (i) => warehouses.find((w) => w.id === i.warehouseId)?.name ?? i.warehouseId)
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }
    if (report === 'requests-by-department') {
      const counts = countBy(requests, (r) => departments.find((d) => d.id === r.departmentId)?.name ?? r.departmentId)
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }
    if (report === 'work-orders-by-priority') {
      const counts = countBy(workOrders, (w) => w.priority)
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }
    return []
  }, [report, assets, items, requests, workOrders, departments, warehouses, categories])

  if (assetsLoading) return <TableSkeleton columns={2} rows={3} />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Drill-Down</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-6 pt-0">
          <div className="max-w-md">
            <Select label="Report" value={report} onChange={(e) => setReport(e.target.value as ReportKey)} options={reports} />
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={false} tickLine={false} width={180} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Slice</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Count</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody>
                {chartData.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-[13px] text-zinc-400">No data</td></tr>
                ) : (() => {
                  const total = chartData.reduce((s, d) => s + d.value, 0)
                  return chartData.sort((a, b) => b.value - a.value).map((row) => (
                    <tr key={row.name} className="border-b border-zinc-100/60 last:border-b-0">
                      <td className="px-4 py-3 text-sm text-zinc-700 capitalize">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums font-medium text-zinc-900">{row.value}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-zinc-500">{total === 0 ? '0%' : `${Math.round((row.value / total) * 100)}%`}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { AlertTriangle, Boxes, Package, ShoppingCart, Wrench, FolderOpen, Truck, ListChecks } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useReportsData } from '@/features/reports/hooks/use-reports-data'
import { formatCurrency, formatCompactCurrency } from '@/shared/utils/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  maintenance: '#f59e0b',
  disposed: '#71717a',
  retired: '#71717a',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

interface KpiTileProps {
  icon: typeof Boxes
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'warn' | 'danger'
}

function KpiTile({ icon: Icon, label, value, hint, tone = 'default' }: KpiTileProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-4">
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          tone === 'warn' ? 'bg-amber-50 text-amber-600' :
          tone === 'danger' ? 'bg-red-50 text-red-600' :
          'bg-zinc-100 text-zinc-500',
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{label}</p>
          <p className={cn(
            'text-xl font-semibold tabular-nums mt-0.5',
            tone === 'warn' ? 'text-amber-700' :
            tone === 'danger' ? 'text-red-700' :
            'text-zinc-900',
          )}>{value}</p>
          {hint && <p className="text-[11px] text-zinc-400 mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

export function OverviewTab() {
  const data = useReportsData()

  if (data.isLoading) return <TableSkeleton columns={4} rows={3} />

  const k = data.kpis

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiTile icon={Boxes} label="Inventory Value" value={formatCompactCurrency(k.inventoryValue)} hint={`${k.lowStockCount} item${k.lowStockCount === 1 ? '' : 's'} low`} tone={k.lowStockCount > 0 ? 'warn' : 'default'} />
        <KpiTile icon={Package} label="Active Assets" value={k.activeAssets} hint={`${k.assetsInMaintenance} in maintenance`} />
        <KpiTile icon={ShoppingCart} label="Approved Spend" value={formatCompactCurrency(k.monthSpend)} hint={`${k.pendingRequests} pending`} />
        <KpiTile icon={Wrench} label="Overdue Work Orders" value={k.overdueWorkOrders} tone={k.overdueWorkOrders > 0 ? 'danger' : 'default'} />
        <KpiTile icon={FolderOpen} label="Docs in Review" value={k.docsInReview} />
        <KpiTile icon={Truck} label="Trips in Progress" value={k.tripsInProgress} />
        <KpiTile icon={ListChecks} label="Checklist Completion" value={`${k.checklistsCompletedRate}%`} />
        <KpiTile icon={AlertTriangle} label="Low Stock Items" value={k.lowStockCount} tone={k.lowStockCount > 0 ? 'warn' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Procurement Spend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data.monthlySpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Spend']} />
                  <Bar dataKey="spend" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.assetStatusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.assetStatusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#a1a1aa'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Items Below Reorder Level</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.lowStockItems.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-zinc-500">No items below reorder level</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Reorder</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowStockItems.map((item) => {
                    const gap = item.quantity - item.reorderLevel
                    return (
                      <tr key={item.id} className="border-b border-zinc-100/60 last:border-b-0">
                        <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">{item.sku}</td>
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-amber-700 font-medium">{item.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-zinc-500">{item.reorderLevel.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-red-600 font-medium">{gap}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

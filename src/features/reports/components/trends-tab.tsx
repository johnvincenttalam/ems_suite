import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useReportsData } from '@/features/reports/hooks/use-reports-data'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

export function TrendsTab() {
  const data = useReportsData()

  if (data.isLoading) return <TableSkeleton columns={2} rows={3} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={data.maintenanceByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}%`, 'Completion']} />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Fuel Cost</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={data.weeklyFuel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => name === 'cost' ? [formatCurrency(Number(v)), 'Cost'] : [`${Number(v)} L`, 'Liters']} />
                  <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.18} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Scan Volume — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data.dailyScans}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Procurement Funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data.procurementFunnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Movements This Month</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.movementsByType.map(({ name, value }) => (
              <div key={name} className="rounded-lg border border-zinc-200/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{name}</p>
                <p className="text-2xl font-semibold tabular-nums text-zinc-900 mt-1">{value}</p>
              </div>
            ))}
            {data.movementsByType.length === 0 && (
              <p className="text-[13px] text-zinc-500 col-span-full text-center py-4">No movements this month</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

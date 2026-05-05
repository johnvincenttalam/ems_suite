import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  ArrowLeft, Pencil, Trash2, Printer, Mail, Phone, MapPin, Package, CreditCard,
  TrendingUp, Clock, CheckCircle2, UserCircle, MessageSquare, FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Avatar } from '@/shared/ui/avatar'
import { Tabs } from '@/shared/ui/tabs'
import { EmptyState } from '@/shared/ui/empty-state'
import { mockOrders, type Order } from '@/features/orders'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

const historyEvents = (order: Order) => [
  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Order completed', time: new Date(order.createdAt), body: 'Delivery confirmed by customer.' },
  { icon: Package,      color: 'text-blue-600',    bg: 'bg-blue-50',    title: 'Package shipped', time: new Date(new Date(order.createdAt).getTime() - 1 * 86400000), body: 'Tracking #1Z999AA10123456784' },
  { icon: CreditCard,   color: 'text-violet-600',  bg: 'bg-violet-50',  title: 'Payment received', time: new Date(new Date(order.createdAt).getTime() - 2 * 86400000), body: `${formatCurrency(order.amount)} via credit card` },
  { icon: FileText,     color: 'text-zinc-500',    bg: 'bg-zinc-100',   title: 'Order placed', time: new Date(new Date(order.createdAt).getTime() - 3 * 86400000), body: `${order.items} item${order.items === 1 ? '' : 's'}` },
]

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  const order = mockOrders.find((o) => o.id === id)

  if (!order) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            title="Order not found"
            description="The order you're looking for doesn't exist or has been removed."
            action={<Button onClick={() => navigate('/admin/table')} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back to table</Button>}
          />
        </CardContent>
      </Card>
    )
  }

  const related = mockOrders.filter((o) => o.customer === order.customer && o.id !== order.id).slice(0, 5)
  const events = historyEvents(order)

  return (
    <div>
      {/* Back link */}
      <Link to="/admin/table" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to orders
      </Link>

      {/* Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-zinc-900 font-mono">{order.reference}</h1>
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.priority} />
                </div>
                <p className="text-[13px] text-zinc-500 mt-1">
                  Placed {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })} · {order.region}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />}>Print</Button>
              <Button variant="outline" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
              <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => {
                toast.success('Order deleted')
                navigate('/admin/table')
              }}>Delete</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        items={[
          { label: 'Overview', value: 'overview' },
          { label: 'Related', value: 'related', count: related.length },
          { label: 'History', value: 'history', count: events.length },
          { label: 'Notes', value: 'notes' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <dl className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <dt className="text-[11px] text-zinc-400 uppercase tracking-wide">Amount</dt>
                    <dd className="text-sm font-semibold text-zinc-900 mt-1">{formatCurrency(order.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-400 uppercase tracking-wide">Items</dt>
                    <dd className="text-sm text-zinc-700 mt-1">{order.items}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-400 uppercase tracking-wide">Created</dt>
                    <dd className="text-sm text-zinc-700 mt-1">{format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-400 uppercase tracking-wide">Region</dt>
                    <dd className="text-sm text-zinc-700 mt-1">{order.region}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-zinc-50/50 border-y border-zinc-100">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-[11px] font-medium text-zinc-400 uppercase">Product</th>
                      <th className="px-6 py-2.5 text-right text-[11px] font-medium text-zinc-400 uppercase">Qty</th>
                      <th className="px-6 py-2.5 text-right text-[11px] font-medium text-zinc-400 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.min(order.items, 3) }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-100/60">
                        <td className="px-6 py-3 text-[13px] text-zinc-700">Sample Product {i + 1}</td>
                        <td className="px-6 py-3 text-[13px] text-zinc-600 text-right">1</td>
                        <td className="px-6 py-3 text-[13px] text-zinc-700 text-right font-medium">
                          {formatCurrency(order.amount / Math.min(order.items, 3))}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-[13px] text-zinc-500 text-right">Total</td>
                      <td className="px-6 py-3 text-sm font-semibold text-zinc-900 text-right">{formatCurrency(order.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Right: customer + stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={order.customer} size="lg" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{order.customer}</p>
                    <Badge variant="outline" size="sm">Customer</Badge>
                  </div>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate">{order.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>+1 555 000 0000</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{order.region}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" fullWidth className="mt-4" leftIcon={<UserCircle className="w-3.5 h-3.5" />}>
                  View Customer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metrics</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-500 inline-flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Lifetime value</span>
                  <span className="text-[13px] font-semibold text-zinc-900">
                    {formatCurrency(mockOrders.filter((o) => o.customer === order.customer).reduce((sum, o) => sum + o.amount, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-500 inline-flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Total orders</span>
                  <span className="text-[13px] font-semibold text-zinc-900">
                    {mockOrders.filter((o) => o.customer === order.customer).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-500 inline-flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> First order</span>
                  <span className="text-[13px] font-medium text-zinc-700">
                    {format(
                      new Date(Math.min(...mockOrders.filter((o) => o.customer === order.customer).map((o) => new Date(o.createdAt).getTime()))),
                      'MMM yyyy'
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'related' && (
        <Card>
          <CardHeader>
            <CardTitle>Other orders from {order.customer}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {related.length === 0 ? (
              <EmptyState title="No related orders" description="This customer has no other orders." />
            ) : (
              <ul>
                {related.map((r, i) => (
                  <li key={r.id} className={cn('flex items-center gap-4 px-6 py-3', i !== related.length - 1 && 'border-b border-zinc-100/60')}>
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/admin/table/${r.id}`} className="text-[13px] font-medium font-mono text-zinc-900 hover:text-blue-600">
                        {r.reference}
                      </Link>
                      <p className="text-[12px] text-zinc-400 mt-0.5">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })} · {r.items} item{r.items === 1 ? '' : 's'}
                      </p>
                    </div>
                    <StatusBadge status={r.status} size="sm" />
                    <span className="text-[13px] font-medium text-zinc-900 min-w-[80px] text-right">{formatCurrency(r.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <ol className="relative border-l border-zinc-200 ml-4 space-y-6">
              {events.map((e, i) => (
                <li key={i} className="pl-6 relative">
                  <div className={cn('absolute -left-[13px] top-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center', e.bg)}>
                    <e.icon className={cn('w-3 h-3', e.color)} />
                  </div>
                  <p className="text-[13px] font-medium text-zinc-900">{e.title}</p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">{format(e.time, 'MMM d, yyyy · h:mm a')}</p>
                  <p className="text-[13px] text-zinc-600 mt-1.5">{e.body}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {tab === 'notes' && (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={MessageSquare}
              title="No notes yet"
              description="Add internal notes about this order — they stay private to your team."
              action={<Button size="sm">Add Note</Button>}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

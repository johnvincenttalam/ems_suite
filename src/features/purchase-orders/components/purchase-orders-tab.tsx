import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { ClipboardList, Plus, Send, Ban } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  usePurchaseOrders,
  useSendPurchaseOrder,
  useCancelPurchaseOrder,
} from '@/features/purchase-orders'
import type { POStatus, PurchaseOrderWithItems } from '@/features/purchase-orders/types'
import { useSuppliers } from '@/features/suppliers'
import { useAuthStore } from '@/features/auth'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { StatusBadge } from '@/shared/ui/status-badge'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { formatCurrency } from '@/shared/utils/format'
import { CreatePOModal } from './create-po-modal'
import { PoDetailDrawer } from './po-detail-drawer'

const statusFilters: { value: POStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partially_received', label: 'Partial' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function PurchaseOrdersTab() {
  const { data: pos = [], isLoading } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()
  const currentUser = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [drawerPo, setDrawerPo] = useState<PurchaseOrderWithItems | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrderWithItems | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const sendMutation = useSendPurchaseOrder()
  const cancelMutation = useCancelPurchaseOrder()

  const deepLinkId = searchParams.get('po')
  useEffect(() => {
    if (!deepLinkId || pos.length === 0) return
    const target = pos.find((p) => p.id === deepLinkId)
    if (target) setDrawerPo(target)
  }, [deepLinkId, pos])

  const closeDrawer = () => {
    setDrawerPo(null)
    if (searchParams.has('po')) {
      const next = new URLSearchParams(searchParams)
      next.delete('po')
      setSearchParams(next, { replace: true })
    }
  }

  const filtered = useMemo(
    () => (statusFilter === 'all' ? pos : pos.filter((p) => p.status === statusFilter)),
    [pos, statusFilter],
  )

  function handleSend(po: PurchaseOrderWithItems) {
    if (!currentUser) return
    sendMutation.mutate(
      { id: po.id, actorId: currentUser.id },
      {
        onSuccess: () => toast.success(`${po.id} sent to supplier`),
        onError: (err) => toast.error('Send failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
      },
    )
  }

  function handleConfirmCancel() {
    if (!cancelTarget || !currentUser) return
    if (cancelReason.trim().length < 2) {
      toast.error('Reason is required')
      return
    }
    cancelMutation.mutate(
      { id: cancelTarget.id, reason: cancelReason.trim(), actorId: currentUser.id },
      {
        onSuccess: () => {
          toast.success(`${cancelTarget.id} cancelled`)
          setCancelTarget(null)
          setCancelReason('')
        },
        onError: (err) => toast.error('Cancel failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
      },
    )
  }

  const columns = useMemo<ColumnDef<PurchaseOrderWithItems>[]>(() => [
    { accessorKey: 'id', header: 'PO #', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span>
    )},
    { accessorKey: 'supplierId', header: 'Supplier', cell: ({ getValue }) => {
      const v = getValue() as string
      const s = supplierMap[v]
      return s ? <span className="text-[13px] text-zinc-700">{s.name}</span> : <span className="text-zinc-400">{v}</span>
    }},
    { accessorKey: 'requisitionId', header: 'Requisition', cell: ({ getValue }) => (
      <span className="font-mono text-[11px] text-zinc-500">{getValue() as string}</span>
    )},
    { id: 'lines', header: 'Lines', cell: ({ row }) => <span className="tabular-nums text-zinc-500">{row.original.items.length}</span> },
    { accessorKey: 'totalAmount', header: 'Total', cell: ({ getValue }) => (
      <span className="tabular-nums font-medium text-zinc-900">{formatCurrency(getValue() as number)}</span>
    )},
    { accessorKey: 'expectedDeliveryDate', header: 'Expected', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? <span className="text-zinc-600 whitespace-nowrap">{format(new Date(v), 'MMM dd, yyyy')}</span> : <span className="text-zinc-300">—</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} size="sm" /> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => (
      <span className="whitespace-nowrap">{format(new Date(getValue() as string), 'MMM dd, yyyy')}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => {
      const po = row.original
      const canSend = po.status === 'draft'
      const canCancel = po.status === 'draft' || po.status === 'ordered' || po.status === 'partially_received'
      return (
        <div className="flex items-center gap-1 justify-end">
          {canSend && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(po) }}
              title="Send to supplier"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          )}
          {canCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); setCancelTarget(po); setCancelReason('') }}
              title="Cancel PO"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-zinc-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>
      )
    }},
  ], [supplierMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={9} rows={6} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search purchase orders...' }}
        filter={<FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={pos as unknown as Record<string, unknown>[]}
          baseFilename="purchase-orders"
          sheetName="Purchase Orders"
          pdfTitle="Purchase Orders"
          columns={[
            { key: 'id', label: 'PO #' },
            { key: 'supplierId', label: 'Supplier' },
            { key: 'requisitionId', label: 'Requisition' },
            { key: 'totalAmount', label: 'Total' },
            { key: 'expectedDeliveryDate', label: 'Expected' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Created' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          New PO
        </Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={ClipboardList}
        emptyMessage="No purchase orders match your filters"
        onRowClick={(po) => setDrawerPo(po)}
      />

      <CreatePOModal open={showCreate} onClose={() => setShowCreate(false)} />

      <Modal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason('') }}
        title={`Cancel ${cancelTarget?.id ?? ''}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => { setCancelTarget(null); setCancelReason('') }} disabled={cancelMutation.isPending}>
              Keep PO
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmCancel} loading={cancelMutation.isPending} disabled={cancelReason.trim().length < 2}>
              Confirm Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Cancelling stops the supplier order. Any goods already received against this PO are kept on record.
          </p>
          <Textarea
            label="Reason *"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. supplier out of stock, budget reallocated…"
          />
        </div>
      </Modal>

      <PoDetailDrawer po={drawerPo} onClose={closeDrawer} />
    </div>
  )
}

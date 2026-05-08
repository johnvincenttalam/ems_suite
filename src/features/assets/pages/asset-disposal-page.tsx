import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ArrowDownToLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAssets, assetsApi, DISPOSAL_TYPE_LABELS } from '@/features/assets'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
import type { Asset, DisposalType } from '@/features/assets/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Tabs } from '@/shared/ui/tabs'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { StatCard } from '@/shared/ui/stat-card'
import { AssetDetailDrawer } from '@/features/assets/components/asset-detail-drawer'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

const DISPOSAL_TYPE_OPTIONS: { value: DisposalType; label: string }[] = [
  { value: 'sold', label: 'Sold' },
  { value: 'scrapped', label: 'Scrapped' },
  { value: 'donated', label: 'Donated' },
  { value: 'lost', label: 'Lost' },
  { value: 'traded_in', label: 'Traded In' },
]

const submitSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  type: z.enum(['sold', 'scrapped', 'donated', 'lost', 'traded_in'] as const),
  amount: z.number().min(0).optional(),
  disposedTo: z.string().optional(),
  disposedDate: z.string().min(1, 'Date is required'),
  reason: z.string().min(2, 'Reason is required'),
  approverName: z.string().min(1, 'Approver is required'),
})

type SubmitForm = z.infer<typeof submitSchema>

type DisposalTab = 'pending' | 'archive'

export function AssetDisposalPage() {
  const { data: assets = [], isLoading } = useAssets()
  const { data: users = [] } = useUsers()
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<DisposalTab>('pending')
  const [search, setSearch] = useState('')
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Asset | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const pending = useMemo(() => {
    return assets
      .filter((a) => a.status === 'retiring' && !!a.disposal)
      .filter((a) => !search.trim() || matches(a, search))
      .sort((a, b) => (b.disposal?.disposedDate ?? '').localeCompare(a.disposal?.disposedDate ?? ''))
  }, [assets, search])

  const archive = useMemo(() => {
    return assets
      .filter((a) => a.status === 'disposed' && !!a.disposal)
      // satisfies the audit fix #14 — never display a disposed row without payload
      .filter((a) => !!a.disposal)
      .filter((a) => !search.trim() || matches(a, search))
      .sort((a, b) => (b.disposal?.approvedAt ?? '').localeCompare(a.disposal?.approvedAt ?? ''))
  }, [assets, search])

  const stats = useMemo(() => {
    const allRetiring = assets.filter((a) => a.status === 'retiring')
    const disposed = assets.filter((a) => a.status === 'disposed')
    const recoveredValue = disposed.reduce((s, a) => s + (a.disposal?.amount ?? 0), 0)
    const myQueue = currentUser
      ? allRetiring.filter((a) => a.disposal?.pendingApproverName === currentUser.name).length
      : 0
    return {
      pendingCount: allRetiring.length,
      disposedCount: disposed.length,
      recoveredValue,
      myQueue,
    }
  }, [assets, currentUser])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const approveMutation = useMutation({
    mutationFn: (asset: Asset) => {
      if (!currentUser) throw new Error('Not signed in')
      return assetsApi.approveDisposal(asset.id, currentUser.name)
    },
    onSuccess: (asset) => {
      toast.success(`Disposal of ${asset.name} approved`)
      invalidate()
    },
    onError: (err) => toast.error('Approval failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ asset, reason }: { asset: Asset; reason: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return assetsApi.rejectDisposal(asset.id, currentUser.name, reason)
    },
    onSuccess: (asset) => {
      toast.success(`Disposal of ${asset.name} rejected — returned to active`)
      setRejectTarget(null)
      setRejectReason('')
      invalidate()
    },
    onError: (err) => toast.error('Rejection failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Disposal" subtitle="Pending disposals and the disposed-asset archive." />
        <TableSkeleton columns={6} rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Disposal"
        subtitle="Pending disposals awaiting approval and the disposed-asset archive."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowSubmit(true)}>
            Submit Disposal
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Approval" value={stats.pendingCount} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" index={0} />
        <StatCard title="Disposed Total" value={stats.disposedCount} icon={Trash2} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={1} />
        <StatCard title="Recovered Value" value={formatCurrency(stats.recoveredValue)} subtitle="Sale / scrap proceeds" icon={ArrowDownToLine} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={2} />
        <StatCard title="In Your Queue" value={stats.myQueue} subtitle={currentUser ? `Awaiting ${currentUser.name}` : 'Sign in to see'} icon={CheckCircle2} iconBg="bg-blue-50" iconColor="text-blue-600" index={3} />
      </div>

      <div className="mb-4">
        <Tabs
          items={[
            { value: 'pending', label: `Pending Approval${pending.length ? ` (${pending.length})` : ''}` },
            { value: 'archive', label: `Disposed Archive${archive.length ? ` (${archive.length})` : ''}` },
          ]}
          value={tab}
          onChange={(v) => setTab(v as DisposalTab)}
        />
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search assets..." />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        {tab === 'pending' ? (
          <PendingTable
            rows={pending}
            currentUserName={currentUser?.name}
            onOpenAsset={setActiveAsset}
            onApprove={(a) => approveMutation.mutate(a)}
            onReject={(a) => { setRejectTarget(a); setRejectReason('') }}
            isApproving={approveMutation.isPending}
            approvingId={approveMutation.variables?.id}
          />
        ) : (
          <ArchiveTable rows={archive} onOpenAsset={setActiveAsset} />
        )}
      </div>

      <AssetDetailDrawer
        open={!!activeAsset}
        asset={activeAsset}
        onClose={() => setActiveAsset(null)}
      />

      <SubmitDisposalModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        assets={assets}
        users={users}
        onDone={() => { setShowSubmit(false); invalidate() }}
      />

      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason('') }}
        title={`Reject disposal of ${rejectTarget?.name ?? ''}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            The asset returns to <span className="font-medium text-zinc-700">Active</span> status and the disposal record is cleared.
            The original submitter sees the rejection in the audit log.
          </p>
          <Textarea
            label="Reason *"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Still has resale value; recommend extending useful life"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setRejectTarget(null); setRejectReason('') }}
              disabled={rejectMutation.isPending}
            >
              Back
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={rejectMutation.isPending}
              disabled={rejectReason.trim().length < 2}
              onClick={() => rejectTarget && rejectMutation.mutate({ asset: rejectTarget, reason: rejectReason.trim() })}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// --- Sub-tables ----------------------------------------------------------

function PendingTable({
  rows,
  currentUserName,
  onOpenAsset,
  onApprove,
  onReject,
  isApproving,
  approvingId,
}: {
  rows: Asset[]
  currentUserName?: string
  onOpenAsset: (a: Asset) => void
  onApprove: (a: Asset) => void
  onReject: (a: Asset) => void
  isApproving: boolean
  approvingId?: string
}) {
  if (rows.length === 0) {
    return <DataTableEmpty colSpan={7} icon={CheckCircle2} message="No pending disposals — your queue is clear." />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-zinc-50/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Asset</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Submitted</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Awaits</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Reason</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const d = a.disposal!
            const canActOnThis = !!currentUserName && (!d.pendingApproverName || d.pendingApproverName === currentUserName)
            return (
              <tr key={a.id} className="border-b border-zinc-100/60 align-top">
                <td className="px-4 py-3 text-[13px] text-zinc-700">
                  <button
                    onClick={() => onOpenAsset(a)}
                    className="font-medium text-zinc-900 hover:underline cursor-pointer text-left"
                  >
                    {a.name}
                  </button>
                  <p className="text-[11px] text-zinc-400 font-mono">{a.assetCode}</p>
                </td>
                <td className="px-4 py-3 text-[12px] text-zinc-700">{DISPOSAL_TYPE_LABELS[d.type]}</td>
                <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-700 whitespace-nowrap">
                  {d.amount !== undefined ? formatCurrency(d.amount) : <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                  {format(parseISO(d.disposedDate), 'MMM d, yyyy')}
                  <span className="block text-[10.5px] text-zinc-400">{d.disposedBy}</span>
                </td>
                <td className="px-4 py-3 text-[12px] text-zinc-700 whitespace-nowrap">
                  {d.pendingApproverName ?? <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3 text-[12px] text-zinc-600 max-w-[260px]">
                  {d.reason}
                  {d.disposedTo && (
                    <span className="block text-[11px] text-zinc-500 mt-0.5">→ {d.disposedTo}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => onOpenAsset(a)}
                      title="View details"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canActOnThis && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          loading={isApproving && approvingId === a.id}
                          onClick={() => onApprove(a)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          onClick={() => onReject(a)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ArchiveTable({ rows, onOpenAsset }: { rows: Asset[]; onOpenAsset: (a: Asset) => void }) {
  if (rows.length === 0) {
    return <DataTableEmpty colSpan={6} icon={Trash2} message="No disposed assets in the archive yet." />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-zinc-50/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Asset</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Disposed To</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Approved</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const d = a.disposal!
            return (
              <tr key={a.id} className="border-b border-zinc-100/60">
                <td className="px-4 py-3 text-[13px] text-zinc-700">
                  <button
                    onClick={() => onOpenAsset(a)}
                    className="font-medium text-zinc-900 hover:underline cursor-pointer text-left"
                  >
                    {a.name}
                  </button>
                  <p className="text-[11px] text-zinc-400 font-mono">{a.assetCode}</p>
                </td>
                <td className="px-4 py-3 text-[12px] text-zinc-700">{DISPOSAL_TYPE_LABELS[d.type]}</td>
                <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-700 whitespace-nowrap">
                  {d.amount !== undefined ? formatCurrency(d.amount) : <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3 text-[12px] text-zinc-700">{d.disposedTo ?? <span className="text-zinc-400">—</span>}</td>
                <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                  {d.approvedAt ? format(parseISO(d.approvedAt), 'MMM d, yyyy') : <span className="text-zinc-400">—</span>}
                  {d.approvedBy && <span className="block text-[10.5px] text-zinc-400">{d.approvedBy}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onOpenAsset(a)}
                    title="View details"
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- Submit modal --------------------------------------------------------

function SubmitDisposalModal({
  open,
  onClose,
  assets,
  users,
  onDone,
}: {
  open: boolean
  onClose: () => void
  assets: Asset[]
  users: { id: string; name: string; status: string; position?: string; moduleAdmins: string[] }[]
  onDone: () => void
}) {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubmitForm>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      type: 'sold',
      disposedDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const submitMutation = useMutation({
    mutationFn: (data: SubmitForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return assetsApi.submitDisposal({
        assetId: data.assetId,
        type: data.type,
        amount: data.amount,
        disposedTo: data.disposedTo,
        disposedDate: data.disposedDate,
        reason: data.reason,
        approverName: data.approverName,
        submittedBy: currentUser.name,
      })
    },
    onSuccess: (asset) => {
      toast.success(`Disposal of ${asset.name} submitted — awaiting approval`)
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      reset({ type: 'sold', disposedDate: format(new Date(), 'yyyy-MM-dd') })
      onDone()
    },
    onError: (err) => toast.error('Submit failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const eligibleAssets = assets
    .filter((a) => a.status === 'active' || a.status === 'maintenance')
    .map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.name}` }))

  const approverOptions = users
    .filter((u) => u.status === 'active' && u.moduleAdmins.includes('assets') && u.name !== currentUser?.name)
    .map((u) => ({ value: u.name, label: u.name + (u.position ? ` — ${u.position}` : '') }))

  return (
    <Modal
      open={open}
      onClose={() => { reset({ type: 'sold', disposedDate: format(new Date(), 'yyyy-MM-dd') }); onClose() }}
      title="Submit Disposal"
      size="md"
    >
      <form
        onSubmit={handleSubmit((d) => submitMutation.mutate(d))}
        className="space-y-4"
      >
        <p className="text-[13px] text-zinc-500">
          Submitting moves the asset to <span className="font-medium text-zinc-700">Retiring</span>. The named approver finalizes the disposal — only on approval is the status flipped to Disposed.
        </p>
        <Select
          label="Asset *"
          {...register('assetId')}
          error={errors.assetId?.message}
          placeholder="Select asset"
          options={eligibleAssets}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Disposal Type *"
            {...register('type')}
            options={DISPOSAL_TYPE_OPTIONS}
            error={errors.type?.message}
          />
          <Input
            label="Disposal Date *"
            type="date"
            {...register('disposedDate')}
            error={errors.disposedDate?.message}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Disposal Amount"
            type="number"
            step="0.01"
            placeholder="e.g. sale proceeds"
            {...register('amount', { setValueAs: (v) => v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v) })}
          />
          <Input
            label="Disposed To"
            placeholder="e.g. EcoMetals Recycling"
            {...register('disposedTo')}
          />
        </div>
        <Select
          label="Approving Authority *"
          {...register('approverName')}
          placeholder="Select approver"
          options={approverOptions}
          error={errors.approverName?.message}
        />
        <Textarea
          label="Reason *"
          rows={3}
          {...register('reason')}
          error={errors.reason?.message}
          placeholder="e.g. Beyond economic repair"
        />
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => { reset({ type: 'sold', disposedDate: format(new Date(), 'yyyy-MM-dd') }); onClose() }}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="danger" fullWidth loading={submitMutation.isPending}>
            Submit for Approval
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// --- Helpers -------------------------------------------------------------

function matches(asset: Asset, search: string): boolean {
  const q = search.toLowerCase()
  return [
    asset.name,
    asset.assetCode,
    asset.serialNumber,
    asset.disposal?.reason ?? '',
    asset.disposal?.disposedTo ?? '',
    asset.disposal?.disposedBy ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

// Suppress unused-import notice when cn is referenced only in branches.
void cn
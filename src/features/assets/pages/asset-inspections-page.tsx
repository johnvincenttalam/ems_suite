import { useMemo, useState } from 'react'
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Plus,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { format, parseISO, subDays, isAfter } from 'date-fns'
import { useAssets, useAssetInspections } from '@/features/assets'
import type { Asset, Inspection, InspectionResult } from '@/features/assets/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { SearchInput } from '@/shared/ui/search-input'
import { FilterChips } from '@/shared/ui/filter-chips'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { StatCard } from '@/shared/ui/stat-card'
import { AssetDetailDrawer } from '@/features/assets/components/asset-detail-drawer'
import { cn } from '@/shared/utils/cn'

const RESULT_FILTERS: { value: InspectionResult | 'all' | 'fail-recent'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'fail-recent', label: 'Failed (30d)' },
]

const RESULT_PILL_STYLES: Record<InspectionResult, string> = {
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
  na: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const RESULT_LABELS: Record<InspectionResult, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
}

export function AssetInspectionsPage() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: inspections = [], isLoading: inspectionsLoading } = useAssetInspections()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])

  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<InspectionResult | 'all' | 'fail-recent'>('all')
  const [assetFilter, setAssetFilter] = useState<string>('')
  const [inspectorFilter, setInspectorFilter] = useState<string>('')
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'inspections'>('overview')
  const [showRecord, setShowRecord] = useState(false)
  const [recordAssetId, setRecordAssetId] = useState<string>('')

  const filtered = useMemo(() => {
    const today = new Date()
    const last30 = subDays(today, 30)
    return inspections.filter((insp) => {
      if (resultFilter === 'fail-recent') {
        if (insp.overallResult !== 'fail') return false
        if (!isAfter(parseISO(insp.inspectionDate), last30)) return false
      } else if (resultFilter !== 'all') {
        if (insp.overallResult !== resultFilter) return false
      }
      if (assetFilter && insp.assetId !== assetFilter) return false
      if (inspectorFilter && insp.inspector !== inspectorFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const asset = assetMap[insp.assetId]
        const haystack = [
          insp.id,
          asset?.name ?? '',
          asset?.assetCode ?? '',
          asset?.serialNumber ?? '',
          insp.inspector,
          insp.notes ?? '',
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [inspections, resultFilter, assetFilter, inspectorFilter, search, assetMap])

  const stats = useMemo(() => {
    const total = inspections.length
    const passed = inspections.filter((i) => i.overallResult === 'pass').length
    const failed = inspections.filter((i) => i.overallResult === 'fail').length
    const drafts = inspections.filter((i) => i.status === 'draft').length
    const last30 = subDays(new Date(), 30)
    const recentFailed = inspections.filter(
      (i) => i.overallResult === 'fail' && isAfter(parseISO(i.inspectionDate), last30),
    ).length
    return { total, passed, failed, drafts, recentFailed }
  }, [inspections])

  const inspectorOptions = useMemo(() => {
    const seen = new Set<string>()
    inspections.forEach((i) => seen.add(i.inspector))
    return [{ value: '', label: 'All inspectors' }, ...Array.from(seen).sort().map((n) => ({ value: n, label: n }))]
  }, [inspections])

  const assetOptions = useMemo(() => {
    return [
      { value: '', label: 'All assets' },
      ...assets.map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.name}` })),
    ]
  }, [assets])

  if (assetsLoading || inspectionsLoading) {
    return (
      <div>
        <PageHeader title="Inspections" subtitle="Asset inspections across the registry." />
        <TableSkeleton columns={6} rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Inspections"
        subtitle="Pass/fail inspections across the registry. Click any row to open the asset's detail drawer."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowRecord(true)}>
            Record Inspection
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total" value={stats.total} icon={ClipboardCheck} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={0} />
        <StatCard title="Passed" value={stats.passed} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={1} />
        <StatCard title="Failed" value={stats.failed} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600" index={2} />
        <StatCard title="Failed (30d)" value={stats.recentFailed} subtitle="Recent — needs follow-up" icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" index={3} />
        <StatCard title="Drafts" value={stats.drafts} icon={MinusCircle} iconBg="bg-blue-50" iconColor="text-blue-600" index={4} />
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search inspections..." />
          </div>
          <FilterChips options={RESULT_FILTERS} value={resultFilter} onChange={setResultFilter} />
        </div>
        <div className="flex gap-2">
          <Select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            options={assetOptions}
            className="min-w-[200px]"
          />
          <Select
            value={inspectorFilter}
            onChange={(e) => setInspectorFilter(e.target.value)}
            options={inspectorOptions}
            className="min-w-[180px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Inspector</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Result</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <DataTableEmpty colSpan={7} icon={ClipboardCheck} message={inspections.length === 0 ? 'No inspections yet — click Record Inspection to log one.' : 'No inspections match your filters.'} />
              ) : (
                filtered.map((insp) => (
                  <InspectionRow
                    key={insp.id}
                    inspection={insp}
                    asset={assetMap[insp.assetId]}
                    onOpenAsset={(a) => { setActiveAsset(a); setActiveTab('inspections') }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssetDetailDrawer
        open={!!activeAsset}
        asset={activeAsset}
        initialTab={activeTab}
        onClose={() => { setActiveAsset(null); setActiveTab('overview') }}
      />

      <Modal
        open={showRecord}
        onClose={() => { setShowRecord(false); setRecordAssetId('') }}
        title="Record Inspection"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Pick the asset to inspect — the asset's detail drawer opens to the Inspections tab where you can log the checklist.
          </p>
          <Select
            label="Asset *"
            value={recordAssetId}
            onChange={(e) => setRecordAssetId(e.target.value)}
            placeholder="Select asset"
            options={assets
              .filter((a) => a.status !== 'disposed')
              .map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.name}` }))}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setShowRecord(false); setRecordAssetId('') }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              disabled={!recordAssetId}
              onClick={() => {
                const a = assetMap[recordAssetId]
                if (a) {
                  setActiveAsset(a)
                  setActiveTab('inspections')
                  setShowRecord(false)
                  setRecordAssetId('')
                }
              }}
            >
              Open Asset
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

function InspectionRow({
  inspection,
  asset,
  onOpenAsset,
}: {
  inspection: Inspection
  asset?: Asset
  onOpenAsset: (a: Asset) => void
}) {
  const passed = inspection.lines.filter((l) => l.result === 'pass').length
  const failed = inspection.lines.filter((l) => l.result === 'fail').length
  const total = inspection.lines.length

  return (
    <tr
      className="border-b border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
      onClick={() => asset && onOpenAsset(asset)}
    >
      <td className="px-4 py-3 text-[11px] font-mono text-zinc-500">{inspection.id}</td>
      <td className="px-4 py-3 text-[13px] text-zinc-700">
        {asset ? (
          <>
            <p className="font-medium text-zinc-900">{asset.name}</p>
            <p className="text-[11px] text-zinc-400 font-mono">{asset.assetCode}</p>
          </>
        ) : (
          <span className="text-zinc-400">{inspection.assetId}</span>
        )}
      </td>
      <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
        {format(parseISO(inspection.inspectionDate), 'MMM d, yyyy')}
        {inspection.status === 'draft' && (
          <span className="block text-[10.5px] text-amber-600">Draft</span>
        )}
      </td>
      <td className="px-4 py-3 text-[12px] text-zinc-700">{inspection.inspector}</td>
      <td className="px-4 py-3 text-[12px] text-zinc-600 whitespace-nowrap">
        <span className="text-emerald-700">{passed} pass</span>
        {failed > 0 && (
          <>
            {' · '}
            <span className="text-red-700">{failed} fail</span>
          </>
        )}
        <span className="text-zinc-400">{' / '}{total}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium', RESULT_PILL_STYLES[inspection.overallResult])}>
          {RESULT_LABELS[inspection.overallResult]}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); if (asset) onOpenAsset(asset) }}
          title="Open asset details"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
        >
          <Eye className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

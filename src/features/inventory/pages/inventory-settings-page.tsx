import { useState } from 'react'
import { Settings as SettingsIcon, Bell, ArrowLeftRight, AlertTriangle, RotateCcw, ScanLine, Sliders } from 'lucide-react'
import { ModuleAdminGuard } from '@/features/auth'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'
import { useWarehouses } from '@/features/warehouses'
import { useUom } from '@/features/uom'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Stock Thresholds', value: 'thresholds', icon: AlertTriangle },
  { label: 'System Preferences', value: 'preferences', icon: Sliders },
  { label: 'Movement Rules', value: 'movements', icon: ArrowLeftRight },
  { label: 'Defaults', value: 'defaults', icon: ScanLine },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

const CURRENCIES = [
  { value: 'PHP', label: 'PHP — Philippine Peso' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
]

export function InventorySettingsPage() {
  return (
    <ModuleAdminGuard moduleKey="inventory" pageLabel="Inventory Settings">
      <InventorySettingsPageInner />
    </ModuleAdminGuard>
  )
}

function InventorySettingsPageInner() {
  const { settings, update, updateNotify, reset } = useInventorySettings()
  const { data: warehouses = [] } = useWarehouses()
  const { data: uoms = [] } = useUom()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  const warehouseOptions = [
    { value: '', label: 'No default — pick at submit' },
    ...warehouses.map((w) => ({ value: w.id, label: w.name })),
  ]
  const uomOptions = [
    { value: '', label: 'No default' },
    ...uoms.map((u) => ({ value: u.id, label: u.name })),
  ]

  return (
    <div>
      <PageHeader
        title="Inventory Settings"
        subtitle="Configure thresholds, system preferences, movement rules, and alert behavior."
        actions={
          <Button
            variant="outline"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              reset()
              toast.success('Settings reset to defaults')
            }}
          >
            Reset to defaults
          </Button>
        }
      />

      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-56 flex lg:flex-col gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                activeTab === tab.value ? 'bg-accent text-accent-fg' : 'text-zinc-600 hover:bg-zinc-100',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-2xl">
          {activeTab === 'general' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Item Defaults</h3>
                <Input
                  label="Default reorder level"
                  type="number"
                  min={0}
                  value={settings.defaultReorderLevel}
                  onChange={(e) =>
                    update({ defaultReorderLevel: Math.max(0, Number(e.target.value) || 0) })
                  }
                  helperText="Used when creating a new item if no per-item override is set"
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'thresholds' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Stock Thresholds</h3>
                <Input
                  label="Reorder Level Warning (%)"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.reorderWarningPercent}
                  onChange={(e) => {
                    const next = clampPct(Number(e.target.value), 1, 100, 80)
                    if (next < settings.criticalPercent) {
                      update({ reorderWarningPercent: next, criticalPercent: next })
                    } else {
                      update({ reorderWarningPercent: next })
                    }
                  }}
                  helperText="Stock at or below this percent of reorder level triggers a warning. Default 80%."
                />
                <Input
                  label="Critical Level (%)"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.criticalPercent}
                  onChange={(e) => {
                    const next = clampPct(Number(e.target.value), 1, 100, 50)
                    update({ criticalPercent: Math.min(next, settings.reorderWarningPercent) })
                  }}
                  helperText="Stock at or below this percent of reorder level triggers a critical alert. Must be ≤ Warning. Default 50%."
                />
                {settings.criticalPercent >= settings.reorderWarningPercent && settings.reorderWarningPercent < 100 && (
                  <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Critical and Warning are tied at {settings.reorderWarningPercent}% — every low-stock item will be flagged critical.
                  </p>
                )}
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Items at exactly 0 always trigger a stock-out alert regardless of these settings.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card>
              <CardContent className="space-y-1 p-6">
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">System Preferences</h3>

                <SettingRow
                  title="Enable barcode scanning"
                  desc="Show a barcode-scan input on the items page (placeholder — scanner integration pending)."
                  checked={settings.enableBarcodeScanning}
                  onChange={(v) => update({ enableBarcodeScanning: v })}
                />
                <SettingRow
                  title="Auto-generate reference number"
                  desc="Stock In/Out forms fill in a reference number automatically when left blank."
                  checked={settings.autoGenerateReferenceNumber}
                  onChange={(v) => update({ autoGenerateReferenceNumber: v })}
                />
                <SettingRow
                  title="Require batch number"
                  desc="Stock In/Out submissions must include a batch number — useful for traceability."
                  checked={settings.requireBatchNumber}
                  onChange={(v) => update({ requireBatchNumber: v })}
                />
                <SettingRow
                  title="Allow negative stock"
                  desc="Stock-out movements can push item quantity below zero. Off by default for accuracy."
                  checked={settings.allowNegativeStock}
                  onChange={(v) => update({ allowNegativeStock: v })}
                  last
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'movements' && (
            <Card>
              <CardContent className="space-y-1 p-6">
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Movement Rules</h3>
                <SettingRow
                  title="Require reason on adjustment"
                  desc="Adjustments must include a written reason for the audit trail."
                  checked={settings.requireReasonOnAdjustment}
                  onChange={(v) => update({ requireReasonOnAdjustment: v })}
                />
                <SettingRow
                  title="Require destination on transfer"
                  desc="Transfers must specify a destination warehouse."
                  checked={settings.requireWarehouseOnTransfer}
                  onChange={(v) => update({ requireWarehouseOnTransfer: v })}
                  last
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'defaults' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Operational Defaults</h3>
                <Select
                  label="Default Warehouse"
                  options={warehouseOptions}
                  value={settings.defaultWarehouseId}
                  onChange={(e) => update({ defaultWarehouseId: e.target.value })}
                />
                <Select
                  label="Default Unit"
                  options={uomOptions}
                  value={settings.defaultUomId}
                  onChange={(e) => update({ defaultUomId: e.target.value })}
                />
                <Select
                  label="Default Currency"
                  options={CURRENCIES}
                  value={settings.defaultCurrency}
                  onChange={(e) => update({ defaultCurrency: e.target.value })}
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Pre-fills these fields on new forms. Users can still override per-record.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-1 p-6">
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Inventory Alerts</h3>
                {[
                  { key: 'lowStock' as const, label: 'Low stock', desc: 'When an item drops to or below its reorder level' },
                  { key: 'stockOut' as const, label: 'Stock out', desc: 'When an item reaches zero on hand' },
                ].map((item, i, arr) => (
                  <SettingRow
                    key={item.key}
                    title={item.label}
                    desc={item.desc}
                    checked={settings.notify[item.key]}
                    onChange={(v) => updateNotify({ [item.key]: v })}
                    last={i === arr.length - 1}
                  />
                ))}
                <p className="text-[12px] text-zinc-400 pt-2">
                  These preferences control whether the bell icon and Alerts page surface each kind of event.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function clampPct(v: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback
  return Math.max(lo, Math.min(hi, v))
}

interface SettingRowProps {
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  last?: boolean
}

function SettingRow({ title, desc, checked, onChange, last }: SettingRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-3 gap-4', !last && 'border-b border-zinc-100/60')}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-700">{title}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

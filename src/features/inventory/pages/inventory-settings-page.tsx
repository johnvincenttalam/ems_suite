import { useState } from 'react'
import { Settings as SettingsIcon, Bell, ArrowLeftRight, AlertTriangle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Stock Levels', value: 'stock', icon: AlertTriangle },
  { label: 'Movements', value: 'movements', icon: ArrowLeftRight },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

export function InventorySettingsPage() {
  const { settings, update, updateNotify, reset } = useInventorySettings()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  return (
    <div>
      <PageHeader
        title="Inventory Settings"
        subtitle="Configure stock thresholds, movement rules, and alert behavior"
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
                <h3 className="text-sm font-semibold text-zinc-900">Defaults</h3>
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

          {activeTab === 'stock' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Low-stock Threshold</h3>
                <Input
                  label="Critical ratio"
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={settings.lowStockRatio}
                  onChange={(e) =>
                    update({
                      lowStockRatio: Math.max(0.1, Math.min(1, Number(e.target.value) || 0.5)),
                    })
                  }
                  helperText="Items at or below this fraction of reorder level escalate to a critical alert (e.g. 0.5 = half of reorder level)"
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Items at exactly 0 always trigger a stock-out alert regardless of this setting.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'movements' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Movement Rules</h3>
                <div className="flex items-center justify-between py-3 border-b border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require reason on adjustment</p>
                    <p className="text-xs text-zinc-400">Adjustments must include a written reason for the audit trail</p>
                  </div>
                  <Toggle
                    checked={settings.requireReasonOnAdjustment}
                    onChange={(v) => update({ requireReasonOnAdjustment: v })}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require destination on transfer</p>
                    <p className="text-xs text-zinc-400">Transfers must specify a destination warehouse</p>
                  </div>
                  <Toggle
                    checked={settings.requireWarehouseOnTransfer}
                    onChange={(v) => update({ requireWarehouseOnTransfer: v })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Inventory Alerts</h3>
                {[
                  { key: 'lowStock' as const, label: 'Low stock', desc: 'When an item drops to or below its reorder level' },
                  { key: 'stockOut' as const, label: 'Stock out', desc: 'When an item reaches zero on hand' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-3 border-b border-zinc-100/60 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-700">{item.label}</p>
                      <p className="text-xs text-zinc-400">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={settings.notify[item.key]}
                      onChange={(v) => updateNotify({ [item.key]: v })}
                    />
                  </div>
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

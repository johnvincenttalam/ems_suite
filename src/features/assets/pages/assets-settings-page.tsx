import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Tag, UserCheck, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useAssetsSettings } from '@/features/assets/store/assets-settings-store'
import { useWarehouses } from '@/features/warehouses'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Depreciation', value: 'depreciation', icon: Tag },
  { label: 'Assignments', value: 'assignments', icon: UserCheck },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

export function AssetsSettingsPage() {
  const { settings, update, updateNotify, reset } = useAssetsSettings()
  const { data: warehouses = [] } = useWarehouses()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  const locationOptions = [
    { value: '', label: 'No default — pick on Add' },
    ...warehouses.map((w) => ({ value: w.id, label: w.name })),
  ]

  return (
    <div>
      <PageHeader
        title="Assets Settings"
        subtitle="Configure asset lifecycle, approval, and alert behavior"
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
                <h3 className="text-sm font-semibold text-zinc-900">Operational Defaults</h3>
                <div>
                  <Select
                    label="Default Location"
                    value={settings.defaultLocationId}
                    onChange={(e) => update({ defaultLocationId: e.target.value })}
                    options={locationOptions}
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Pre-selected on the Add Asset form. Users can still override per record.
                  </p>
                </div>
                <SettingRow
                  title="Require serial number on create"
                  desc="New assets must have a serial number for traceability."
                  checked={settings.requireSerialOnCreate}
                  onChange={(v) => update({ requireSerialOnCreate: v })}
                  last
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Asset categories and warehouses are managed at the module level under
                  Categories and Locations.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'depreciation' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Depreciation Defaults</h3>
                <Input
                  label="Default useful life (months)"
                  type="number"
                  min={1}
                  max={600}
                  value={settings.defaultDepreciationMonths}
                  onChange={(e) =>
                    update({ defaultDepreciationMonths: clamp(Number(e.target.value), 1, 600, 60) })
                  }
                  helperText="Pre-fills the Useful Life field on the Add Asset form. Default 60 months (5 years)."
                />
                <Input
                  label="Default salvage value (% of cost)"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.defaultSalvagePercent}
                  onChange={(e) =>
                    update({ defaultSalvagePercent: clamp(Number(e.target.value), 0, 100, 10) })
                  }
                  helperText="Used to suggest a salvage value when one isn't entered. Set 0% to disable."
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Straight-line depreciation only. Per-category overrides will arrive in a future release.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'assignments' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Assignment Rules</h3>
                <Input
                  label="Long-checkout threshold (days)"
                  type="number"
                  min={7}
                  max={365}
                  value={settings.longCheckoutDays}
                  onChange={(e) =>
                    update({ longCheckoutDays: clamp(Number(e.target.value), 7, 365, 30) })
                  }
                  helperText="Open assignments older than this trigger a long-checkout alert."
                />
                <Input
                  label="Warranty expiring window (days)"
                  type="number"
                  min={7}
                  max={365}
                  value={settings.warrantyExpiringDays}
                  onChange={(e) =>
                    update({ warrantyExpiringDays: clamp(Number(e.target.value), 7, 365, 60) })
                  }
                  helperText="Assets within this many days of warranty expiry are flagged in alerts."
                />
                <SettingRow
                  title="Require notes on return"
                  desc="Custodians must enter notes (condition, location) when returning an asset."
                  checked={settings.requireReturnNotes}
                  onChange={(v) => update({ requireReturnNotes: v })}
                  last
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-1 p-6">
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Asset Alerts</h3>
                {[
                  { key: 'inMaintenance' as const, label: 'In maintenance', desc: 'When an asset is set to maintenance status.' },
                  { key: 'longCheckout' as const, label: 'Long-running checkout', desc: 'When an open assignment exceeds the long-checkout threshold.' },
                  { key: 'warrantyExpiring' as const, label: 'Warranty expiring', desc: 'When an asset is within the warranty-expiring window.' },
                  { key: 'inspectionFailed' as const, label: 'Inspection failed', desc: 'When a submitted inspection has any failed line item.' },
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

function clamp(v: number, lo: number, hi: number, fallback: number): number {
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

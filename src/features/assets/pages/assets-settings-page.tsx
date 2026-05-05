import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Tag, UserCheck, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useAssetsSettings } from '@/features/assets/store/assets-settings-store'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Lifecycle', value: 'lifecycle', icon: Tag },
  { label: 'Assignments', value: 'assignments', icon: UserCheck },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

export function AssetsSettingsPage() {
  const { settings, update, updateNotify, reset } = useAssetsSettings()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  return (
    <div>
      <PageHeader
        title="Assets Settings"
        subtitle="Configure asset lifecycle, assignment rules, and alert behavior"
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
                <div className="flex items-center justify-between py-3 border-b border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require serial number on create</p>
                    <p className="text-xs text-zinc-400">New assets must have a serial number for traceability</p>
                  </div>
                  <Toggle
                    checked={settings.requireSerialOnCreate}
                    onChange={(v) => update({ requireSerialOnCreate: v })}
                  />
                </div>
                <p className="text-[12px] text-zinc-400 pt-2">
                  Asset categories and locations are managed under their respective master-data menus in the Inventory module.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'lifecycle' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Depreciation</h3>
                <Input
                  label="Default depreciation period (years)"
                  type="number"
                  min={1}
                  max={50}
                  value={settings.defaultDepreciationYears}
                  onChange={(e) =>
                    update({ defaultDepreciationYears: Math.max(1, Math.min(50, Number(e.target.value) || 5)) })
                  }
                  helperText="Used to calculate book value over time. Per-category overrides will arrive in a future release."
                />
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
                    update({ longCheckoutDays: Math.max(7, Math.min(365, Number(e.target.value) || 30)) })
                  }
                  helperText="Open assignments older than this trigger a long-checkout alert"
                />
                <div className="flex items-center justify-between py-3 border-t border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require notes on return</p>
                    <p className="text-xs text-zinc-400">Custodians must enter notes (condition, location) when returning an asset</p>
                  </div>
                  <Toggle
                    checked={settings.requireReturnNotes}
                    onChange={(v) => update({ requireReturnNotes: v })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Asset Alerts</h3>
                {[
                  { key: 'inMaintenance' as const, label: 'In maintenance', desc: 'When an asset is set to maintenance status' },
                  { key: 'longCheckout' as const, label: 'Long-running checkout', desc: 'When an open assignment exceeds the long-checkout threshold' },
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

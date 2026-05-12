import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Fuel, Wrench, RotateCcw } from 'lucide-react'
import { ModuleAdminGuard } from '@/features/auth'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useFleetSettings, type FleetSettings } from '@/features/fleet/store/fleet-settings-store'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Trips', value: 'trips', icon: Fuel },
  { label: 'Maintenance', value: 'maintenance', icon: Wrench },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

export function FleetSettingsPage() {
  return (
    <ModuleAdminGuard moduleKey="fleet" pageLabel="Fleet Settings">
      <FleetSettingsPageInner />
    </ModuleAdminGuard>
  )
}

function FleetSettingsPageInner() {
  const { settings, update, updateNotify, reset } = useFleetSettings()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  return (
    <div>
      <PageHeader
        title="Fleet Settings"
        subtitle="Configure fuel defaults, trip rules, and alert behavior"
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
                <Select
                  label="Default fuel type"
                  value={settings.defaultFuelType}
                  onChange={(e) =>
                    update({ defaultFuelType: e.target.value as FleetSettings['defaultFuelType'] })
                  }
                  options={[
                    { value: 'petrol', label: 'Petrol' },
                    { value: 'diesel', label: 'Diesel' },
                    { value: 'electric', label: 'Electric' },
                  ]}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'trips' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Trip Rules</h3>
                <Input
                  label="Long-trip threshold (hours)"
                  type="number"
                  min={1}
                  max={72}
                  value={settings.longTripHours}
                  onChange={(e) =>
                    update({ longTripHours: Math.max(1, Math.min(72, Number(e.target.value) || 12)) })
                  }
                  helperText="Trips still in progress beyond this point trigger a long-trip alert"
                />
                <div className="flex items-center justify-between py-3 border-t border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require odometer at trip start</p>
                    <p className="text-xs text-zinc-400">Drivers must record the odometer when starting a trip</p>
                  </div>
                  <Toggle
                    checked={settings.requireOdometerOnTripStart}
                    onChange={(v) => update({ requireOdometerOnTripStart: v })}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require odometer on fuel log</p>
                    <p className="text-xs text-zinc-400">Drivers must record odometer when fueling — used to compute consumption</p>
                  </div>
                  <Toggle
                    checked={settings.requireOdometerOnFuel}
                    onChange={(v) => update({ requireOdometerOnFuel: v })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'maintenance' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Service Schedule</h3>
                <Input
                  label="Service interval (km)"
                  type="number"
                  min={1000}
                  max={50000}
                  step={500}
                  value={settings.serviceIntervalKm}
                  onChange={(e) =>
                    update({
                      serviceIntervalKm: Math.max(1000, Math.min(50000, Number(e.target.value) || 10000)),
                    })
                  }
                  helperText="Vehicles approaching this interval since last service can be flagged for review"
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Per-vehicle service tracking and PM scheduling will arrive in a future release.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Fleet Alerts</h3>
                {[
                  { key: 'inMaintenance' as const, label: 'Vehicle in maintenance', desc: 'When a vehicle is set to maintenance status' },
                  { key: 'longTrip' as const, label: 'Long-running trip', desc: 'When a trip stays in progress past the long-trip threshold' },
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

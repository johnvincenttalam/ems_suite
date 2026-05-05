import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Wrench, ListChecks, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useMaintenanceSettings, type MaintenanceSettings } from '@/features/maintenance/store/maintenance-settings-store'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Work Orders', value: 'work-orders', icon: Wrench },
  { label: 'Completion', value: 'completion', icon: ListChecks },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

export function MaintenanceSettingsPage() {
  const { settings, update, updateNotify, reset } = useMaintenanceSettings()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  return (
    <div>
      <PageHeader
        title="Maintenance Settings"
        subtitle="Configure work order defaults, completion rules, and alert behavior"
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
                  label="Default priority"
                  value={settings.defaultPriority}
                  onChange={(e) =>
                    update({ defaultPriority: e.target.value as MaintenanceSettings['defaultPriority'] })
                  }
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'work-orders' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Due-soon Window</h3>
                <Input
                  label="Days before scheduled date"
                  type="number"
                  min={1}
                  max={30}
                  value={settings.dueSoonDays}
                  onChange={(e) =>
                    update({ dueSoonDays: Math.max(1, Math.min(30, Number(e.target.value) || 2)) })
                  }
                  helperText="Work orders within this window flag as 'due soon' on dashboards and the bell"
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'completion' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Completion Rules</h3>
                <div className="flex items-center justify-between py-3 border-b border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require checklist completion</p>
                    <p className="text-xs text-zinc-400">Block marking a WO complete until its checklist (if any) is signed off</p>
                  </div>
                  <Toggle
                    checked={settings.requireChecklistOnComplete}
                    onChange={(v) => update({ requireChecklistOnComplete: v })}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require completion notes</p>
                    <p className="text-xs text-zinc-400">Technicians must enter notes when completing a work order</p>
                  </div>
                  <Toggle
                    checked={settings.requireCompletionNotes}
                    onChange={(v) => update({ requireCompletionNotes: v })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Maintenance Alerts</h3>
                {[
                  { key: 'woAssigned' as const, label: 'Work order assigned', desc: 'When a new WO is assigned to you' },
                  { key: 'woDueSoon' as const, label: 'Due soon', desc: 'When an assigned WO is within the due-soon window' },
                  { key: 'woOverdue' as const, label: 'Overdue', desc: 'When an assigned WO has passed its scheduled date' },
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


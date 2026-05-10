import { useState } from 'react'
import { Settings as SettingsIcon, Bell, ListChecks, Building2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useProcurementSettings } from '@/features/procurement/store/procurement-settings-store'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Approvals', value: 'approvals', icon: ListChecks },
  { label: 'Suppliers', value: 'suppliers', icon: Building2 },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

const CURRENCIES = [
  { value: 'PHP', label: 'Philippine Peso (PHP)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
]

export function ProcurementSettingsPage() {
  const { settings, update, updateNotify, reset } = useProcurementSettings()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  return (
    <div>
      <PageHeader
        title="Procurement Settings"
        subtitle="Configure approval thresholds, currencies, and notification rules"
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
                <h3 className="text-sm font-semibold text-zinc-900">Currency & Defaults</h3>
                <Select
                  label="Default currency"
                  value={settings.defaultCurrency}
                  onChange={(e) => update({ defaultCurrency: e.target.value })}
                  options={CURRENCIES}
                />
                <div className="flex items-center justify-between py-3 border-t border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require needed-by date</p>
                    <p className="text-xs text-zinc-400">New requests must specify when goods are needed</p>
                  </div>
                  <Toggle
                    checked={settings.requireNeededByDate}
                    onChange={(v) => update({ requireNeededByDate: v })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'approvals' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Approval Rules</h3>
                <Input
                  label="Auto-approve below (amount)"
                  type="number"
                  min={0}
                  value={settings.autoApproveBelow}
                  onChange={(e) =>
                    update({ autoApproveBelow: Math.max(0, Number(e.target.value) || 0) })
                  }
                  helperText="Requests below this amount skip the approval chain. Set 0 to disable."
                />
                <div className="flex items-center justify-between py-3 border-t border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require reason on rejection</p>
                    <p className="text-xs text-zinc-400">Approvers must enter a reason before rejecting</p>
                  </div>
                  <Toggle
                    checked={settings.requireRejectionReason}
                    onChange={(v) => update({ requireRejectionReason: v })}
                  />
                </div>
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Approval chains are configured per request. Department-tier defaults will arrive in a future release.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'suppliers' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Supplier Rules</h3>
                <div className="flex items-center justify-between py-3 border-b border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require supplier on submission</p>
                    <p className="text-xs text-zinc-400">New requests must select a supplier before submitting for approval</p>
                  </div>
                  <Toggle
                    checked={settings.requireSupplier}
                    onChange={(v) => update({ requireSupplier: v })}
                  />
                </div>
                <p className="text-[12px] text-zinc-400 pt-2">
                  Supplier records are managed under the Suppliers menu in this module.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Procurement Alerts</h3>
                {[
                  { key: 'approvalNeeded' as const, label: 'Approval needed', desc: "When you're the next approver on a request" },
                  { key: 'requestApproved' as const, label: 'Request approved', desc: 'When a request you authored is approved' },
                  { key: 'requestRejected' as const, label: 'Request rejected', desc: 'When a request you authored is rejected' },
                  { key: 'requestOverdue' as const, label: 'Request overdue', desc: 'When a needed-by date has passed' },
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

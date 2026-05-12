import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Archive, PenLine, Workflow, RotateCcw } from 'lucide-react'
import { ModuleAdminGuard } from '@/features/auth'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useSdmsSettings } from '@/features/documents/store/sdms-settings-store'

const tabs = [
  { label: 'General', value: 'general', icon: SettingsIcon },
  { label: 'Workflow', value: 'workflow', icon: Workflow },
  { label: 'Retention', value: 'retention', icon: Archive },
  { label: 'Signatures', value: 'signatures', icon: PenLine },
  { label: 'Notifications', value: 'notifications', icon: Bell },
] as const

type TabKey = (typeof tabs)[number]['value']

export function SdmsSettingsPage() {
  return (
    <ModuleAdminGuard moduleKey="sdms" pageLabel="SDMS Settings">
      <SdmsSettingsPageInner />
    </ModuleAdminGuard>
  )
}

function SdmsSettingsPageInner() {
  const { settings, update, updateNotify, reset } = useSdmsSettings()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  return (
    <div>
      <PageHeader
        title="SDMS Settings"
        subtitle="Configure document workflow, retention, and notifications"
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
                <h3 className="text-sm font-semibold text-zinc-900">Tracking & Defaults</h3>
                <Input
                  label="Tracking number prefix"
                  value={settings.trackingPrefix}
                  onChange={(e) => update({ trackingPrefix: e.target.value.toUpperCase().slice(0, 8) })}
                  helperText={`Generated tracking numbers will look like: ${settings.trackingPrefix || 'SDMS'}-2026-0001`}
                />
                <div className="flex items-center justify-between py-3 border-t border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require classification before workflow</p>
                    <p className="text-xs text-zinc-400">Prevent starting a workflow on unclassified documents</p>
                  </div>
                  <Toggle
                    checked={settings.requireClassification}
                    onChange={(v) => update({ requireClassification: v })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'workflow' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Workflow Defaults</h3>
                <Input
                  label="Default deadline (days from start)"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.defaultDeadlineDays}
                  onChange={(e) =>
                    update({ defaultDeadlineDays: Math.max(1, Math.min(90, Number(e.target.value) || 7)) })
                  }
                  helperText="Used to pre-fill the deadline field when starting a workflow"
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Approver chains are configured per document. Default chains per category will arrive in a future release.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'retention' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Retention Policy</h3>
                <Input
                  label="Default retention period (months)"
                  type="number"
                  min={1}
                  max={240}
                  value={settings.defaultRetentionMonths}
                  onChange={(e) =>
                    update({ defaultRetentionMonths: Math.max(1, Math.min(240, Number(e.target.value) || 60)) })
                  }
                  helperText="Used when archiving a document if no per-category override is set"
                />
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  Documents inherit this period when archived. Per-category overrides (Legal: 10y, HR: 7y, Finance: 7y) will arrive with archive policies.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'signatures' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Signature Policy</h3>
                <div className="flex items-center justify-between py-3 border-b border-zinc-100/60">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Allow signature revocation</p>
                    <p className="text-xs text-zinc-400">Let signers revoke a signature if a document is later contested</p>
                  </div>
                  <Toggle
                    checked={settings.allowSignatureRevocation}
                    onChange={(v) => update({ allowSignatureRevocation: v })}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Require reason on disapproval</p>
                    <p className="text-xs text-zinc-400">Approvers must enter a reason before disapproving</p>
                  </div>
                  <Toggle
                    checked={settings.requireRejectionReason}
                    onChange={(v) => update({ requireRejectionReason: v })}
                  />
                </div>
                <p className="text-[12px] text-zinc-400 pt-2 border-t border-zinc-100/60">
                  PKI / certificate-based signing requires a backend integration and is not part of this template.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">SDMS Alerts</h3>
                {[
                  { key: 'approvalNeeded' as const, label: 'Approval needed', desc: "When you're the next approver on a document" },
                  { key: 'routingPending' as const, label: 'Routing pending', desc: 'When a document is routed to you' },
                  { key: 'docApproved' as const, label: 'Document approved', desc: 'When a document you authored is approved' },
                  { key: 'docRejected' as const, label: 'Document disapproved', desc: 'When a document you authored is disapproved' },
                  { key: 'deadlineSoon' as const, label: 'Deadline soon', desc: 'When a document deadline is within 2 days' },
                  { key: 'deadlineOverdue' as const, label: 'Deadline overdue', desc: 'When a document deadline has passed' },
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

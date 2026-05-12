import { Settings as SettingsIcon, Bell, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ModuleAdminGuard } from '@/features/auth'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import {
  useMisSettings,
  type AlertCategory,
  type DefaultReportRange,
} from '@/features/mis/store/mis-settings-store'

const CATEGORIES: { key: AlertCategory; label: string; description: string }[] = [
  { key: 'inventory',   label: 'Inventory',   description: 'Low stock, stock-out alerts' },
  { key: 'procurement', label: 'Procurement', description: 'Approval-needed, request overdue' },
  { key: 'maintenance', label: 'Maintenance', description: 'WO assigned, due soon, overdue' },
  { key: 'fleet',       label: 'Fleet',       description: 'Vehicle in maintenance, long-running trips' },
  { key: 'assets',      label: 'Assets',      description: 'In maintenance, assignment open' },
  { key: 'sdms',        label: 'SDMS',        description: 'Sign required, routing pending, doc decisions' },
]

const REPORT_RANGE_OPTIONS: { value: DefaultReportRange; label: string }[] = [
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month-to-date' },
  { value: 'qtd', label: 'Quarter-to-date' },
  { value: 'ytd', label: 'Year-to-date' },
]

export function MisSettingsPage() {
  return (
    <ModuleAdminGuard moduleKey="mis" pageLabel="MIS Settings">
      <MisSettingsPageInner />
    </ModuleAdminGuard>
  )
}

function MisSettingsPageInner() {
  const { settings, update, toggleCategory, reset } = useMisSettings()
  const enabled = new Set(settings.enabledAlertCategories)

  return (
    <div>
      <PageHeader
        title="MIS Settings"
        subtitle="Defaults for Custom Reports and which cross-module alerts surface here"
        actions={
          <Button
            variant="outline"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              reset()
              toast.success('MIS settings reset to defaults')
            }}
          >
            Reset to defaults
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Custom Reports</h3>
            </div>
            <Select
              label="Default date range"
              value={settings.defaultReportRange}
              onChange={(e) => update({ defaultReportRange: e.target.value as DefaultReportRange })}
              options={REPORT_RANGE_OPTIONS}
            />
            <p className="text-[11px] text-zinc-400 -mt-2">Pre-fills the From/To inputs when Custom Reports loads.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Alert Categories</h3>
            </div>
            <p className="text-[12.5px] text-zinc-500">
              Toggle which module's alerts surface on the MIS Alerts page. Module-specific
              alert pages keep showing everything; this only filters the cross-module roll-up.
            </p>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-center justify-between py-2.5 border-b border-zinc-100/60 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{cat.label}</p>
                    <p className="text-xs text-zinc-400">{cat.description}</p>
                  </div>
                  <Toggle
                    checked={enabled.has(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

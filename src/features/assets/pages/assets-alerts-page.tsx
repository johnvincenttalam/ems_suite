import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Inbox, ShieldAlert } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useNotifications } from '@/shared/notifications'
import { useAssets } from '@/features/assets'
import { useAssetsSettings } from '@/features/assets/store/assets-settings-store'
import type { NotificationKind, NotificationSeverity } from '@/shared/notifications/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { FilterChips } from '@/shared/ui/filter-chips'
import { SearchInput } from '@/shared/ui/search-input'
import { cn } from '@/shared/utils/cn'

const ASSET_KINDS: NotificationKind[] = ['asset_in_maintenance', 'asset_assignment_open']

type SeverityFilter = NotificationSeverity | 'all'

const severityFilters: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'danger', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

const iconBgByType: Record<NotificationSeverity, string> = {
  info: 'bg-blue-50',
  warning: 'bg-amber-50',
  success: 'bg-emerald-50',
  danger: 'bg-red-50',
}

const iconColorByType: Record<NotificationSeverity, string> = {
  info: 'text-blue-600',
  warning: 'text-amber-500',
  success: 'text-emerald-600',
  danger: 'text-red-500',
}

const dotByType: Record<NotificationSeverity, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  danger: 'bg-red-500',
}

export function AssetsAlertsPage() {
  const { notifications, markRead, markAllRead } = useNotifications()
  const { data: assets = [] } = useAssets()
  const settings = useAssetsSettings((s) => s.settings)
  const navigate = useNavigate()

  const warrantyExpiring = useMemo(() => {
    if (!settings.notify.warrantyExpiring) return []
    const today = new Date()
    return assets
      .filter((a) => a.status !== 'disposed' && a.warrantyExpiry)
      .map((a) => ({
        asset: a,
        days: differenceInCalendarDays(parseISO(a.warrantyExpiry!), today),
      }))
      .filter((row) => row.days >= 0 && row.days <= settings.warrantyExpiringDays)
      .sort((a, b) => a.days - b.days)
  }, [assets, settings.notify.warrantyExpiring, settings.warrantyExpiringDays])

  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')

  const assetAlerts = useMemo(
    () =>
      notifications.filter((n) => {
        if (!ASSET_KINDS.includes(n.kind)) return false
        // Honor the per-kind notify toggles in Settings.
        if (n.kind === 'asset_in_maintenance' && !settings.notify.inMaintenance) return false
        if (n.kind === 'asset_assignment_open' && !settings.notify.longCheckout) return false
        return true
      }),
    [notifications, settings.notify.inMaintenance, settings.notify.longCheckout],
  )

  const filtered = useMemo(() => {
    return assetAlerts.filter((n) => {
      if (severity !== 'all' && n.severity !== severity) return false
      if (unreadOnly && n.read) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!n.title.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [assetAlerts, severity, unreadOnly, search])

  const assetUnread = assetAlerts.filter((n) => !n.read).length

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle={`${assetAlerts.length} alert${assetAlerts.length === 1 ? '' : 's'}${assetUnread > 0 ? ` · ${assetUnread} unread` : ''}`}
        actions={
          assetUnread > 0 && (
            <Button
              variant="outline"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search alerts..." />
        </div>
        <FilterChips options={severityFilters} value={severity} onChange={(v) => setSeverity(v as SeverityFilter)} />
        <button
          type="button"
          onClick={() => setUnreadOnly((v) => !v)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors',
            unreadOnly ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400',
          )}
        >
          Unread only
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            {assetAlerts.length === 0 ? (
              <>
                <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-zinc-700">All operational</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">No assets in maintenance and no long-running checkouts.</p>
              </>
            ) : (
              <>
                <Inbox className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-zinc-700">No alerts match your filters</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">Try clearing filters or switching off unread-only.</p>
              </>
            )}
          </div>
        ) : (
          <ul>
            {filtered.map((n, i) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-3 px-6 py-4 transition-colors hover:bg-zinc-50/50 cursor-pointer',
                  !n.read && 'bg-zinc-50/30',
                  i !== filtered.length - 1 && 'border-b border-zinc-100/60',
                )}
                onClick={() => {
                  markRead(n.id)
                  if (n.link) navigate(n.link)
                }}
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', iconBgByType[n.severity])}>
                  <n.icon className={cn('w-4 h-4', iconColorByType[n.severity])} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-[13.5px] truncate', n.read ? 'text-zinc-700' : 'font-medium text-zinc-900')}>
                      {n.title}
                    </p>
                    {!n.read && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotByType[n.severity])} />}
                  </div>
                  <p className="text-[12.5px] text-zinc-500 mt-0.5">{n.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {warrantyExpiring.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[14px] font-semibold text-zinc-900">Warranty expiring</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Assets within {settings.warrantyExpiringDays} days of warranty expiry
              </p>
            </div>
            <span className="text-[11px] text-zinc-400">{warrantyExpiring.length} flagged</span>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
            <ul>
              {warrantyExpiring.map(({ asset, days }, i) => (
                <li
                  key={asset.id}
                  className={cn(
                    'flex items-start gap-3 px-6 py-3.5 hover:bg-zinc-50/50 cursor-pointer',
                    i !== warrantyExpiring.length - 1 && 'border-b border-zinc-100/60',
                  )}
                  onClick={() => navigate(`registry?asset=${asset.id}`)}
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', days <= 14 ? 'bg-red-50' : 'bg-amber-50')}>
                    <ShieldAlert className={cn('w-4 h-4', days <= 14 ? 'text-red-600' : 'text-amber-500')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium text-zinc-900 truncate">{asset.name}</p>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                      <span className="font-mono">{asset.assetCode}</span>
                      {' · '}
                      Expires in {days} day{days === 1 ? '' : 's'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

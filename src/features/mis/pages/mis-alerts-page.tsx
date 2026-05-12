import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useNotifications } from '@/shared/notifications'
import type { NotificationSeverity } from '@/shared/notifications/types'
import { modules, type ModuleKey } from '@/config/modules'
import { useMisSettings } from '@/features/mis/store/mis-settings-store'
import type { AlertCategory } from '@/features/mis/store/mis-settings-store'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { cn } from '@/shared/utils/cn'

type SeverityFilter = NotificationSeverity | 'all'
type ModuleFilter = ModuleKey | 'all'

const severityFilters: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'danger', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Resolved' },
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

/**
 * Cross-module alerts view — MIS-only. Aggregates every notification across
 * all modules so executives don't have to hop between per-module alert pages.
 * The bell scoping on each module workspace stays in place; this is the
 * roll-up alongside it, not a replacement.
 */
export function MisAlertsPage() {
  const { notifications: allNotifications, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const enabledCategories = useMisSettings((s) => s.settings.enabledAlertCategories)

  // Category-filter the cross-module roll-up. Notifications whose module
  // isn't an enabled category are dropped from view here; the per-module
  // alerts page for that module still shows them.
  const enabledSet = useMemo(() => new Set<AlertCategory>(enabledCategories), [enabledCategories])
  const notifications = useMemo(
    () => allNotifications.filter((n) => (enabledSet.size === 0 ? true : enabledSet.has(n.module as AlertCategory))),
    [allNotifications, enabledSet],
  )

  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')

  const moduleLabel = useMemo(() => {
    const map: Partial<Record<ModuleKey, string>> = {}
    for (const m of modules) map[m.key] = m.shortName
    return map
  }, [])

  const moduleOptions = useMemo(() => {
    const counts = new Map<ModuleKey, number>()
    for (const n of notifications) counts.set(n.module, (counts.get(n.module) ?? 0) + 1)
    const opts: { value: ModuleFilter; label: string }[] = [
      { value: 'all', label: `All modules${notifications.length > 0 ? ` (${notifications.length})` : ''}` },
    ]
    for (const m of modules) {
      const c = counts.get(m.key) ?? 0
      if (c === 0) continue
      opts.push({ value: m.key, label: `${m.shortName} (${c})` })
    }
    return opts
  }, [notifications])

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (severity !== 'all' && n.severity !== severity) return false
      if (moduleFilter !== 'all' && n.module !== moduleFilter) return false
      if (unreadOnly && n.read) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!n.title.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [notifications, severity, moduleFilter, unreadOnly, search])

  const totalUnread = notifications.filter((n) => !n.read).length
  const moduleUnread = moduleFilter === 'all'
    ? totalUnread
    : notifications.filter((n) => !n.read && n.module === moduleFilter).length

  function handleMarkAllRead() {
    if (moduleFilter === 'all') {
      markAllRead()
    } else {
      notifications
        .filter((n) => !n.read && n.module === moduleFilter)
        .forEach((n) => markRead(n.id))
    }
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle={
          totalUnread > 0
            ? `${notifications.length} alert${notifications.length === 1 ? '' : 's'} across all modules · ${totalUnread} unread`
            : `${notifications.length} alert${notifications.length === 1 ? '' : 's'} across all modules`
        }
        actions={
          moduleUnread > 0 && (
            <Button
              variant="outline"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={handleMarkAllRead}
            >
              {moduleFilter === 'all' ? 'Mark all read' : `Mark ${moduleLabel[moduleFilter] ?? ''} read`}
            </Button>
          )
        }
      />

      <ListToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Search alerts...' }}
        filter={
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChips options={severityFilters} value={severity} onChange={(v) => setSeverity(v as SeverityFilter)} />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as ModuleFilter)}
              className="h-8 rounded-lg border border-zinc-200 bg-white text-[12.5px] px-2.5 text-zinc-700 hover:border-zinc-400 focus:outline-none focus:border-zinc-900"
            >
              {moduleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
        }
      />

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            {notifications.length === 0 ? (
              <>
                <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-zinc-700">All quiet</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">No alerts across the system right now.</p>
              </>
            ) : (
              <>
                <Inbox className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-zinc-700">No alerts match your filters</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">Try clearing filters or switching modules.</p>
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
                    <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10.5px] font-medium uppercase tracking-wide flex-shrink-0">
                      {moduleLabel[n.module] ?? n.module}
                    </span>
                    {!n.read && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotByType[n.severity])} />}
                  </div>
                  <p className="text-[12.5px] text-zinc-500 mt-0.5">{n.description}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {formatDistanceToNow(parseISO(n.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

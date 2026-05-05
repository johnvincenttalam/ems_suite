import { useState, useRef } from 'react'
import { Bell, Clock, Inbox } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/shared/utils/cn'
import { useClickOutside } from '@/shared/hooks/use-click-outside'
import { useNotifications } from '@/shared/notifications'
import type { ModuleKey } from '@/config/modules'

interface NotificationCenterProps {
  /** Scopes the bell to the active module. Omit (or pass mis/admin) for a global view. */
  moduleKey?: ModuleKey
}

const dotByType: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  danger: 'bg-red-500',
}

const iconBgByType: Record<string, string> = {
  info: 'bg-blue-50',
  warning: 'bg-amber-50',
  success: 'bg-emerald-50',
  danger: 'bg-red-50',
}

const iconColorByType: Record<string, string> = {
  info: 'text-blue-600',
  warning: 'text-amber-500',
  success: 'text-emerald-600',
  danger: 'text-red-500',
}

export function NotificationCenter({ moduleKey }: NotificationCenterProps = {}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(moduleKey)

  useClickOutside(ref, () => setOpen(false), open)

  const visible = notifications.slice(0, 20)

  const handleClick = (id: string, link?: string) => {
    markRead(id)
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-xl border border-zinc-200/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[11px] font-medium rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[12px] text-zinc-500 hover:text-zinc-700 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-10 flex flex-col items-center text-center">
                <Inbox className="w-8 h-8 text-zinc-300 mb-2" />
                <p className="text-[13px] font-medium text-zinc-700">All caught up</p>
                <p className="text-[12px] text-zinc-400 mt-1">No pending signatures, routings, or deadlines.</p>
              </div>
            ) : (
              visible.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.id, n.link)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 border-b border-zinc-50 transition-colors hover:bg-zinc-50/50 text-left',
                    !n.read && 'bg-zinc-50/30',
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', iconBgByType[n.severity])}>
                    <n.icon className={cn('w-4 h-4', iconColorByType[n.severity])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-[13px] truncate', n.read ? 'text-zinc-600' : 'font-medium text-zinc-900')}>
                        {n.title}
                      </p>
                      {!n.read && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotByType[n.severity])} />}
                    </div>
                    <p className="text-[12px] text-zinc-400 truncate mt-0.5">{n.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-zinc-300" />
                      <span className="text-[11px] text-zinc-400">{formatDistanceToNow(parseISO(n.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > visible.length && (
            <div className="px-4 py-2.5 border-t border-zinc-100 text-center">
              <span className="text-[12px] text-zinc-400">Showing {visible.length} of {notifications.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

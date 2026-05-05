import { Link } from 'react-router-dom'
import { ArrowRight, Activity, LogIn, LogOut, UserPlus, Pencil, Trash2, ShieldCheck, ShieldOff } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import { useAuditLog } from '@/features/audit-log'
import type { AuditAction } from '@/features/audit-log/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/utils/cn'

const cfg: Record<AuditAction, { icon: LucideIcon; bg: string; color: string }> = {
  login:   { icon: LogIn,       bg: 'bg-emerald-50', color: 'text-emerald-600' },
  logout:  { icon: LogOut,      bg: 'bg-zinc-100',   color: 'text-zinc-500' },
  create:  { icon: UserPlus,    bg: 'bg-blue-50',    color: 'text-blue-600' },
  update:  { icon: Pencil,      bg: 'bg-amber-50',   color: 'text-amber-600' },
  delete:  { icon: Trash2,      bg: 'bg-red-50',     color: 'text-red-600' },
  approve: { icon: ShieldCheck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  reject:  { icon: ShieldOff,   bg: 'bg-red-50',     color: 'text-red-600' },
}

const PREVIEW_COUNT = 6

export function RecentActivityWidget() {
  const { data: entries = [] } = useAuditLog()
  const recent = entries.slice(0, PREVIEW_COUNT)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between flex">
        <CardTitle>Recent Activity</CardTitle>
        <Link to="/module/mis/activity" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Activity className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-[13px] text-zinc-500">No activity yet</p>
          </div>
        ) : (
          <ul>
            {recent.map((a, i) => {
              const c = cfg[a.action]
              const Icon = c.icon
              return (
                <li
                  key={a.id}
                  className={cn(
                    'flex items-start gap-3 px-6 py-3',
                    i !== recent.length - 1 && 'border-b border-zinc-100/60',
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', c.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', c.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Avatar name={a.userName} size="sm" />
                      <span className="text-[12px] font-medium text-zinc-900">{a.userName}</span>
                      <span className="text-[11px] uppercase tracking-wide text-zinc-400 font-semibold">{a.module}</span>
                    </div>
                    <p className="text-[12px] text-zinc-600 mt-0.5 truncate">{a.detail}</p>
                  </div>
                  <span className="text-[11px] text-zinc-400 flex-shrink-0 mt-1.5 whitespace-nowrap">
                    {formatDistanceToNow(parseISO(a.timestamp), { addSuffix: true })}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

import { useMemo, useState } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { LogIn, LogOut, UserPlus, Pencil, Trash2, ShieldCheck, ShieldOff, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuditLog } from '@/features/audit-log'
import type { AuditAction, AuditEntry } from '@/features/audit-log/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Avatar } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { ExportMenu } from '@/shared/ui/export-menu'
import { EmptyState } from '@/shared/ui/empty-state'
import { SearchInput } from '@/shared/ui/search-input'
import { FilterChips } from '@/shared/ui/filter-chips'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'

const typeConfig: Record<AuditAction, { icon: LucideIcon; bg: string; color: string; label: string }> = {
  login:   { icon: LogIn,       bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Login' },
  logout:  { icon: LogOut,      bg: 'bg-zinc-100',   color: 'text-zinc-500',    label: 'Logout' },
  create:  { icon: UserPlus,    bg: 'bg-blue-50',    color: 'text-blue-600',    label: 'Create' },
  update:  { icon: Pencil,      bg: 'bg-amber-50',   color: 'text-amber-600',   label: 'Update' },
  delete:  { icon: Trash2,      bg: 'bg-red-50',     color: 'text-red-600',     label: 'Delete' },
  approve: { icon: ShieldCheck, bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Approve' },
  reject:  { icon: ShieldOff,   bg: 'bg-red-50',     color: 'text-red-600',     label: 'Reject' },
}

const filterOptions: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
]

export function ActivityPage() {
  const { data: entries = [], isLoading } = useAuditLog()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<AuditAction | 'all'>('all')

  const filtered = useMemo<AuditEntry[]>(() => {
    const q = query.toLowerCase()
    return entries.filter((a) => {
      if (filter !== 'all' && a.action !== filter) return false
      if (!q) return true
      return (
        a.userName.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.module.toLowerCase().includes(q)
      )
    })
  }, [entries, query, filter])

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={`${entries.length} event${entries.length === 1 ? '' : 's'} across all modules`}
        actions={
          <ExportMenu
            rows={entries as unknown as Record<string, unknown>[]}
            baseFilename="activity-feed"
            sheetName="Activity"
            pdfTitle="MIS Activity Feed"
            pdfSubtitle={`${entries.length} event${entries.length === 1 ? '' : 's'} recorded across modules`}
            columns={[
              { key: 'timestamp', label: 'Timestamp' },
              { key: 'userName', label: 'User' },
              { key: 'action', label: 'Action' },
              { key: 'module', label: 'Module' },
              { key: 'detail', label: 'Detail' },
            ]}
          />
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search users, modules, or details..."
            className="flex-1"
          />
          <FilterChips value={filter} onChange={setFilter} options={filterOptions} />
        </CardContent>
      </Card>

      {isLoading ? (
        <TableSkeleton columns={4} rows={6} />
      ) : (
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState icon={Activity} title="No activity found" description="Try adjusting your search or filters." />
            ) : (
              <ul>
                {filtered.map((a, i) => {
                  const cfg = typeConfig[a.action]
                  const Icon = cfg.icon
                  const time = parseISO(a.timestamp)
                  return (
                    <li key={a.id} className={cn('flex items-start gap-4 px-6 py-4', i !== filtered.length - 1 && 'border-b border-zinc-100/60')}>
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                        <Icon className={cn('w-[18px] h-[18px]', cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar name={a.userName} size="sm" />
                          <span className="text-[13px] font-medium text-zinc-900">{a.userName}</span>
                          <span className="text-[13px] text-zinc-500 truncate">{a.detail}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-zinc-400">
                          <Badge variant="outline" size="sm">{cfg.label}</Badge>
                          <Badge variant="outline" size="sm">{a.module}</Badge>
                          <span title={format(time, 'PPpp')}>{formatDistanceToNow(time, { addSuffix: true })}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

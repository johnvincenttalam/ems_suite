import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Phone, Building2, Briefcase, ArrowUpRight } from 'lucide-react'
import { Avatar } from '@/shared/ui/avatar'
import { StatusBadge } from '@/shared/ui/status-badge'
import { useClickOutside } from '@/shared/hooks/use-click-outside'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { getModulePath } from '@/config/modules'
import { cn } from '@/shared/utils/cn'
import type { User } from '@/features/users/types'

interface UserInfoPopoverProps {
  user: User
  children: ReactNode
  /** Visual alignment of the popover relative to the trigger. Default 'start'. */
  align?: 'start' | 'end'
  className?: string
}

/**
 * Wraps a trigger (avatar / pill / name button) so clicking it opens a small
 * popover with the user's identifying details — name, position, department,
 * email, phone, status. Click-outside dismisses.
 */
export function UserInfoPopover({ user, children, align = 'start', className }: UserInfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const { data: departments = [] } = useDepartments()
  const dept = user.departmentId ? departments.find((d) => d.id === user.departmentId) : undefined
  const navigate = useNavigate()
  const selectedModule = useAuthStore((s) => s.selectedModule)

  useClickOutside(containerRef as React.RefObject<HTMLElement>, () => setOpen(false), open)

  return (
    <span ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-zinc-900/10"
      >
        {children}
      </button>
      {open && (
        <div
          role="dialog"
          className={cn(
            'absolute top-full mt-1.5 z-50 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg p-4',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">{user.name}</p>
              {user.position && (
                <p className="text-[12px] text-zinc-600 leading-tight mt-0.5 truncate">{user.position}</p>
              )}
              <div className="mt-1.5">
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5 text-[12px] text-zinc-600">
            {user.position && (
              <li className="flex items-start gap-2">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span className="truncate">{user.position}</span>
              </li>
            )}
            {dept && (
              <li className="flex items-start gap-2">
                <Building2 className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span className="truncate">{dept.name}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              <a
                href={`mailto:${user.email}`}
                className="truncate hover:text-zinc-900 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {user.email}
              </a>
            </li>
            {user.phone && (
              <li className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                <a
                  href={`tel:${user.phone}`}
                  className="truncate hover:text-zinc-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {user.phone}
                </a>
              </li>
            )}
          </ul>

          {selectedModule && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                navigate(getModulePath(selectedModule, `users/${user.id}`))
              }}
              className="mt-3 w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-zinc-200 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              View full profile
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </span>
  )
}

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useUsers } from '@/features/users'
import { useClickOutside } from '@/shared/hooks/use-click-outside'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/utils/cn'
import type { ModuleKey } from '@/config/modules'

const MODULE_LABEL: Record<ModuleKey, string> = {
  mis: 'MIS',
  sdms: 'SDMS',
  inventory: 'Inv',
  assets: 'Assets',
  fleet: 'Fleet',
  procurement: 'Proc',
  maintenance: 'Maint',
}

export function UserSwitcher() {
  const { user, switchUser } = useAuthStore()
  const { data: users = [] } = useUsers()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setOpen(false), open)

  const activeUsers = users.filter((u) => u.status === 'active')

  const onPick = async (email: string) => {
    setOpen(false)
    if (email === user?.email) return
    const ok = await switchUser(email)
    if (ok) {
      toast.success(`Switched to ${email}`)
      navigate('/')
    } else {
      toast.error('Switch failed')
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch user"
        title="Switch user"
        className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
      >
        <Repeat2 className="w-[18px] h-[18px]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-zinc-200/60 py-2 z-50 max-h-[70vh] overflow-y-auto">
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Switch User</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Mock auth — no password needed.</p>
          </div>
          <div className="py-1">
            {activeUsers.map((u) => {
              const isCurrent = u.email === user?.email
              return (
                <button
                  key={u.id}
                  onClick={() => onPick(u.email)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                    isCurrent ? 'bg-zinc-50' : 'hover:bg-zinc-50',
                  )}
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{u.name}</p>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{u.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.modules.map((m) => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          {MODULE_LABEL[m]}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

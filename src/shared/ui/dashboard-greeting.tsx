import { format } from 'date-fns'
import { useAuthStore } from '@/features/auth/store/auth-store'

interface DashboardGreetingProps {
  subtitle: string
  actions?: React.ReactNode
}

export function DashboardGreeting({ subtitle, actions }: DashboardGreetingProps) {
  const { user } = useAuthStore()
  const firstName = user?.name?.split(' ')[0] ?? ''
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p className="text-[12px] text-zinc-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight mt-1">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-[13px] text-zinc-500 mt-1">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

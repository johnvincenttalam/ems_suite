import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
      )}
      <h3 className="text-sm font-medium text-zinc-700 mb-1">{title}</h3>
      {description && <p className="text-[13px] text-zinc-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

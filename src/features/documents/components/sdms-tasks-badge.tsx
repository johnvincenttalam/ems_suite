import { useSdmsTaskBuckets } from '@/features/documents/hooks/use-sdms-task-buckets'
import { cn } from '@/shared/utils/cn'

interface SdmsTasksBadgeProps {
  className?: string
}

export function SdmsTasksBadge({ className }: SdmsTasksBadgeProps) {
  const { pending } = useSdmsTaskBuckets()
  const count = pending.length

  if (count === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold tabular-nums',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

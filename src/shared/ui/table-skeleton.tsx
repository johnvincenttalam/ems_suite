import { cn } from '@/shared/utils/cn'

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-zinc-100', className)} />
  )
}

interface TableSkeletonProps {
  columns?: number
  rows?: number
}

export function TableSkeleton({ columns = 6, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-50/50 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-4 flex items-center gap-4 border-b border-zinc-100/60">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Shimmer
              key={colIdx}
              className={cn(
                'h-3 flex-1',
                colIdx === 0 && 'max-w-[180px]',
                colIdx === columns - 1 && 'max-w-[80px]',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Shimmer className="h-2.5 w-24" />
          <Shimmer className="h-6 w-20" />
        </div>
        <Shimmer className="w-9 h-9 rounded-lg" />
      </div>
    </div>
  )
}

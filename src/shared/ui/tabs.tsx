import { cn } from '@/shared/utils/cn'

interface TabItem {
  label: string
  value: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-5 border-b border-zinc-200/80 overflow-x-auto',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative py-2.5 text-[13px] font-medium transition-colors cursor-pointer',
              'inline-flex items-center gap-1.5 whitespace-nowrap',
              'after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors',
              active
                ? 'text-zinc-900 after:bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 after:bg-transparent'
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn(
                'tabular-nums text-[11.5px] font-normal',
                active ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

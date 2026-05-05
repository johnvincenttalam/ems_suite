import { cn } from '@/shared/utils/cn'

interface FilterChipOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface FilterChipsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: FilterChipOption<T>[]
  className?: string
  size?: 'sm' | 'md'
}

export function FilterChips<T extends string>({ value, onChange, options, className, size = 'md' }: FilterChipsProps<T>) {
  const padding = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'

  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5',
            padding,
            value === opt.value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className={cn(
              'inline-flex items-center justify-center min-w-[18px] px-1 rounded-full text-[10px] font-semibold',
              value === opt.value ? 'bg-white/20 text-white' : 'bg-zinc-200/60 text-zinc-500'
            )}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

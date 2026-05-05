import { cn } from '@/shared/utils/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function Toggle({ checked, onChange, disabled, size = 'md', className }: ToggleProps) {
  const isSm = size === 'sm'
  // Track: md = 44x24, thumb 20x20, on-offset = 44-20-2 = 22
  // Track: sm = 36x20, thumb 16x16, on-offset = 36-16-2 = 18
  const track = isSm ? 'w-9 h-5' : 'w-11 h-6'
  const thumb = isSm ? 'w-4 h-4' : 'w-5 h-5'
  const onOffset = isSm ? 'translate-x-[18px]' : 'translate-x-[22px]'
  const thumbTranslate = checked ? onOffset : 'translate-x-0.5'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'rounded-full relative transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        track,
        checked ? 'bg-zinc-900' : 'bg-zinc-200',
        className
      )}
    >
      <span
        className={cn(
          'rounded-full bg-white border border-zinc-200/80 absolute top-0.5 left-0 transition-transform',
          thumb,
          thumbTranslate
        )}
      />
    </button>
  )
}

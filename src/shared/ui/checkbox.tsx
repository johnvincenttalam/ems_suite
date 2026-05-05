import { Check, Minus } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function Checkbox({ checked, indeterminate, onChange, disabled, size = 'sm', className }: CheckboxProps) {
  const box = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const icon = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const radius = size === 'sm' ? 'rounded' : 'rounded-md'
  const active = checked || indeterminate

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        box, radius,
        active ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300 hover:border-zinc-400',
        className
      )}
    >
      {indeterminate ? (
        <Minus className={cn(icon, 'text-white')} strokeWidth={3} />
      ) : checked ? (
        <Check className={cn(icon, 'text-white')} strokeWidth={3} />
      ) : null}
    </button>
  )
}

import { cn } from '@/shared/utils/cn'
import { cva, type VariantProps } from 'class-variance-authority'

const dotColors: Record<string, string> = {
  default: 'bg-zinc-400',
  success: 'bg-emerald-500',
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  outline: 'bg-zinc-400',
  purple: 'bg-violet-500',
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-600',
        success: 'bg-zinc-100 text-zinc-700',
        danger: 'bg-zinc-100 text-zinc-700',
        warning: 'bg-zinc-100 text-zinc-700',
        info: 'bg-zinc-100 text-zinc-700',
        outline: 'border border-zinc-200 text-zinc-600',
        purple: 'bg-zinc-100 text-zinc-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2 py-0.5 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant, size, dot = true, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && variant && variant !== 'default' && variant !== 'outline' && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant ?? 'default'])} />
      )}
      {children}
    </span>
  )
}

import { forwardRef } from 'react'
import { cn } from '@/shared/utils/cn'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-[13px]',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover focus:ring-accent/40',
        secondary: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 focus:ring-zinc-300',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400',
        ghost: 'text-zinc-600 hover:bg-zinc-100 focus:ring-zinc-300',
        outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 focus:ring-zinc-300',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-[13px]',
        lg: 'px-5 py-2.5 text-sm',
        xl: 'px-8 py-4 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'

import { forwardRef } from 'react'
import { cn } from '@/shared/utils/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-[13px] font-medium text-zinc-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-3 py-2.5 bg-white border rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-colors',
            error ? 'border-red-300' : 'border-zinc-200',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

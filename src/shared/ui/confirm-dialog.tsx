import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { Modal } from './modal'
import { Button } from './button'
import { cn } from '@/shared/utils/cn'

type Tone = 'default' | 'danger' | 'warning'

interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string
  /** Visual tone of the confirm button + icon. `danger` for destructive actions
   * (delete, force-overwrite), `warning` for actions with side effects
   * (resubmit clears signatures), `default` for neutral confirms. */
  tone?: Tone
  /** Optional icon override; defaults to AlertTriangle for danger/warning. */
  icon?: LucideIcon
  /** Disables the buttons while an async confirm is in flight. */
  busy?: boolean
}

const toneIconClass: Record<Tone, string> = {
  default: 'text-zinc-500 bg-zinc-100',
  warning: 'text-amber-700 bg-amber-100',
  danger: 'text-red-700 bg-red-100',
}

const toneButtonVariant: Record<Tone, 'primary' | 'danger'> = {
  default: 'primary',
  warning: 'primary',
  danger: 'danger',
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  icon,
  busy = false,
}: ConfirmDialogProps) {
  const Icon = icon ?? AlertTriangle

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={toneButtonVariant[tone]} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        {tone !== 'default' && (
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', toneIconClass[tone])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
          <div className="text-[13px] text-zinc-600 mt-1.5">{message}</div>
        </div>
      </div>
    </Modal>
  )
}

import { useState, useCallback } from 'react'
import { PenLine, Upload } from 'lucide-react'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { cn } from '@/shared/utils/cn'
import { SignaturePad } from './signature-pad'
import { SignatureUpload } from './signature-upload'

type Mode = 'draw' | 'upload'

interface SignatureModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (signatureImage: string, comment?: string) => void
  title: string
  busy?: boolean
}

export function SignatureModal({ open, onClose, onConfirm, title, busy }: SignatureModalProps) {
  const [mode, setMode] = useState<Mode>('draw')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const reset = useCallback(() => {
    setMode('draw')
    setSignatureImage(null)
    setComment('')
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleModeSwitch = (m: Mode) => {
    setMode(m)
    setSignatureImage(null)
  }

  const handleConfirm = () => {
    if (!signatureImage) return
    onConfirm(signatureImage, comment.trim() || undefined)
    reset()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="success" loading={busy} disabled={!signatureImage} onClick={handleConfirm}>
            Confirm Signature
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 w-fit">
          <button
            type="button"
            onClick={() => handleModeSwitch('draw')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
              mode === 'draw' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <PenLine className="w-3.5 h-3.5" />
            Draw
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('upload')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
              mode === 'upload' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>

        {mode === 'draw' ? (
          <SignaturePad onCapture={setSignatureImage} onClear={() => setSignatureImage(null)} />
        ) : (
          <SignatureUpload signatureImage={signatureImage} onCapture={setSignatureImage} onRemove={() => setSignatureImage(null)} />
        )}

        {signatureImage && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Preview</p>
            <div className="surface-paper rounded-lg border border-zinc-200 p-2 flex items-center justify-center">
              <img src={signatureImage} alt="Signature preview" className="max-h-[120px] object-contain" />
            </div>
          </div>
        )}

        <Textarea
          label="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Reviewed and approved..."
        />
      </div>
    </Modal>
  )
}

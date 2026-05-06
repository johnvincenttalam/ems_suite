import { useRef, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/shared/ui/button'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
  onCapture: (dataUrl: string) => void
  onClear: () => void
}

export function SignaturePad({ onCapture, onClear }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null)

  const handleEnd = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      onCapture(sigRef.current.toDataURL('image/png'))
    }
  }, [onCapture])

  const handleClear = useCallback(() => {
    sigRef.current?.clear()
    onClear()
  }, [onClear])

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-zinc-200 bg-white cursor-crosshair overflow-hidden">
        <SignatureCanvas
          ref={sigRef}
          penColor="#18181b"
          canvasProps={{
            className: 'w-full',
            style: { width: '100%', height: 200 },
          }}
          onEnd={handleEnd}
        />
      </div>
      <Button type="button" variant="ghost" size="sm" leftIcon={<Eraser className="w-3.5 h-3.5" />} onClick={handleClear}>
        Clear
      </Button>
    </div>
  )
}

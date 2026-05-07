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
    const ref = sigRef.current
    if (!ref || ref.isEmpty()) return
    // getTrimmedCanvas crops to ink bounds (nicer fit in the slot), but the
    // implementation can throw on certain canvas states. Fall back to the raw
    // canvas so confirmation never gets blocked.
    let dataUrl: string
    try {
      const trim = (ref as unknown as { getTrimmedCanvas?: () => HTMLCanvasElement }).getTrimmedCanvas
      const canvas = typeof trim === 'function' ? trim.call(ref) : ref.getCanvas()
      dataUrl = canvas.toDataURL('image/png')
    } catch {
      dataUrl = ref.getCanvas().toDataURL('image/png')
    }
    onCapture(dataUrl)
  }, [onCapture])

  const handleClear = useCallback(() => {
    sigRef.current?.clear()
    onClear()
  }, [onClear])

  return (
    <div className="space-y-2">
      <div className="surface-paper rounded-lg border border-zinc-200 cursor-crosshair overflow-hidden">
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

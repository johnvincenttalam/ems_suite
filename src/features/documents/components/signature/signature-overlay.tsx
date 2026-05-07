import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'
import type { SignatureSlot } from '@/features/documents/types'
import { toPixels, type PixelRect } from './signature-coords'

interface SignatureOverlayProps {
  slot: SignatureSlot
  signatureImage?: string
  signerName?: string
  empty?: boolean
}

export function SignatureOverlay({ slot, signatureImage, signerName, empty }: SignatureOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<PixelRect>({ left: 0, top: 0, width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!parent) return
    const measure = () => {
      const { width, height } = parent.getBoundingClientRect()
      setRect(toPixels(slot, width, height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [slot])

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', ...rect, pointerEvents: 'none' }}
      className={cn(
        empty && 'border border-dashed border-amber-400/70 bg-amber-50/30 rounded-sm',
      )}
    >
      {empty ? (
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[9px] font-medium uppercase tracking-wider text-amber-600/80 select-none">
          {signerName ? `Awaiting ${signerName}` : 'Awaiting signature'}
        </span>
      ) : signatureImage ? (
        <img
          src={signatureImage}
          alt={signerName ? `Signature by ${signerName}` : 'Signature'}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : null}
    </div>
  )
}

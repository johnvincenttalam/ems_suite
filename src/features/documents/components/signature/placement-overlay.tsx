import { useEffect, useRef, useState } from 'react'
import type { SignatureSlot } from '@/features/documents/types'

interface PlacementOverlayProps {
  active: boolean
  page: number
  /** Called once with the captured rectangle when the user releases. The
   * caller is responsible for picking a key, opening the signature modal,
   * etc. */
  onPlaced: (slot: Omit<SignatureSlot, 'key'>) => void
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

export function PlacementOverlay({ active, page, onPlaced }: PlacementOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  const capturedPointerRef = useRef<number | null>(null)
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null)
  const [to, setTo] = useState<{ x: number; y: number } | null>(null)

  // If the parent flips active to false mid-drag (e.g., user clicks Cancel
  // outside the overlay), release any held pointer capture and reset state.
  useEffect(() => {
    if (active) return
    const captured = capturedPointerRef.current
    if (captured !== null) {
      ref.current?.releasePointerCapture?.(captured)
      capturedPointerRef.current = null
    }
    setFrom(null)
    setTo(null)
  }, [active])

  const norm = (e: React.PointerEvent): { x: number; y: number } => {
    const el = ref.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    }
  }

  const handleDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const p = norm(e)
    setFrom(p)
    setTo(p)
    ref.current?.setPointerCapture?.(e.pointerId)
    capturedPointerRef.current = e.pointerId
  }
  const handleMove = (e: React.PointerEvent) => {
    if (!from) return
    setTo(norm(e))
  }
  const handleUp = (e: React.PointerEvent) => {
    if (from && to) {
      const x = Math.min(from.x, to.x)
      const y = Math.min(from.y, to.y)
      const width = Math.abs(to.x - from.x)
      const height = Math.abs(to.y - from.y)
      if (width > 0.02 && height > 0.01) {
        onPlaced({ page, x, y, width, height })
      }
    }
    setFrom(null)
    setTo(null)
    ref.current?.releasePointerCapture?.(e.pointerId)
    capturedPointerRef.current = null
  }

  if (!active) return null

  const drawing = from && to
    ? {
        left: `${Math.min(from.x, to.x) * 100}%`,
        top: `${Math.min(from.y, to.y) * 100}%`,
        width: `${Math.abs(to.x - from.x) * 100}%`,
        height: `${Math.abs(to.y - from.y) * 100}%`,
      }
    : null

  return (
    <div
      ref={ref}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none' }}
      className="bg-zinc-900/[0.04]"
    >
      {drawing && (
        <div
          style={{ position: 'absolute', ...drawing, pointerEvents: 'none' }}
          className="border-2 border-dashed border-emerald-500 bg-emerald-50/30"
        />
      )}
    </div>
  )
}

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { SignatureSlot } from '@/features/documents/types'
import { Spinner } from '@/shared/ui/spinner'
import { cn } from '@/shared/utils/cn'
import { safeAssetUrl } from '@/features/documents/lib/safe-asset-url'

const PdfPageWithSize = lazy(() => import('./pdf-page'))

type AssetType = 'image' | 'pdf'

function detectAssetType(url: string): AssetType {
  const ext = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  return 'image'
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

function nextSlotKey(slots: SignatureSlot[]): string {
  const used = new Set(slots.map((s) => s.key))
  let i = slots.length + 1
  while (used.has(`slot_${i}`)) i++
  return `slot_${i}`
}

interface SignatureSlotEditorProps {
  referenceUrl: string
  slots: SignatureSlot[]
  onChange: (slots: SignatureSlot[]) => void
  approverNames?: string[]
}

type Op =
  | { kind: 'draw'; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: 'move'; key: string; mouseStart: { x: number; y: number }; slotStart: SignatureSlot }
  | { kind: 'resize'; key: string; mouseStart: { x: number; y: number }; slotStart: SignatureSlot }

export function SignatureSlotEditor({ referenceUrl, slots, onChange, approverNames }: SignatureSlotEditorProps) {
  const safeUrl = safeAssetUrl(referenceUrl)
  const assetType = safeUrl ? detectAssetType(safeUrl) : 'image'
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedKey(null)
  }, [page, referenceUrl])

  const slotsForPage = slots.filter((s) => s.page === page)

  const norm = useCallback((e: React.PointerEvent | PointerEvent): { x: number; y: number } => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    }
  }, [])

  const handleSurfacePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.slotControl) return
    e.preventDefault()
    const p = norm(e)
    setSelectedKey(null)
    setOp({ kind: 'draw', from: p, to: p })
    containerRef.current?.setPointerCapture?.(e.pointerId)
  }

  const handleSlotPointerDown = (e: React.PointerEvent, slot: SignatureSlot, kind: 'move' | 'resize') => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedKey(slot.key)
    setOp({ kind, key: slot.key, mouseStart: norm(e), slotStart: slot })
    containerRef.current?.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!op) return
    const cur = norm(e)
    if (op.kind === 'draw') {
      setOp({ ...op, to: cur })
    } else if (op.kind === 'move') {
      const dx = cur.x - op.mouseStart.x
      const dy = cur.y - op.mouseStart.y
      const next = slots.map((s) =>
        s.key === op.key
          ? {
              ...s,
              x: clamp(op.slotStart.x + dx, 0, 1 - s.width),
              y: clamp(op.slotStart.y + dy, 0, 1 - s.height),
            }
          : s,
      )
      onChange(next)
    } else if (op.kind === 'resize') {
      const dx = cur.x - op.mouseStart.x
      const dy = cur.y - op.mouseStart.y
      const next = slots.map((s) =>
        s.key === op.key
          ? {
              ...s,
              width: clamp(op.slotStart.width + dx, 0.02, 1 - s.x),
              height: clamp(op.slotStart.height + dy, 0.01, 1 - s.y),
            }
          : s,
      )
      onChange(next)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!op) return
    if (op.kind === 'draw') {
      const x0 = Math.min(op.from.x, op.to.x)
      const y0 = Math.min(op.from.y, op.to.y)
      const w = Math.abs(op.to.x - op.from.x)
      const h = Math.abs(op.to.y - op.from.y)
      if (w > 0.02 && h > 0.01) {
        const newSlot: SignatureSlot = { key: nextSlotKey(slots), page, x: x0, y: y0, width: w, height: h }
        onChange([...slots, newSlot])
        setSelectedKey(newSlot.key)
      }
    }
    setOp(null)
    containerRef.current?.releasePointerCapture?.(e.pointerId)
  }

  const removeSlot = (key: string) => {
    onChange(slots.filter((s) => s.key !== key))
    if (selectedKey === key) setSelectedKey(null)
  }

  const renameSlot = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || slots.some((s) => s.key === newKey && s.key !== oldKey)) return
    onChange(slots.map((s) => (s.key === oldKey ? { ...s, key: newKey } : s)))
    if (selectedKey === oldKey) setSelectedKey(newKey)
  }

  const drawingRect = op?.kind === 'draw'
    ? {
        left: Math.min(op.from.x, op.to.x) * 100,
        top: Math.min(op.from.y, op.to.y) * 100,
        width: Math.abs(op.to.x - op.from.x) * 100,
        height: Math.abs(op.to.y - op.from.y) * 100,
      }
    : null

  return (
    <div className="space-y-3">
      {assetType === 'pdf' && numPages > 1 && (
        <div className="flex items-center gap-2 text-[12px] text-zinc-600">
          <span>Page</span>
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="px-2 py-1 rounded-md border border-zinc-200 bg-white text-[12px]"
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {p} of {numPages}
              </option>
            ))}
          </select>
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-500">{slotsForPage.length} slot{slotsForPage.length === 1 ? '' : 's'} on this page</span>
        </div>
      )}

      <div
        ref={containerRef}
        onPointerDown={handleSurfacePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative mx-auto bg-white border border-zinc-200/60 shadow-sm select-none touch-none"
        style={{ maxWidth: 720, cursor: op?.kind === 'draw' ? 'crosshair' : 'default' }}
      >
        {!safeUrl ? (
          <div className="py-16 text-center text-[12px] text-red-700">
            Unsupported reference URL — must be a relative path, http(s), or blob.
          </div>
        ) : assetType === 'image' ? (
          <img src={safeUrl} alt="Reference document" className="block w-full h-auto pointer-events-none" draggable={false} />
        ) : (
          <Suspense fallback={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}>
            <PdfPageWithSize url={safeUrl} page={page} onLoadSuccess={(n) => setNumPages(n)} />
          </Suspense>
        )}

        {slotsForPage.map((slot) => {
          const selected = slot.key === selectedKey
          const expectedName = approverNames?.[slots.indexOf(slot)]
          return (
            <div
              key={slot.key}
              data-slot-control="1"
              onPointerDown={(e) => handleSlotPointerDown(e, slot, 'move')}
              style={{
                position: 'absolute',
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.width * 100}%`,
                height: `${slot.height * 100}%`,
                cursor: 'move',
              }}
              className={cn(
                'border-2 rounded-sm',
                selected
                  ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200'
                  : 'border-amber-400/80 bg-amber-50/40 hover:border-amber-500',
              )}
            >
              <span className="absolute -top-5 left-0 text-[10px] font-medium uppercase tracking-wider text-zinc-600 whitespace-nowrap pointer-events-none">
                {slot.key}
                {expectedName && <span className="text-zinc-400 normal-case ml-1">· {expectedName}</span>}
              </span>
              <div
                data-slot-control="1"
                onPointerDown={(e) => handleSlotPointerDown(e, slot, 'resize')}
                className={cn(
                  'absolute right-0 bottom-0 w-3 h-3 translate-x-1/2 translate-y-1/2 rounded-sm border bg-white',
                  selected ? 'border-emerald-500' : 'border-amber-500',
                )}
                style={{ cursor: 'nwse-resize' }}
              />
            </div>
          )
        })}

        {drawingRect && (
          <div
            style={{
              position: 'absolute',
              left: `${drawingRect.left}%`,
              top: `${drawingRect.top}%`,
              width: `${drawingRect.width}%`,
              height: `${drawingRect.height}%`,
              pointerEvents: 'none',
            }}
            className="border-2 border-dashed border-emerald-500 bg-emerald-50/30"
          />
        )}
      </div>

      {slotsForPage.length === 0 ? (
        <p className="text-[12px] text-zinc-500 px-3 py-2 rounded-md bg-zinc-50 border border-zinc-100">
          Click and drag on the document to draw a signature slot. Each slot represents where a signature will be placed.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {slotsForPage.map((slot) => {
            const idx = slots.indexOf(slot)
            const selected = slot.key === selectedKey
            return (
              <li
                key={slot.key}
                onClick={() => setSelectedKey(slot.key)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors',
                  selected ? 'border-emerald-300 bg-emerald-50/50' : 'border-zinc-200 hover:border-zinc-300 bg-white',
                )}
              >
                <span className="text-[10px] font-mono text-zinc-400">{idx + 1}.</span>
                <input
                  value={slot.key}
                  onChange={(e) => renameSlot(slot.key, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 px-2 py-1 rounded border border-transparent bg-transparent text-[12px] font-mono focus:bg-white focus:border-zinc-200 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 tabular-nums whitespace-nowrap">
                  {Math.round(slot.x * 100)},{Math.round(slot.y * 100)} · {Math.round(slot.width * 100)}×{Math.round(slot.height * 100)}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSlot(slot.key) }}
                  className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

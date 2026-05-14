import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp } from 'lucide-react'
import type { AppDocument, SignatureSlot } from '@/features/documents/types'
import { Spinner } from '@/shared/ui/spinner'
import { cn } from '@/shared/utils/cn'
import { SignatureLayer, PlacementOverlay } from './signature'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfViewerProps {
  doc: AppDocument
  url: string
  userMap: Record<string, { name: string } | undefined>
  placementMode?: boolean
  onSlotPlaced?: (slot: Omit<SignatureSlot, 'key'>) => void
  /** Where to render the page navigator. `top-sticky` (default) is the SDMS
   * viewer behavior — the bar sticks under the topbar while scrolling. `bottom`
   * places it as a fixed bar at the bottom of the viewer, useful inside slide-in
   * drawers where the topbar sticky offset doesn't apply. */
  toolbarPosition?: 'top-sticky' | 'bottom'
  /** Optional node rendered to the right of the centred paginator. Used by
   * SDMS to attach a Cancel-placement button so it stays as visible as the
   * page controls while the user scrolls a long document. */
  toolbarRightSlot?: React.ReactNode
}

export default function PdfViewer({ doc, url, userMap, placementMode, onSlotPlaced, toolbarPosition = 'top-sticky', toolbarRightSlot }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [numPages, setNumPages] = useState<number>(0)
  const [width, setWidth] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageInputValue, setPageInputValue] = useState<string>('1')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setWidth(el.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Track which page is most visible in the viewport.
  useEffect(() => {
    if (numPages === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length === 0) return
        const target = visible[0].target as HTMLElement
        const pageNum = Number(target.dataset.page)
        if (pageNum) setCurrentPage(pageNum)
      },
      { threshold: [0.25, 0.5, 0.75] },
    )
    pageRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [numPages])

  useEffect(() => {
    setPageInputValue(String(currentPage))
  }, [currentPage])

  const scrollToPage = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), numPages)
    const el = pageRefs.current.get(clamped)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const setPageRef = (page: number) => (el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(page, el)
    else pageRefs.current.delete(page)
  }

  const showToolbar = numPages > 1

  const pages = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages])

  // 3-zone toolbar layout: scroll-jump (left) · paginator (centered) · slot (right).
  // grid-cols-[1fr_auto_1fr] keeps the paginator perfectly centered regardless
  // of what's in the side zones. Each zone is its own pill so the shapes read
  // as separate controls instead of a single oversized bar.
  const toolbar = showToolbar ? (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto_1fr] items-center gap-2',
        toolbarPosition === 'top-sticky'
          ? 'sticky top-[calc(var(--topbar-h)+1rem)] z-10 mb-3'
          : 'sticky bottom-2 z-10 mt-3',
      )}
    >
      <div className="justify-self-start">
        <ScrollJumpButton />
      </div>
      <div className="justify-self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200/60 bg-white/95 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => scrollToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 rounded text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 text-[12px] text-zinc-700 px-1">
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageInputValue}
            onChange={(e) => setPageInputValue(e.target.value)}
            onBlur={() => {
              const n = Number(pageInputValue)
              const target = Number.isFinite(n) && n >= 1
                ? Math.min(Math.max(Math.floor(n), 1), numPages)
                : currentPage
              scrollToPage(target)
              setPageInputValue(String(target))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.currentTarget as HTMLInputElement).blur()
              }
            }}
            className="w-10 px-1 py-0.5 text-center tabular-nums border border-zinc-200 rounded text-[12px] focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <span className="text-zinc-400">of {numPages}</span>
        </div>
        <button
          type="button"
          onClick={() => scrollToPage(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="p-1 rounded text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="justify-self-end">
        {toolbarRightSlot}
      </div>
    </div>
  ) : null

  return (
    <div ref={containerRef} className="rounded-lg border border-zinc-200/60 bg-zinc-100/50 p-4">
      {error ? (
        <div className="py-12 text-center text-[13px] text-red-700">{error}</div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(err) => setError(err.message || 'Failed to load PDF')}
          loading={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}
        >
          {toolbarPosition === 'top-sticky' && toolbar}

          <div className="space-y-4">
            {pages.map((page) => (
              <div
                key={page}
                ref={setPageRef(page)}
                data-page={page}
                className="surface-paper relative mx-auto shadow-sm"
                style={{ maxWidth: 800 }}
              >
                <Page pageNumber={page} width={Math.min(width - 32, 800)} renderAnnotationLayer={false} renderTextLayer={false} />
                <SignatureLayer doc={doc} page={page} userMap={userMap} />
                {placementMode && onSlotPlaced && (
                  <PlacementOverlay active page={page} onPlaced={onSlotPlaced} />
                )}
              </div>
            ))}
          </div>

          {toolbarPosition === 'bottom' && toolbar}
        </Document>
      )}
    </div>
  )
}

/**
 * Smart scroll-jump button — single control that toggles its target based on
 * the user's current vertical position. When in the top half of the page, the
 * label/icon point to the bottom; once you cross 50% scroll, it morphs to
 * point back at the top. Hidden when the page doesn't actually scroll.
 *
 * Lives in the PdfViewer toolbar so it sits in the same sticky band as the
 * paginator + cancel slot — naturally in the user's attention path.
 */
function ScrollJumpButton() {
  const [canScroll, setCanScroll] = useState(false)
  const [aimBottom, setAimBottom] = useState(true)

  useEffect(() => {
    const recompute = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setCanScroll(max > 40)
      if (max <= 0) return
      const pct = window.scrollY / max
      setAimBottom(pct < 0.5)
    }
    recompute()
    window.addEventListener('scroll', recompute, { passive: true })
    window.addEventListener('resize', recompute, { passive: true })
    return () => {
      window.removeEventListener('scroll', recompute)
      window.removeEventListener('resize', recompute)
    }
  }, [])

  if (!canScroll) return null

  const onClick = () => {
    const target = aimBottom ? document.documentElement.scrollHeight : 0
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  const Icon = aimBottom ? ChevronsDown : ChevronsUp
  const label = aimBottom ? 'Jump to bottom' : 'Jump to top'

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200/60 bg-white/95 shadow-sm backdrop-blur text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors text-[12px]"
    >
      <Icon className="w-4 h-4" />
      <span>{aimBottom ? 'Bottom' : 'Top'}</span>
    </button>
  )
}

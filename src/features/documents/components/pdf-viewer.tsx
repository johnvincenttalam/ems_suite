import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { AppDocument } from '@/features/documents/types'
import { Spinner } from '@/shared/ui/spinner'
import { SignatureLayer } from './signature'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfViewerProps {
  doc: AppDocument
  url: string
  userMap: Record<string, { name: string }>
}

export default function PdfViewer({ doc, url, userMap }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [width, setWidth] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setWidth(el.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
          <div className="space-y-4">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
              <div key={page} className="relative mx-auto bg-white shadow-sm" style={{ maxWidth: 800 }}>
                <Page pageNumber={page} width={Math.min(width - 32, 800)} renderAnnotationLayer={false} renderTextLayer={false} />
                <SignatureLayer doc={doc} page={page} userMap={userMap} />
              </div>
            ))}
          </div>
        </Document>
      )}
    </div>
  )
}

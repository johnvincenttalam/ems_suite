import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Spinner } from '@/shared/ui/spinner'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfPageProps {
  url: string
  page: number
  onLoadSuccess?: (numPages: number) => void
}

export default function PdfPage({ url, page, onLoadSuccess }: PdfPageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full">
      {error ? (
        <div className="py-12 text-center text-[13px] text-red-700">{error}</div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => onLoadSuccess?.(numPages)}
          onLoadError={(err) => setError(err.message || 'Failed to load PDF')}
          loading={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}
        >
          <Page pageNumber={page} width={width || 720} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>
      )}
    </div>
  )
}

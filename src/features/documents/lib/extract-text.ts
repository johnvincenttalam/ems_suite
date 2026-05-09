import { pdfjs } from 'react-pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// pdfjs is already configured for the viewer; configure once here too in case
// extraction runs before the viewer mounts (and it's idempotent — same file URL).
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * Maximum body text we keep per document. Generous enough for a 30-page report
 * while bounded enough to keep the in-memory mock manageable. A real backend
 * would store the full text in a separate table / blob store.
 */
const MAX_BODY_CHARS = 50_000

/**
 * Extract searchable text from a File. Returns plain text concatenated across
 * pages with page boundaries collapsed to single spaces, truncated to
 * MAX_BODY_CHARS. Any extraction failure resolves with `null` instead of
 * throwing — the caller treats null as "no body text" and proceeds.
 *
 * Currently handles PDF only. DOCX / images / other formats fall through to
 * null; supporting them needs a real backend (mammoth.js for DOCX, OCR for
 * images) and is out of scope for the mock template.
 */
export async function extractTextFromFile(file: File): Promise<string | null> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPdf(file)
  }
  if (file.type === 'text/plain') {
    try {
      const text = await file.text()
      return truncate(text)
    } catch {
      return null
    }
  }
  // DOCX / images / unknown — no extraction available in the mock.
  return null
}

async function extractTextFromPdf(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: buffer }).promise

    const pageTexts: string[] = []
    let totalChars = 0

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      // Stop early once we've collected enough text — avoids spending time on
      // a 200-page PDF when the searcher only needs the first 50k chars.
      if (totalChars >= MAX_BODY_CHARS) break
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      // pdfjs splits text into "items" by font run; join with single spaces.
      // Some items already carry trailing whitespace — collapse runs.
      const text = content.items
        .map((item: unknown) => {
          if (item && typeof item === 'object' && 'str' in item) {
            return (item as { str: string }).str
          }
          return ''
        })
        .filter(Boolean)
        .join(' ')
      pageTexts.push(text)
      totalChars += text.length
    }

    const joined = pageTexts.join('\n\n').replace(/\s+/g, ' ').trim()
    return truncate(joined)
  } catch (err) {
    // Don't surface extraction failures to the user — search just falls back
    // to title/tags/category matches. Log at debug level for diagnostics.
    if (typeof console !== 'undefined') {
      console.warn('[extract-text] PDF extraction failed:', err)
    }
    return null
  }
}

function truncate(text: string): string {
  return text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text
}

import { exportFilename, prepareTable, type ExportColumn } from './export-prep'

interface ExportToPDFOptions {
  /** Document title rendered above the table. */
  title?: string
  /** Optional subtitle (e.g. date range, filters in effect). */
  subtitle?: string
  /** Page orientation. Defaults to 'l' (landscape) for tabular reports. */
  orientation?: 'p' | 'l'
}

/**
 * Export rows to a PDF file with a typed table. Lazy-loads `jspdf` +
 * `jspdf-autotable` so the libraries (~150KB combined) only land in the
 * bundle when the user actually clicks Export → PDF.
 */
export async function exportToPDF(
  data: Record<string, unknown>[],
  baseFilename: string,
  columns: ExportColumn[],
  options: ExportToPDFOptions = {},
): Promise<void> {
  if (data.length === 0) return
  const { header, rows } = prepareTable(data, columns)

  const [{ default: JsPDFCtor }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable').then((m) => m.default),
  ])

  const doc = new JsPDFCtor({ orientation: options.orientation ?? 'l', unit: 'pt' })

  let cursorY = 40
  if (options.title) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(options.title, 40, cursorY)
    cursorY += 18
  }
  if (options.subtitle) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(options.subtitle, 40, cursorY)
    cursorY += 18
  }

  doc.setFontSize(8)
  doc.setTextColor(160)
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, cursorY)
  cursorY += 12

  autoTable(doc, {
    head: [header],
    body: rows,
    startY: cursorY,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [244, 244, 245], textColor: 30, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 40, right: 40 },
  })

  doc.save(exportFilename(baseFilename, 'pdf'))
}

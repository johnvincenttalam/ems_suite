import { exportFilename, prepareTable, type ExportColumn } from './export-prep'

/**
 * Export rows to an XLSX file. The `write-excel-file` library is loaded
 * lazily so it doesn't bloat the main bundle — first call costs ~30KB; later
 * calls reuse the cached module.
 *
 * Filename auto-suffixes with the current date, e.g. `sdms-2026-04-30.xlsx`.
 */
export async function exportToXLSX(
  data: Record<string, unknown>[],
  baseFilename: string,
  columns: ExportColumn[],
  sheetName = 'Sheet1',
): Promise<void> {
  if (data.length === 0) return
  const { header, rows } = prepareTable(data, columns)

  const writeXlsxFile = (await import('write-excel-file/browser')).default

  // write-excel-file expects an array of column-objects per row, with
  // explicit value+type. We model everything as string for simplicity —
  // formatters in column config can pre-shape numbers/dates if needed.
  const headerRow = header.map((label) => ({
    value: label,
    fontWeight: 'bold' as const,
    backgroundColor: '#f4f4f5',
  }))
  const dataRows = rows.map((row) => row.map((cell) => ({ value: cell, type: String })))

  const result = writeXlsxFile([headerRow, ...dataRows], { sheet: sheetName })
  await result.toFile(exportFilename(baseFilename, 'xlsx'))
}

export interface ExportColumn {
  key: string
  label: string
  /** Optional formatter — receives raw value, returns display string. */
  format?: (value: unknown, row: Record<string, unknown>) => string
}

/**
 * Prepare a 2D table from row objects + column config. Pure — easy to test
 * without browser APIs. The first row is the header; subsequent rows are
 * stringified values (empty string for null/undefined).
 *
 * Used by export-xlsx and export-pdf so their formatters share normalization.
 */
export function prepareTable(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): { header: string[]; rows: string[][] } {
  const header = columns.map((c) => c.label)
  const rows = data.map((row) =>
    columns.map((c) => {
      const raw = row[c.key]
      if (c.format) return c.format(raw, row)
      if (raw === null || raw === undefined) return ''
      if (raw instanceof Date) return raw.toISOString()
      return String(raw)
    }),
  )
  return { header, rows }
}

/**
 * Build a sortable, filesystem-safe filename like
 * `sdms-documents-report-2026-04-30.{ext}`.
 */
export function exportFilename(base: string, ext: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `${base}-${date}.${ext}`
}

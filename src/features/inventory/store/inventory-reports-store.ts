import { create } from 'zustand'

export type InventoryReportType =
  | 'stock_movement'
  | 'consumption'
  | 'low_stock'
  | 'valuation'
  | 'stock_aging'

export type InventoryReportFormat = 'pdf' | 'xlsx' | 'csv'

export interface GeneratedReport {
  id: string
  type: InventoryReportType
  /** Display name — derived from type at generation time. */
  name: string
  format: InventoryReportFormat
  filters: {
    dateFrom?: string
    dateTo?: string
    warehouseId?: string
    categoryId?: string
  }
  generatedAt: string
  generatedBy: string
}

const STORAGE_KEY = 'inventory-reports'
const MAX_RETAINED = 25

function readStored(): GeneratedReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as GeneratedReport[]
  } catch {
    return []
  }
}

function persist(reports: GeneratedReport[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(0, MAX_RETAINED)))
}

interface InventoryReportsStore {
  reports: GeneratedReport[]
  /** Records a generated report. Returns the new id so the caller can toast/link. */
  record: (input: Omit<GeneratedReport, 'id' | 'generatedAt'>) => GeneratedReport
  remove: (id: string) => void
  clear: () => void
}

let counter = readStored().reduce((max, r) => {
  const n = Number(r.id.replace(/^IR-/, ''))
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextId(): string {
  counter += 1
  return `IR-${String(counter).padStart(4, '0')}`
}

export const useInventoryReportsStore = create<InventoryReportsStore>((set) => ({
  reports: readStored(),
  record: (input) => {
    const report: GeneratedReport = {
      ...input,
      id: nextId(),
      generatedAt: new Date().toISOString(),
    }
    set((s) => {
      const next = [report, ...s.reports].slice(0, MAX_RETAINED)
      persist(next)
      return { reports: next }
    })
    return report
  },
  remove: (id) =>
    set((s) => {
      const next = s.reports.filter((r) => r.id !== id)
      persist(next)
      return { reports: next }
    }),
  clear: () => {
    persist([])
    set({ reports: [] })
  },
}))

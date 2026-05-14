import { parseISO, isAfter, isBefore } from 'date-fns'
import type { ExportColumn } from '@/shared/utils/export-prep'
import type { InventoryItem } from '@/features/inventory'
import type { Asset } from '@/features/assets'
import type { WorkOrder } from '@/features/maintenance'
import { workOrderTotalCost } from '@/features/maintenance'
import type { RequestWithItems } from '@/features/procurement'
import type { FuelLog, Vehicle } from '@/features/fleet'

export type ReportTemplateKey =
  | 'procurement-spend'
  | 'inventory-low-stock'
  | 'asset-cost'
  | 'fleet-fuel'
  | 'maintenance-cost'

export interface ReportTemplateMeta {
  key: ReportTemplateKey
  label: string
  module: 'procurement' | 'inventory' | 'assets' | 'fleet' | 'maintenance'
  description: string
}

export const REPORT_TEMPLATES: ReportTemplateMeta[] = [
  {
    key: 'procurement-spend',
    label: 'Procurement Spend Report',
    module: 'procurement',
    description: 'Approved requests with totals over the selected date range.',
  },
  {
    key: 'inventory-low-stock',
    label: 'Inventory Low Stock Report',
    module: 'inventory',
    description: 'All items at or below their reorder level (snapshot — date range not applied).',
  },
  {
    key: 'asset-cost',
    label: 'Asset Maintenance Cost Report',
    module: 'assets',
    description: 'Per-asset rollup of completed-WO cost in the selected range.',
  },
  {
    key: 'fleet-fuel',
    label: 'Fleet Fuel Report',
    module: 'fleet',
    description: 'Fuel log entries by vehicle over the selected date range.',
  },
  {
    key: 'maintenance-cost',
    label: 'Maintenance Cost Report',
    module: 'maintenance',
    description: 'Completed work orders with labor and parts cost over the selected range.',
  },
]

export interface DateRange {
  from: string
  to: string
}

export interface ReportContext {
  dateRange: DateRange
  items: InventoryItem[]
  assets: Asset[]
  workOrders: WorkOrder[]
  requests: RequestWithItems[]
  vehicles: Vehicle[]
  fuelLogs: FuelLog[]
}

export interface BuiltReport {
  rows: Record<string, unknown>[]
  columns: ExportColumn[]
  filename: string
  pdfTitle: string
  pdfSubtitle: string
}

function inRange(iso: string | undefined, range: DateRange): boolean {
  if (!iso) return false
  const t = parseISO(iso)
  return !isBefore(t, parseISO(range.from)) && !isAfter(t, parseISO(`${range.to}T23:59:59`))
}

/**
 * Pure builder for each template. Returns the rows + column shape the export
 * utilities expect, plus filename + PDF metadata. Empty `rows` is fine — the
 * caller can show a toast and skip the download.
 */
export function buildReport(template: ReportTemplateKey, ctx: ReportContext): BuiltReport {
  const subtitle = `${ctx.dateRange.from} → ${ctx.dateRange.to}`

  switch (template) {
    case 'procurement-spend': {
      const rows = ctx.requests
        .filter((r) => r.status === 'approved' && inRange(r.approvedAt, ctx.dateRange))
        .map((r) => ({
          id: r.id,
          department: r.departmentId,
          requester: r.requesterId,
          approvedAt: r.approvedAt ?? '',
          itemCount: r.items.length,
          total: r.totalAmount,
        }))
      return {
        rows,
        columns: [
          { key: 'id', label: 'Request' },
          { key: 'department', label: 'Department' },
          { key: 'requester', label: 'Requester' },
          { key: 'approvedAt', label: 'Approved' },
          { key: 'itemCount', label: 'Items' },
          { key: 'total', label: 'Total' },
        ],
        filename: 'procurement-spend',
        pdfTitle: 'Procurement Spend Report',
        pdfSubtitle: subtitle,
      }
    }

    case 'inventory-low-stock': {
      const rows = ctx.items
        .filter((i) => i.quantity <= i.reorderLevel)
        .map((i) => ({
          sku: i.sku,
          name: i.name,
          onHand: i.quantity,
          reorderLevel: i.reorderLevel,
          shortfall: i.reorderLevel - i.quantity,
          unitCost: i.unitCost ?? '',
        }))
      return {
        rows,
        columns: [
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'Item' },
          { key: 'onHand', label: 'On Hand' },
          { key: 'reorderLevel', label: 'Reorder Level' },
          { key: 'shortfall', label: 'Shortfall' },
          { key: 'unitCost', label: 'Unit Cost' },
        ],
        filename: 'inventory-low-stock',
        pdfTitle: 'Inventory Low Stock Report',
        pdfSubtitle: `Snapshot — ${ctx.items.filter((i) => i.quantity <= i.reorderLevel).length} items below reorder`,
      }
    }

    case 'asset-cost': {
      const completed = ctx.workOrders.filter(
        (w) => w.status === 'completed' && inRange(w.completedDate, ctx.dateRange),
      )
      const byAsset = new Map<string, { woCount: number; cost: number }>()
      for (const w of completed) {
        const key = w.assetId ?? w.vehicleId
        if (!key) continue
        const cur = byAsset.get(key) ?? { woCount: 0, cost: 0 }
        cur.woCount += 1
        cur.cost += workOrderTotalCost(w)
        byAsset.set(key, cur)
      }
      const rows = Array.from(byAsset.entries())
        .map(([id, { woCount, cost }]) => {
          const asset = ctx.assets.find((a) => a.id === id)
          return {
            assetId: id,
            assetCode: asset?.assetCode ?? '',
            name: asset?.name ?? id,
            woCount,
            cost,
          }
        })
        .sort((a, b) => b.cost - a.cost)
      return {
        rows,
        columns: [
          { key: 'assetCode', label: 'Asset Code' },
          { key: 'name', label: 'Asset' },
          { key: 'woCount', label: '# WOs' },
          { key: 'cost', label: 'Total Cost' },
        ],
        filename: 'asset-cost',
        pdfTitle: 'Asset Maintenance Cost Report',
        pdfSubtitle: subtitle,
      }
    }

    case 'fleet-fuel': {
      const rows = ctx.fuelLogs
        .filter((f) => inRange(f.date, ctx.dateRange))
        .map((f) => {
          const v = ctx.vehicles.find((vh) => vh.id === f.vehicleId)
          return {
            date: f.date,
            plate: v?.plateNumber ?? f.vehicleId,
            model: v?.model ?? '',
            liters: f.liters,
            costPerLiter: f.costPerLiter,
            totalCost: f.totalCost,
            odometer: f.odometer,
          }
        })
        .sort((a, b) => a.date.localeCompare(b.date))
      return {
        rows,
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'plate', label: 'Plate' },
          { key: 'model', label: 'Model' },
          { key: 'liters', label: 'Liters' },
          { key: 'costPerLiter', label: 'Cost / L' },
          { key: 'totalCost', label: 'Total Cost' },
          { key: 'odometer', label: 'Odometer' },
        ],
        filename: 'fleet-fuel',
        pdfTitle: 'Fleet Fuel Report',
        pdfSubtitle: subtitle,
      }
    }

    case 'maintenance-cost': {
      const rows = ctx.workOrders
        .filter((w) => w.status === 'completed' && inRange(w.completedDate, ctx.dateRange))
        .map((w) => ({
          id: w.id,
          title: w.title,
          asset: ctx.assets.find((a) => a.id === w.assetId)?.name ?? w.assetId,
          type: w.type,
          completedDate: w.completedDate ?? '',
          laborHours: w.laborHours ?? '',
          laborCost: w.laborCost ?? '',
          partsCount: (w.partsUsed ?? []).length,
          totalCost: workOrderTotalCost(w),
        }))
        .sort((a, b) => a.completedDate.localeCompare(b.completedDate))
      return {
        rows,
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'title', label: 'Title' },
          { key: 'asset', label: 'Asset' },
          { key: 'type', label: 'Type' },
          { key: 'completedDate', label: 'Completed' },
          { key: 'laborHours', label: 'Labor Hours' },
          { key: 'laborCost', label: 'Labor Cost' },
          { key: 'partsCount', label: '# Parts' },
          { key: 'totalCost', label: 'Total Cost' },
        ],
        filename: 'maintenance-cost',
        pdfTitle: 'Maintenance Cost Report',
        pdfSubtitle: subtitle,
      }
    }
  }
}

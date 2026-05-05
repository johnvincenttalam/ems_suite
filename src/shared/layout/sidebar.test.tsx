import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { modules } from '@/config/modules'

vi.mock('@/config/features', async () => {
  return {
    features: {
      dashboard: true,
      charts: true,
      table: true,
      forms: true,
      users: true,
      roles: true,
      inventory: true,
      inventoryMovements: true,
      inventoryCycleCount: true,
      assets: true,
      assetAssignments: true,
      procurement: true,
      procurementApprovals: true,
      maintenance: true,
      maintenanceSchedule: true,
      maintenanceTechnicians: true,
      documents: true,
      documentsWorkflow: true,
      documentsArchive: true,
      fleet: true,
      fleetTrips: true,
      fleetFuelLogs: true,
      fleetMaintenance: true,
      departments: true,
      warehouses: true,
      categories: true,
      uom: true,
      suppliers: true,
      auditLog: true,
      activity: true,
      profile: true,
      uiKit: true,
      settings: true,
    },
    isFeatureEnabled: (key: string) => enabledFlags[key] ?? false,
  }
})

let enabledFlags: Record<string, boolean> = {}

function renderSidebarFor(moduleKey: string, initialPath: string) {
  const module = modules.find((m) => m.key === moduleKey)!
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar
        module={module}
        collapsed={false}
        mobileOpen={false}
        onToggleCollapse={() => {}}
        onCloseMobile={() => {}}
      />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    enabledFlags = {
      dashboard: true, charts: true, table: true, forms: true,
      users: true, roles: true,
      inventory: true, inventoryMovements: true, inventoryCycleCount: true,
      assets: true, assetAssignments: true,
      procurement: true, procurementApprovals: true,
      maintenance: true, maintenanceSchedule: true, maintenanceTechnicians: true,
      documents: true, documentsWorkflow: true, documentsArchive: true,
      fleet: true, fleetTrips: true, fleetFuelLogs: true, fleetMaintenance: true,
      departments: true, warehouses: true, categories: true, uom: true, suppliers: true, auditLog: true,
      activity: true, profile: true, uiKit: true, settings: true,
    }
  })

  it('renders only the items in the selected module (Inventory)', () => {
    renderSidebarFor('inventory', '/module/inventory')
    expect(screen.getByRole('link', { name: /items/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /movements/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cycle count/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /warehouses/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /categories/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /uom/i })).toBeInTheDocument()
    // Items from other modules should not appear
    expect(screen.queryByRole('link', { name: /procurement/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument()
  })

  it('renders only the items in the selected module (Admin)', () => {
    renderSidebarFor('admin', '/module/admin')
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /roles/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    // Items from other modules should not appear
    expect(screen.queryByRole('link', { name: /inventory/i })).not.toBeInTheDocument()
  })

  it('filters out items whose feature is disabled', () => {
    enabledFlags.warehouses = false
    enabledFlags.uom = false
    renderSidebarFor('inventory', '/module/inventory')
    expect(screen.queryByRole('link', { name: /warehouses/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /uom/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /categories/i })).toBeInTheDocument()
  })
})

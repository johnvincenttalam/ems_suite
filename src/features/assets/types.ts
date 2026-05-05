export type AssetStatus = 'active' | 'maintenance' | 'disposed'

export interface Asset {
  id: string
  name: string
  serialNumber: string
  categoryId: string
  locationId: string
  status: AssetStatus
  assignedTo?: string
  purchaseDate: string
  purchaseCost?: number
  /** Optional checklist template — used for inspection / intake / disposal procedures. */
  checklistId?: string
  createdAt: string
}

export interface AssetAssignment {
  id: string
  assetId: string
  assignedTo: string
  assignedDate: string
  returnedDate?: string
  notes?: string
}

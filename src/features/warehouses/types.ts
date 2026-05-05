export type WarehouseType = 'warehouse' | 'office' | 'site'

export interface Warehouse {
  id: string
  name: string
  type: WarehouseType
  address: string
  contact?: string
  capacity?: number
  createdAt: string
}

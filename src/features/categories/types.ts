export type CategoryType = 'asset' | 'inventory'

export interface Category {
  id: string
  name: string
  type: CategoryType
  description?: string
  itemCount: number
  createdAt: string
}

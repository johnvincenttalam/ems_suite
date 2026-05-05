import type { Category, CategoryType } from '@/features/categories/types'
import { mockCategories } from '@/features/categories/data/mock-categories'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface AddCategoryInput {
  name: string
  type: CategoryType
  description?: string
  createdBy: string
}

interface UpdateCategoryInput {
  name?: string
  type?: CategoryType
  description?: string
  updatedBy: string
}

function nextCategoryId(): string {
  const max = mockCategories.reduce((m, c) => {
    const n = Number(c.id.replace(/^C/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `C${String(max + 1).padStart(3, '0')}`
}

/**
 * Categories API — swap with real HTTP when backend is ready:
 *   list:   () => http.get<Category[]>('/categories')
 *   create: (body) => http.post<Category>('/categories', body)
 *   update: (id, body) => http.patch<Category>(`/categories/${id}`, body)
 *   remove: (id) => http.del(`/categories/${id}`)
 */
export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    await delay()
    return mockCategories
  },

  create: async (input: AddCategoryInput): Promise<Category> => {
    if (mockCategories.some((c) => c.name.toLowerCase() === input.name.toLowerCase() && c.type === input.type)) {
      throw new Error(`A ${input.type} category named "${input.name}" already exists`)
    }
    const item: Category = {
      id: nextCategoryId(),
      name: input.name,
      type: input.type,
      description: input.description,
      itemCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockCategories.push(item)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Admin',
      detail: `Added ${item.type} category "${item.name}"`,
    })
    return item
  },

  update: async (id: string, input: UpdateCategoryInput): Promise<Category> => {
    const idx = mockCategories.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error(`Category ${id} not found`)
    const { updatedBy, ...patch } = input
    const updated: Category = {
      ...mockCategories[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockCategories[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Admin',
      detail: `Updated category "${updated.name}"`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockCategories.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error(`Category ${id} not found`)
    const removed = mockCategories[idx]
    if (removed.itemCount > 0) {
      throw new Error(`Cannot delete "${removed.name}" — ${removed.itemCount} items reference it`)
    }
    mockCategories.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Admin',
      detail: `Deleted category "${removed.name}"`,
    })
  },
}

import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/features/categories/api/categories-api'

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
}

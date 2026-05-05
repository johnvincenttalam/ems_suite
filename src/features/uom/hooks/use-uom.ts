import { useQuery } from '@tanstack/react-query'
import { uomApi } from '@/features/uom/api/uom-api'

export function useUom() {
  return useQuery({ queryKey: ['uom'], queryFn: uomApi.list })
}

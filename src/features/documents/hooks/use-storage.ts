import { useQuery } from '@tanstack/react-query'
import { storageApi, type StorageSort } from '@/features/documents/api/storage-api'
import { useAuthStore } from '@/features/auth'

interface UseMyStorageOpts {
  search?: string
  sort?: StorageSort
}

/**
 * Owner-scoped Storage list. Skips the fetch entirely when no user is signed
 * in (returns empty data + idle state) so guards on the caller side stay
 * simple.
 */
export function useMyStorage(opts: UseMyStorageOpts = {}) {
  const ownerName = useAuthStore((s) => s.user?.name)
  return useQuery({
    queryKey: ['storage', 'my', ownerName ?? '_anon', opts.search ?? '', opts.sort ?? 'date_desc'],
    queryFn: () => storageApi.list(ownerName!, opts),
    enabled: !!ownerName,
  })
}

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchAdapter, type SmartSearchOpts } from '@/features/documents/adapters'
import { useAuthStore } from '@/features/auth'

/** Debounce a string value for `delay` ms. Avoids querying on every keystroke. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Smart search hook. Owner-aware (auto-pulls the signed-in user's name for
 * RBAC). Debounced 300ms and skipped entirely for short / empty queries so we
 * don't spam the adapter mid-typing.
 */
export function useSmartSearch(query: string, opts: Omit<SmartSearchOpts, 'ownerName'> = {}) {
  const ownerName = useAuthStore((s) => s.user?.name)
  const debouncedQuery = useDebounced(query, 300)
  const trimmed = debouncedQuery.trim()

  return useQuery({
    queryKey: ['smart-search', trimmed, ownerName ?? '_anon', opts.category ?? '_all', opts.limit ?? 25],
    queryFn: () => searchAdapter.search(trimmed, { ...opts, ownerName }),
    enabled: trimmed.length >= 2,
  })
}

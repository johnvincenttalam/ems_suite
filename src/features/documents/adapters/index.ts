import { mockSearchAdapter } from './mock-search-adapter'
import type { SearchAdapter } from './search-adapter'

/**
 * The active search adapter. Change this single export to swap to a real
 * AI / vector-DB-backed implementation. Everything else in the app reads
 * search through this binding.
 */
export const searchAdapter: SearchAdapter = mockSearchAdapter

export type { SearchAdapter, SmartSearchResult, SmartSearchOpts } from './search-adapter'

import type { DisposalType } from '@/features/assets/types'

/** Human-readable labels for disposal types — shared between the Disposal
 * page, the Asset Detail drawer, and any future report surfaces. */
export const DISPOSAL_TYPE_LABELS: Record<DisposalType, string> = {
  sold: 'Sold',
  scrapped: 'Scrapped',
  donated: 'Donated',
  lost: 'Lost',
  traded_in: 'Traded In',
}

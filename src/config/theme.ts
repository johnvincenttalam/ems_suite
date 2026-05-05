export const ACCENTS = ['zinc', 'indigo', 'emerald', 'rose'] as const
export type Accent = typeof ACCENTS[number]

export const accentSwatches: Record<Accent, { label: string; swatch: string }> = {
  zinc:    { label: 'Zinc',    swatch: '#18181b' },
  indigo:  { label: 'Indigo',  swatch: '#6366f1' },
  emerald: { label: 'Emerald', swatch: '#10b981' },
  rose:    { label: 'Rose',    swatch: '#f43f5e' },
}

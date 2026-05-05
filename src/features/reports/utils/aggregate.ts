export function sumBy<T>(items: T[], getter: (t: T) => number): number {
  return items.reduce((s, t) => s + getter(t), 0)
}

export function countBy<T>(items: T[], keyer: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of items) {
    const k = keyer(t)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export function topN<T>(items: T[], n: number, sorter: (a: T, b: T) => number): T[] {
  return [...items].sort(sorter).slice(0, n)
}

export function monthKey(iso: string): string {
  // 'YYYY-MM-DD...' → 'YYYY-MM'
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1] ?? '—'} ${String(y).slice(2)}`
}

export function groupByMonth<T>(items: T[], dateGetter: (t: T) => string): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const t of items) {
    const key = monthKey(dateGetter(t))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({ key, items }))
}

export function weekKey(iso: string): string {
  // ISO week number: 'YYYY-Www'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '????-W00'
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function groupByWeek<T>(items: T[], dateGetter: (t: T) => string): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const t of items) {
    const key = weekKey(dateGetter(t))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({ key, items }))
}

export function pct(part: number, whole: number): number {
  if (whole === 0) return 0
  return Math.round((part / whole) * 100)
}

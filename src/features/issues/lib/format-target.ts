import type { IssueTarget } from '@/features/issues/types'
import type { Vehicle } from '@/features/fleet'
import type { Asset } from '@/features/assets'

/**
 * Render a human label for an issue target. Falls back to the raw ID when the
 * target hasn't loaded yet (or has been deleted) so the UI never shows blank.
 */
export function formatIssueTarget(
  target: IssueTarget,
  ctx: { vehicles?: Vehicle[]; assets?: Asset[] },
): { label: string; sublabel?: string } {
  if (target.kind === 'vehicle') {
    const v = ctx.vehicles?.find((x) => x.id === target.id)
    return v
      ? { label: v.plateNumber, sublabel: `${v.model} · ${v.year}` }
      : { label: target.id, sublabel: 'Vehicle (deleted)' }
  }
  const a = ctx.assets?.find((x) => x.id === target.id)
  return a
    ? { label: a.name, sublabel: a.assetCode }
    : { label: target.id, sublabel: 'Asset (deleted)' }
}

export function targetModulePath(target: IssueTarget): string {
  return target.kind === 'vehicle'
    ? `/module/fleet/vehicles?vehicle=${target.id}`
    : `/module/assets/registry?asset=${target.id}`
}

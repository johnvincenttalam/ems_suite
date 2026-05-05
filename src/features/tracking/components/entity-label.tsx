import type { TrackingEntityType } from '@/features/tracking/types'
import type { Vehicle } from '@/features/fleet/types'
import type { Asset } from '@/features/assets/types'
import type { InventoryItem } from '@/features/inventory/types'

interface EntityRefs {
  vehicleMap: Record<string, Vehicle>
  assetMap: Record<string, Asset>
  itemMap: Record<string, InventoryItem>
}

interface EntityLabelProps extends EntityRefs {
  type: TrackingEntityType
  id: string
}

export function EntityLabel({ type, id, vehicleMap, assetMap, itemMap }: EntityLabelProps) {
  if (type === 'vehicle') {
    const v = vehicleMap[id]
    return v ? (
      <div>
        <p className="text-[13px] font-medium text-zinc-900">{v.plateNumber}</p>
        <p className="text-[11px] text-zinc-400">{v.model}</p>
      </div>
    ) : <span className="text-zinc-400">{id}</span>
  }
  if (type === 'asset') {
    const a = assetMap[id]
    return a ? (
      <div>
        <p className="text-[13px] font-medium text-zinc-900">{a.name}</p>
        <p className="text-[11px] font-mono text-zinc-400">{a.serialNumber}</p>
      </div>
    ) : <span className="text-zinc-400">{id}</span>
  }
  if (type === 'item') {
    const i = itemMap[id]
    return i ? (
      <div>
        <p className="text-[13px] font-medium text-zinc-900">{i.name}</p>
        <p className="text-[11px] font-mono text-zinc-400">{i.sku}</p>
      </div>
    ) : <span className="text-zinc-400">{id}</span>
  }
  return <span className="text-zinc-400">{id}</span>
}

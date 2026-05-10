import { Car } from 'lucide-react'
import { EntityThumbnail } from '@/shared/ui/entity-thumbnail'

interface VehicleThumbnailProps {
  imageUrl?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Thin alias around EntityThumbnail with the Car fallback icon —
 * matches the Asset/Driver thumbnail conventions across the app.
 */
export function VehicleThumbnail(props: VehicleThumbnailProps) {
  return <EntityThumbnail {...props} fallbackIcon={Car} />
}

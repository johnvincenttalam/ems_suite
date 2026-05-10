import { Package } from 'lucide-react'
import { EntityThumbnail } from '@/shared/ui/entity-thumbnail'

interface AssetThumbnailProps {
  imageUrl?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Thin alias around EntityThumbnail with the Package fallback icon —
 * kept as a feature-local component so asset surfaces can keep importing
 * `AssetThumbnail` without knowing about the shared shell.
 */
export function AssetThumbnail(props: AssetThumbnailProps) {
  return <EntityThumbnail {...props} fallbackIcon={Package} />
}

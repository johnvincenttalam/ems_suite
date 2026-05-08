import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}

const ICON_SIZE: Record<Size, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

interface AssetThumbnailProps {
  imageUrl?: string
  alt?: string
  size?: Size
  className?: string
}

/**
 * Compact image preview for an asset, with a Package-icon placeholder when
 * imageUrl is missing or fails to load. Used in the registry table, disposal
 * pages, inspections page, and the drawer header.
 */
export function AssetThumbnail({ imageUrl, alt, size = 'sm', className }: AssetThumbnailProps) {
  const [errored, setErrored] = useState(false)
  const showImage = !!imageUrl && !errored

  return (
    <div
      className={cn(
        SIZE_CLASSES[size],
        'rounded-md bg-zinc-100 border border-zinc-200/60 flex items-center justify-center flex-shrink-0 overflow-hidden',
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={alt ?? ''}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <Package className={cn(ICON_SIZE[size], 'text-zinc-400')} />
      )}
    </div>
  )
}

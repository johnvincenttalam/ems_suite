import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
}

const ICON_SIZE: Record<Size, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

interface EntityThumbnailProps {
  imageUrl?: string
  alt?: string
  size?: Size
  /** Icon shown when imageUrl is missing or fails to load. */
  fallbackIcon: LucideIcon
  className?: string
}

/**
 * Square rounded image preview for any entity (asset, vehicle, …) with a
 * caller-supplied fallback icon when imageUrl is absent or unreachable.
 * Use the small re-exports (`AssetThumbnail`, `VehicleThumbnail`) at call
 * sites so the icon choice doesn't drift across pages.
 */
export function EntityThumbnail({ imageUrl, alt, size = 'sm', fallbackIcon: Fallback, className }: EntityThumbnailProps) {
  const [errored, setErrored] = useState(false)

  // Reset on URL change so a fixed/replaced image gets retried.
  useEffect(() => { setErrored(false) }, [imageUrl])

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
        <Fallback className={cn(ICON_SIZE[size], 'text-zinc-400')} />
      )}
    </div>
  )
}

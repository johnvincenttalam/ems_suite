import { useEffect, useState } from 'react'
import { cn } from '@/shared/utils/cn'

const sizes = { sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-xs', lg: 'w-12 h-12 text-sm', xl: 'w-20 h-20 text-xl' }

const colors = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-pink-500',
  'bg-teal-600',
  'bg-orange-600',
]

function hashName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash)
}

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Optional photo URL. When set, renders the image; falls back to colored
   *  initials if missing or if the image fails to load. */
  imageUrl?: string
}

export function Avatar({ name, size = 'md', className, imageUrl }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const color = colors[hashName(name) % colors.length]
  const [errored, setErrored] = useState(false)

  // Reset the error flag when the URL changes — a successful re-upload should
  // try the new image even after a previous failure.
  useEffect(() => { setErrored(false) }, [imageUrl])

  const showImage = !!imageUrl && !errored

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0',
        !showImage && color,
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}

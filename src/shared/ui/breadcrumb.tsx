import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { getModulePath, type EmsModule } from '@/config/modules'

interface BreadcrumbProps {
  module: EmsModule
  className?: string
}

export function Breadcrumb({ module, className }: BreadcrumbProps) {
  const location = useLocation()
  const moduleRoot = getModulePath(module.key)
  const relative = location.pathname.startsWith(moduleRoot)
    ? location.pathname.slice(moduleRoot.length).replace(/^\//, '')
    : ''

  if (!relative) return null

  const segments = relative.split('/').filter(Boolean)

  const labelMap: Record<string, string> = {}
  for (const group of module.nav) {
    for (const item of group.items) {
      const key = item.path.split('/').filter(Boolean).pop() ?? ''
      if (key) labelMap[key] = item.label
    }
  }

  const formatSegment = (segment: string) =>
    labelMap[segment] ??
    segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-[12px] mb-4', className)}>
      <Link
        to={moduleRoot}
        className="text-zinc-400 hover:text-zinc-600 transition-colors"
        aria-label={`${module.shortName} home`}
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((segment, i) => {
        const path = `${moduleRoot}/${segments.slice(0, i + 1).join('/')}`
        const isLast = i === segments.length - 1
        const label = formatSegment(segment)

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-zinc-300" />
            {isLast ? (
              <span className="text-zinc-700 font-medium" aria-current="page">{label}</span>
            ) : (
              <Link to={path} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

import { modules as MODULES, type ModuleKey } from '@/config/modules'
import { cn } from '@/shared/utils/cn'

interface ModuleAccessPillsProps {
  modules: ModuleKey[]
  /** The current module — usually omitted from the pill list since it's implicit. */
  excludeModule?: ModuleKey
  /** Maximum pills before collapsing into a +N counter. Default 4. */
  max?: number
  className?: string
}

/**
 * Tiny read-only badges showing which OTHER modules a user belongs to.
 * Useful on per-module Users pages so admins can see cross-module access at
 * a glance without leaving the page.
 */
export function ModuleAccessPills({ modules: userModules, excludeModule, max = 4, className }: ModuleAccessPillsProps) {
  const others = userModules.filter((m) => m !== excludeModule)
  if (others.length === 0) return null

  const shown = others.slice(0, max)
  const remaining = others.length - shown.length

  return (
    <div className={cn('inline-flex flex-wrap gap-1', className)}>
      {shown.map((key) => {
        const m = MODULES.find((x) => x.key === key)
        if (!m) return null
        return (
          <span
            key={key}
            title={m.name}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium uppercase tracking-wider"
          >
            {m.shortName ?? m.name}
          </span>
        )
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] font-medium">
          +{remaining}
        </span>
      )}
    </div>
  )
}

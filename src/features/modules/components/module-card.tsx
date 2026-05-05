import { motion } from 'framer-motion'
import { ArrowRight, Lock } from 'lucide-react'
import type { EmsModule } from '@/config/modules'
import { cn } from '@/shared/utils/cn'

interface ModuleCardProps {
  module: EmsModule
  locked?: boolean
  onSelect: (module: EmsModule) => void
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

export function ModuleCard({ module, locked = false, onSelect }: ModuleCardProps) {
  const Icon = module.icon

  return (
    <motion.button
      type="button"
      variants={cardVariants}
      onClick={() => onSelect(module)}
      aria-disabled={locked}
      aria-label={locked ? `${module.name} — no access` : `Open ${module.name}`}
      className={cn(
        'group relative text-left bg-white rounded-2xl border border-zinc-200',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:ring-offset-2 focus:ring-offset-surface',
        locked
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:border-zinc-300',
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-7">
          <Icon className={cn('w-7 h-7', module.iconColor)} strokeWidth={1.75} />

          {locked ? (
            <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 px-2 py-1 rounded-md bg-zinc-50 border border-zinc-200">
              <Lock className="w-3 h-3" />
              No access
            </div>
          ) : (
            <div
              aria-hidden="true"
              className={cn(
                'w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center',
                'transition-colors duration-200',
                'group-hover:border-zinc-400',
              )}
            >
              <ArrowRight className="w-4 h-4 text-zinc-400 transition-all duration-200 group-hover:text-zinc-900 group-hover:translate-x-0.5" />
            </div>
          )}
        </div>

        <h3 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
          {module.name}
        </h3>
        <p className="text-[13px] text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">
          {module.description}
        </p>
      </div>
    </motion.button>
  )
}

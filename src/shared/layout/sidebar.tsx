import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { isFeatureEnabled } from '@/config/features'
import { prefetchFeature } from '@/config/feature-imports'
import { getModulePath, type EmsModule } from '@/config/modules'

interface SidebarProps {
  module: EmsModule
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

export function Sidebar({ module, collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const ModuleIcon = module.icon

  const groups = useMemo(
    () =>
      module.nav
        .map((g) => ({
          title: g.title,
          items: g.items
            .filter((i) => isFeatureEnabled(i.feature))
            .map((i) => ({ ...i, absolutePath: getModulePath(module.key, i.path) })),
        }))
        .filter((g) => g.items.length > 0),
    [module],
  )

  const moduleRoot = getModulePath(module.key)

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-sidebar z-50 flex flex-col transition-all duration-300 ease-in-out border-r border-white/[0.06]',
          collapsed ? 'w-[68px]' : 'w-[240px]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Module header */}
        <div className="flex items-center h-14 px-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <ModuleIcon className={cn('w-4 h-4', module.iconColor)} />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-w-0"
              >
                <p className="text-white font-semibold text-[14px] tracking-tight leading-tight truncate">
                  {module.shortName}
                </p>
                <p className="text-sidebar-text/60 text-[10.5px] tracking-tight leading-tight truncate mt-0.5">
                  {module.name}
                </p>
              </motion.div>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto lg:hidden text-sidebar-text hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={group.title ?? `g-${gi}`} className={gi > 0 ? 'mt-4' : ''}>
              {!collapsed && group.title ? (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-text/50">
                  {group.title}
                </p>
              ) : (
                gi > 0 && <div className="mx-3 mb-2 border-t border-white/[0.06]" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.absolutePath === moduleRoot
                      ? location.pathname === moduleRoot
                      : location.pathname.startsWith(item.absolutePath)
                  return (
                    <NavLink
                      key={item.absolutePath}
                      to={item.absolutePath}
                      end={item.absolutePath === moduleRoot}
                      onClick={onCloseMobile}
                      onMouseEnter={() => prefetchFeature(item.feature)}
                      onFocus={() => prefetchFeature(item.feature)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150',
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                      )}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:flex p-3 border-t border-white/[0.06]">
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors text-[13px]"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

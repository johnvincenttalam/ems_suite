import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/shared/layout/sidebar'
import { Topbar } from '@/shared/layout/topbar'
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { cn } from '@/shared/utils/cn'
import type { EmsModule } from '@/config/modules'
import { useAuthStore } from '@/features/auth/store/auth-store'

const SearchPalette = lazy(() =>
  import('@/shared/search').then((m) => ({ default: m.SearchPalette })),
)

interface ModuleLayoutProps {
  module: EmsModule
}

export function ModuleLayout({ module }: ModuleLayoutProps) {
  const setSelectedModule = useAuthStore((s) => s.setSelectedModule)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    setSelectedModule(module.key)
  }, [module, setSelectedModule])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        module={module}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Topbar
        module={module}
        sidebarCollapsed={collapsed}
        onToggleMobileSidebar={() => setMobileOpen(true)}
        onSearchClick={() => setPaletteOpen(true)}
      />
      <main
        className={cn(
          'pt-14 min-h-screen transition-all duration-300',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[240px]'
        )}
      >
        <div className="p-6 lg:p-8">
          <Breadcrumb module={module} />
          <Outlet />
        </div>
      </main>
      <Suspense fallback={null}>
        <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </Suspense>
    </div>
  )
}

import { cn } from '@/shared/utils/cn'
import { Menu, Search, LogOut, User, Sun, Moon, LayoutGrid } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { moduleRoleOf } from '@/features/auth'
import { useThemeStore } from '@/shared/stores/theme-store'
import { Avatar } from '@/shared/ui/avatar'
import { NotificationCenter } from '@/shared/layout/notification-center'
import { UserSwitcher } from '@/shared/layout/user-switcher'
import { useClickOutside } from '@/shared/hooks/use-click-outside'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { getModulePath, type EmsModule } from '@/config/modules'

interface TopbarProps {
  module: EmsModule
  sidebarCollapsed: boolean
  onToggleMobileSidebar: () => void
  /** When provided, the search input becomes a launcher button that calls this
   * instead of accepting raw input. Used by SDMS to open the command palette. */
  onSearchClick?: () => void
}

export function Topbar({ module, sidebarCollapsed, onToggleMobileSidebar, onSearchClick }: TopbarProps) {
  const { user, logout } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useClickOutside(profileRef, () => setShowProfile(false), showProfile)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 bg-white border-b border-zinc-100 z-30 flex items-center px-4 lg:px-6 transition-all duration-300',
        sidebarCollapsed ? 'lg:left-[68px]' : 'lg:left-[240px]',
        'left-0'
      )}
    >
      <button
        onClick={onToggleMobileSidebar}
        aria-label="Open navigation menu"
        className="lg:hidden p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Module switcher */}
      <Link
        to="/"
        className="hidden md:inline-flex items-center gap-2 ml-2 px-2.5 py-1.5 rounded-lg text-[12.5px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        title="Back to module selector"
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Modules</span>
      </Link>

      {/* Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md ml-2">
        {onSearchClick ? (
          <button
            type="button"
            onClick={onSearchClick}
            className="w-full flex items-center justify-between pl-10 pr-2 py-2 relative bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-400 hover:text-zinc-700 hover:border-zinc-300 transition-colors text-left cursor-pointer"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <span>Search anything...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200">
              ⌘K
            </kbd>
          </button>
        ) : (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              autoComplete="off"
              name="topbar-search-nofill"
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-colors"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </button>

        {/* TODO: gate or remove when real auth replaces mockAuthAdapter — see features/auth/adapters/index.ts */}
        <UserSwitcher />

        {/* Notifications */}
        <NotificationCenter moduleKey={module.key} />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            aria-label="Open profile menu"
            aria-expanded={showProfile}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <Avatar name={user?.name ?? 'User'} size="sm" className="w-7 h-7 text-[10.5px]" />
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-medium text-zinc-700 leading-tight">
                {user?.name ?? 'User'}
              </p>
              <p className="text-[11px] text-zinc-400 capitalize">{moduleRoleOf(user, module.key) ?? 'no access'}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-zinc-200/60 py-1.5 z-50">
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-[13px] font-medium text-zinc-700">{user?.name}</p>
                <p className="text-[11px] text-zinc-400">{user?.email}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-1.5">{module.shortName}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfile(false)
                  navigate('/')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Switch module
              </button>
              <button
                onClick={() => {
                  setShowProfile(false)
                  navigate(getModulePath(module.key, 'profile'))
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

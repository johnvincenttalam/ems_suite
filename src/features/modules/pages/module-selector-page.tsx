import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sun, Moon, ShieldOff, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { modules, type EmsModule } from '@/config/modules'
import { appConfig } from '@/config/app'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { hasModuleAccess } from '@/features/auth/lib/access'
import { useThemeStore } from '@/shared/stores/theme-store'
import { Button } from '@/shared/ui/button'
import { ModuleCard } from '@/features/modules/components/module-card'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

export function ModuleSelectorPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, setSelectedModule, logout } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const Logo = appConfig.logo

  const accessibleCount = isAuthenticated && user
    ? modules.filter((m) => hasModuleAccess(user, m.key)).length
    : modules.length

  const handleSelect = (m: EmsModule) => {
    if (isAuthenticated && !hasModuleAccess(user, m.key)) {
      toast.error(`You do not have access to ${m.shortName}`)
      return
    }
    setSelectedModule(m.key)
    if (isAuthenticated) {
      navigate(`/module/${m.key}${m.defaultPath ? `/${m.defaultPath}` : ''}`)
    } else {
      navigate(`/module/${m.key}/login`)
    }
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Logo className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
              {appConfig.name}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated && user && (
              <span className="hidden sm:inline-block text-[12px] text-zinc-500 mr-1">
                Signed in as {user.email}
              </span>
            )}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
            </button>
            {isAuthenticated && (
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
        {accessibleCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-md mx-auto text-center mt-8 lg:mt-16"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <ShieldOff className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">No accessible systems</h1>
            <p className="text-[14px] text-zinc-500 mt-2">
              {user ? <>Your account ({user.email}) has not been granted access to any system.</> : 'No systems are available.'}
            </p>
            <p className="text-[13px] text-zinc-400 mt-2">
              Contact your administrator to request access.
            </p>
            <div className="mt-8">
              <Button variant="secondary" onClick={handleSignOut} leftIcon={<LogOut className="w-4 h-4" />}>
                Sign Out
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900">
                Select a system
              </h1>
              <p className="text-[14px] text-zinc-500 mt-2 max-w-2xl">
                Choose the system you want to access. Each one has its own workspace, sidebar, and permissions.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr"
            >
          {modules.map((m) => (
            <ModuleCard
              key={m.key}
              module={m}
              locked={isAuthenticated && !hasModuleAccess(user, m.key)}
              onSelect={handleSelect}
            />
          ))}
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}

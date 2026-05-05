import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldOff, ArrowLeft, LogOut } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { appConfig } from '@/config/app'
import type { EmsModule } from '@/config/modules'
import { Button } from '@/shared/ui/button'

interface AccessDeniedPageProps {
  module: EmsModule
}

export function AccessDeniedPage({ module }: AccessDeniedPageProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const Logo = appConfig.logo

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Logo className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
              {appConfig.name}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <ShieldOff className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Access Denied</h1>
          <p className="text-[14px] text-zinc-500 mt-2">
            {user ? (
              <>Your account ({user.email}) does not have access to <span className="font-medium text-zinc-700">{module.name}</span>.</>
            ) : (
              <>You do not have access to <span className="font-medium text-zinc-700">{module.name}</span>.</>
            )}
          </p>
          <p className="text-[13px] text-zinc-400 mt-2">
            Contact your administrator if you believe this is a mistake.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-fg text-[13px] font-medium hover:bg-accent-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Modules
            </Link>
            <Button variant="secondary" onClick={handleSignOut} leftIcon={<LogOut className="w-4 h-4" />}>
              Sign Out
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

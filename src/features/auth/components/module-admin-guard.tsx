import { Link } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { isModuleAdmin, isModuleManagerOrAbove, moduleRoleOf } from '@/features/auth/lib/access'
import type { ModuleKey } from '@/config/modules'
import { getModulePath } from '@/config/modules'

interface ModuleAdminGuardProps {
  moduleKey: ModuleKey
  /** Minimum role required. Defaults to 'admin'. */
  minRole?: 'admin' | 'manager'
  /** Display name shown in the denied message ("Maintenance Settings"). */
  pageLabel: string
  children: React.ReactNode
}

/**
 * Page-level gate for in-module admin/manager-only routes (Settings is the
 * primary use case). Renders the page when the active user holds the required
 * role; otherwise shows a lightweight in-page denied state with a link back to
 * the module dashboard.
 *
 * Distinct from `ProtectedRoute`: that handles the *module access* check
 * (member-or-above). This handles the *within-module role* check above that.
 */
export function ModuleAdminGuard({ moduleKey, minRole = 'admin', pageLabel, children }: ModuleAdminGuardProps) {
  const user = useAuthStore((s) => s.user)
  const allowed = minRole === 'admin'
    ? isModuleAdmin(user, moduleKey)
    : isModuleManagerOrAbove(user, moduleKey)

  if (allowed) return <>{children}</>

  const currentRole = moduleRoleOf(user, moduleKey)
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
        <ShieldOff className="w-7 h-7 text-red-600" />
      </div>
      <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{pageLabel} is admin-only</h1>
      <p className="text-[13.5px] text-zinc-500 mt-2">
        Your current role in this module is{' '}
        <span className="font-medium text-zinc-700">{currentRole ?? 'none'}</span>.{' '}
        Ask a module admin to grant you the {minRole} role to access this page.
      </p>
      <Link
        to={getModulePath(moduleKey)}
        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-700 hover:border-zinc-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}

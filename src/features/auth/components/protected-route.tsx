import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { hasModuleAccess } from '@/features/auth/lib/access'
import { AccessDeniedPage } from '@/features/auth/pages/access-denied-page'
import type { EmsModule } from '@/config/modules'
import { Spinner } from '@/shared/ui/spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Where to redirect when unauthenticated. Defaults to the module selector. */
  loginPath?: string
  /** When provided, the user must have access to this module or AccessDenied is rendered. */
  module?: EmsModule
}

export function ProtectedRoute({ children, loginPath = '/', module }: ProtectedRouteProps) {
  const { isAuthenticated, user, isRestoring } = useAuthStore()

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath} replace />
  }

  if (module && !hasModuleAccess(user, module.key)) {
    return <AccessDeniedPage module={module} />
  }

  return <>{children}</>
}

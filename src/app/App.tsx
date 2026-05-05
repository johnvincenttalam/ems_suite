import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { AppProviders } from './providers'
import { AppRoutes } from './routes'

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  )
}

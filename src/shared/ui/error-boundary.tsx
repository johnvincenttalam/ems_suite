import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info)
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return <DefaultFallback error={this.state.error} reset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">Something went wrong</h2>
        <p className="text-[13px] text-zinc-500 mb-4">
          {error.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        {import.meta.env.DEV && error.stack && (
          <pre className="text-left text-[11px] text-zinc-400 bg-zinc-50 border border-zinc-100 rounded-lg p-3 mb-4 overflow-auto max-h-32">
            {error.stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-200 rounded-lg text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    </div>
  )
}

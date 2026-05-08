import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 text-4xl">!</div>
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {this.state.error && (
            <p className="mt-3 max-w-sm text-xs text-muted-foreground/70 font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white"
          >
            Refresh page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

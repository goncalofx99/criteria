import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

function ErrorFallback({ error }: { error: Error | null }) {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 pb-safe pt-safe text-center">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary"><AlertCircle size={24} aria-hidden="true" /></span>
      <h1 className="screen-heading text-foreground">{t('Não foi possível carregar esta página.', 'We couldn’t load this page.')}</h1>
      <p className="screen-intro mt-3 max-w-sm">{t('Ocorreu um erro inesperado. Atualize a página para tentar novamente.', 'Something unexpected happened. Refresh to try again.')}</p>
      {import.meta.env.DEV && error && <p className="mt-3 max-w-sm break-all font-mono text-xs text-muted-foreground/70">{error.message}</p>}
      <button type="button" onClick={() => window.location.reload()} className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {t('Atualizar página', 'Refresh page')}
      </button>
    </div>
  )
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
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

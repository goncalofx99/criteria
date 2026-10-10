import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

/** A visual placeholder. Give the containing region a spoken loading label. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-overlay', className)} />
}

export function ResultCardSkeleton() {
  return <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-border bg-surface">
    <Skeleton className="aspect-[4/3] rounded-none" />
    <div className="space-y-3 p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="mt-5 h-10 w-full" />
    </div>
  </div>
}

export function DetailSkeleton({ variant }: { variant: 'property' | 'criteria' }) {
  const { t } = useLanguage()
  return <div role="status" aria-label={variant === 'property' ? t('A carregar anúncio', 'Loading listing') : t('A carregar critérios', 'Loading criteria')} className="mx-auto max-w-[1280px] px-4 py-5 md:px-8 lg:py-8">
    <span className="sr-only">{t('A carregar detalhes…', 'Loading details…')}</span>
    <div className="overflow-hidden rounded-2xl border border-border bg-surface lg:grid lg:grid-cols-2">
      {variant === 'property' && <Skeleton className="h-64 rounded-none md:h-[420px] lg:h-[540px]" />}
      <div className="space-y-5 p-6 md:p-8 lg:p-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-5 h-9 w-40" />
        <Skeleton className="h-px w-full" />
        <div className="flex gap-3"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-20" /></div>
        <Skeleton className="mt-8 h-20 w-full" />
      </div>
      {variant === 'criteria' && <div aria-hidden="true" className="hidden space-y-4 border-l border-border p-8 lg:block"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-52 w-full" /><Skeleton className="h-5 w-3/4" /></div>}
    </div>
  </div>
}

export function EditFormSkeleton() {
  const { t } = useLanguage()
  return <div role="status" aria-label={t('A carregar publicação para edição', 'Loading post for editing')} className="mx-auto max-w-[1160px] px-5 py-7 md:px-8 md:py-10 lg:grid lg:grid-cols-[minmax(220px,290px)_minmax(0,1fr)] lg:gap-12">
    <span className="sr-only">{t('A carregar editor…', 'Loading editor…')}</span>
    <div aria-hidden="true" className="mb-8 space-y-4"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-52" /></div>
    <div aria-hidden="true" className="space-y-5">
      {[0, 1, 2].map(index => <div key={index} className="space-y-5 rounded-2xl border border-border bg-surface p-6"><Skeleton className="h-6 w-32" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-4/5" /></div>)}
    </div>
  </div>
}

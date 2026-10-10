import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useQuery } from '@apollo/client'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpDown, List, Loader2, Map as MapIcon, MapPin, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { CriteriaFilters, countCriteriaFilters, type BuyerPostFilterValues } from '@/components/feed/CriteriaFilters'
import { BUYER_SORTS, cleanFilters, readBounds, readBuyerFilters, readPage, readSort, writeBounds, writeBuyerFilters, type BuyerSort, type MapBounds, type ResultView } from '@/components/feed/feedState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/hooks/useMe'
import { formatPriceRange } from '@/lib/format'
import { SEARCH_BUYER_POSTS } from '@/lib/gql'
import { cn } from '@/lib/utils'
import { languageTag, useLanguage } from '@/lib/language'
import { publicLocationLabel } from '@/lib/locations'

const LIST_LIMIT = 24
const MAP_LIMIT = 200
type SearchResult = { items: CriteriaCardData[]; totalCount: number; hasNextPage: boolean }
function buyerSortLabel(value: string, language: 'pt' | 'en', mobile: boolean): string {
  const labels: Record<string, [string, string, string, string]> = {
    newest: ['Mais recentes', 'Mais recentes primeiro', 'Newest', 'Newest first'],
    oldest: ['Mais antigos', 'Mais antigos primeiro', 'Oldest', 'Oldest first'],
    budget_asc: ['Orçamento: menor', 'Orçamento: menor primeiro', 'Budget: low', 'Budget: low first'],
    budget_desc: ['Orçamento: maior', 'Orçamento: maior primeiro', 'Budget: high', 'Budget: high first'],
  }
  return labels[value]?.[(language === 'pt' ? 0 : 2) + (mobile ? 0 : 1)] ?? value
}

export default function RequestsPage() {
  const { t } = useLanguage()
  const { me, loading, error, refetch, canViewCriteria, canCreateCriteria } = useMe()

  if (loading && !me) return <div className="workspace-content px-5 py-6 md:px-8 lg:px-10"><RequestsLoading /></div>
  if (error && !me) return (
    <div className="workspace-content px-5 py-16 text-center md:px-8">
      <h1 className="text-xl font-semibold text-foreground">{t('Não foi possível carregar a sua conta.', 'We couldn’t load your account.')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('Tente novamente para ver os critérios disponíveis.', 'Try again to see which criteria are available to you.')}</p>
      <button type="button" onClick={refetch} className="mt-5 min-h-11 rounded bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">{t('Tentar novamente', 'Try again')}</button>
    </div>
  )

  // The API enforces this same permission. Do not start a discovery query for
  // buyer-only accounts; they can still open their own request from Profile.
  if (!canViewCriteria) return (
    <div className="workspace-content px-5 pb-14 pt-8 md:px-8 md:pt-14 lg:px-10">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('Início', 'Home')}</Link>
      <div className="mt-7 max-w-2xl border-t border-border pt-7">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-.025em] text-foreground md:text-[2.25rem]">{t('Só vendedores podem consultar os critérios.', 'Only sellers can browse criteria.')}</h1>
        <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-muted-foreground">{t('Quem procura imóvel partilha aqui o que precisa. Para consultar e contactar compradores, adicione o papel de vendedor à sua conta.', 'People looking for a property share what they need here. To browse and contact them, add the seller role to your account.')}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/profile" className="inline-flex min-h-11 items-center rounded bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">{t('Gerir o seu papel', 'Manage your role')}</Link>
          <Link to="/create?type=criteria" className="inline-flex min-h-11 items-center rounded border border-border bg-surface px-5 text-sm font-semibold text-foreground hover:bg-accent">{t('Publicar os seus critérios', 'Post your criteria')}</Link>
        </div>
      </div>
    </div>
  )

  return <RequestResults canCreateCriteria={canCreateCriteria} />
}

function RequestResults({ canCreateCriteria }: { canCreateCriteria: boolean }) {
  const { t, language } = useLanguage()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const view: ResultView = params.get('view') === 'map' ? 'map' : 'list'
  const sort = readSort(params, 'criteria') as BuyerSort
  const page = readPage(params)
  const search = params.get('q')?.trim() ?? ''
  const filters = readBuyerFilters(params)
  const gqlFilters = useMemo(() => cleanFilters(filters), [JSON.stringify(filters)])
  const bounds = readBounds(params)
  const returnTo = `${location.pathname}${location.search}`
  const resetScroll = Boolean((location.state as { resetScroll?: boolean } | null)?.resetScroll)
  const [searchDraft, setSearchDraft] = useState(search)
  const [showFilters, setShowFilters] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)
  const scrollRestored = useRef<string | null>(null)
  const limit = view === 'map' ? MAP_LIMIT : LIST_LIMIT
  const { data, loading, error, refetch } = useQuery<{ buyerPostSearch: SearchResult }>(SEARCH_BUYER_POSTS, {
    variables: { limit, offset: (page - 1) * limit, filters: gqlFilters, search: search || undefined, bounds, sort },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })
  const result = data?.buyerPostSearch

  useEffect(() => setSearchDraft(search), [search])
  useEffect(() => {
    const key = `request-results-scroll:${returnTo}`
    const save = () => sessionStorage.setItem(key, String(window.scrollY))
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [returnTo])
  useEffect(() => {
    if (!result || scrollRestored.current === returnTo) return
    scrollRestored.current = returnTo
    const stored = Number(sessionStorage.getItem(`request-results-scroll:${returnTo}`))
    const top = resetScroll ? 0 : Number.isFinite(stored) && stored > 0 ? stored : 0
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: 'auto' }))
    return () => cancelAnimationFrame(frame)
  }, [result, resetScroll, returnTo])

  const updateParams = (mutate: (next: URLSearchParams) => void) => {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      mutate(next)
      return next
    })
  }
  const changeView = (next: ResultView) => updateParams(nextParams => {
    if (next === 'list') nextParams.delete('view')
    else nextParams.set('view', 'map')
    nextParams.delete('page')
  })
  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    const value = searchDraft.trim()
    if (value === search) return
    updateParams(next => {
      if (value) next.set('q', value)
      else next.delete('q')
      next.delete('page')
      writeBounds(next)
    })
  }
  const closeFilters = useCallback(() => {
    setShowFilters(false)
    requestAnimationFrame(() => filterButton.current?.focus())
  }, [])
  const applyFilters = (nextFilters: BuyerPostFilterValues) => {
    updateParams(next => writeBuyerFilters(next, nextFilters))
    closeFilters()
  }
  const changeSort = (value: string) => updateParams(next => {
    if (value === 'newest') next.delete('sort')
    else next.set('sort', value)
    next.delete('page')
  })
  const changePage = (value: number) => {
    updateParams(next => {
      if (value <= 1) next.delete('page')
      else next.set('page', String(value))
    })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const changeBounds = (nextBounds?: MapBounds) => updateParams(next => writeBounds(next, nextBounds))
  const clearSearchFilters = () => updateParams(next => {
    next.delete('q')
    writeBuyerFilters(next, {})
    writeBounds(next)
  })

  return (
    <div className="min-h-dvh">
      <PageHeader className="relative !top-auto bg-background backdrop-blur-none">
        <div className="workspace-content px-5 pb-4 pt-4 sm:px-6 md:px-8 md:pb-6 md:pt-7 lg:px-10">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end lg:gap-10 xl:gap-16">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              <Link to="/" aria-label={t('Voltar ao início', 'Back to home')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border bg-surface text-primary hover:bg-accent"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>
              <div className="min-w-0">
                <h1 className="text-[1.5rem] font-semibold leading-tight tracking-[-.025em] text-foreground md:text-[2.25rem]">Criteria</h1>
                <p className="mt-0.5 truncate text-sm text-muted-foreground md:mt-1 md:text-base">{search ? t(`Pesquisa: “${search}”`, `Search: “${search}”`) : t('O que os compradores procuram', 'What people are looking for')}</p>
              </div>
            </div>
            <form onSubmit={applySearch} role="search" className="mt-4 flex min-w-0 items-center rounded border border-border bg-surface p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 lg:mt-0">
              <Search className="ml-3 h-5 w-5 shrink-0 text-primary max-[359px]:hidden" aria-hidden="true" />
              <label htmlFor="requests-search" className="sr-only">{t('Pesquisar critérios por local ou palavra-chave', 'Search criteria by place or keyword')}</label>
              <input id="requests-search" type="search" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder={t('Local ou palavra-chave', 'Place or keyword')} maxLength={120} enterKeyHint="search" className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0" />
              <button type="submit" className="flex min-h-11 shrink-0 items-center justify-center rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700">{t('Pesquisar', 'Search')}</button>
            </form>
          </div>
          <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap md:mt-5">
            <button ref={filterButton} type="button" onClick={() => setShowFilters(true)} aria-haspopup="dialog" className="inline-flex min-h-11 items-center gap-2 rounded border border-border bg-surface px-3 text-sm font-medium text-foreground hover:border-primary-400 hover:bg-accent sm:px-4"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {t('Filtros', 'Filters')}{countCriteriaFilters(filters) ? ` (${countCriteriaFilters(filters)})` : ''}</button>
            <label className="relative inline-flex min-h-11 min-w-0 flex-1 items-center rounded border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 sm:flex-none">
              <ArrowUpDown className="pointer-events-none absolute left-3 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
              <span className="sr-only">{t('Ordenar critérios', 'Sort criteria')}</span>
              <select value={sort} onChange={event => changeSort(event.target.value)} className="w-full min-w-0 cursor-pointer appearance-none bg-transparent py-2.5 pl-3 pr-2 text-base font-medium text-foreground outline-none sm:hidden">
                {BUYER_SORTS.map(option => <option key={option.value} value={option.value}>{buyerSortLabel(option.value, language, true)}</option>)}
              </select>
              <select value={sort} onChange={event => changeSort(event.target.value)} className="hidden cursor-pointer appearance-none bg-transparent py-2.5 pl-9 pr-3 text-sm font-medium text-foreground outline-none sm:block">
                {BUYER_SORTS.map(option => <option key={option.value} value={option.value}>{buyerSortLabel(option.value, language, false)}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => changeView(view === 'list' ? 'map' : 'list')} aria-label={view === 'list' ? t('Mudar para mapa', 'Switch to map view') : t('Mudar para lista', 'Switch to list view')} className="inline-flex min-h-11 items-center gap-1.5 rounded border border-border bg-surface px-3 text-sm font-medium text-foreground hover:border-primary-400 hover:bg-accent">
              {view === 'list' ? <MapIcon className="h-4 w-4" aria-hidden="true" /> : <List className="h-4 w-4" aria-hidden="true" />}{view === 'list' ? t('Mapa', 'Map') : t('Lista', 'List')}
            </button>
            {canCreateCriteria && <Link to="/create?type=criteria" className="col-span-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-700 sm:ml-auto sm:px-4"><Plus className="h-4 w-4" aria-hidden="true" /> {t('Publicar critérios', 'Post criteria')}</Link>}
          </div>
        </div>
      </PageHeader>

      <div className="workspace-content px-5 pb-10 pt-5 sm:px-6 md:px-8 md:pt-6 lg:px-10">
        {loading && !result ? <RequestsLoading view={view} />
          : error && (!result || result.totalCount === 0) ? <RequestsError retry={() => void refetch()} />
            : !result || result.totalCount === 0 ? <RequestsEmpty filtered={Boolean(search || gqlFilters || bounds)} onClear={clearSearchFilters} />
              : result.items.length === 0 ? <RequestsEmpty emptyPage onClear={() => changePage(1)} />
                : <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground" aria-live="polite">
                    <p><strong className="font-semibold text-foreground">{result.totalCount.toLocaleString(languageTag(language))}</strong> {result.totalCount === 1 ? t('publicação', 'post') : t('publicações', 'posts')} <span className="ml-1">{t(`(a mostrar ${(page - 1) * limit + 1}–${(page - 1) * limit + result.items.length})`, `(showing ${(page - 1) * limit + 1}-${(page - 1) * limit + result.items.length})`)}</span></p>
                    {loading && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('A atualizar resultados', 'Updating results')}</span>}
                  </div>
                  {error && <RequestsError stale retry={() => void refetch()} />}
                  {view === 'map'
                    ? <RequestMap criteria={result.items} bounds={bounds} onBounds={changeBounds} returnTo={returnTo} />
                    : <div className="result-card-grid">{result.items.map(item => <CriteriaCard key={item.id} criteria={item} />)}</div>}
                  <Pagination page={page} hasNext={result.hasNextPage} total={result.totalCount} limit={limit} onPage={changePage} />
                </>}
      </div>

      {showFilters && <FilterDialog filters={filters} onApply={applyFilters} onClose={closeFilters} />}
    </div>
  )
}

function RequestMap({ criteria, bounds, onBounds, returnTo }: { criteria: CriteriaCardData[]; bounds?: MapBounds; onBounds: (bounds?: MapBounds) => void; returnTo: string }) {
  const { t, language } = useLanguage()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | undefined>()
  const selected = criteria.find(item => item.id === selectedId)
  const handleBoundsChange = useCallback((next: MapBounds) => setVisibleBounds(next), [])

  return <section aria-label={t('Critérios no mapa', 'Criteria on a map')} className="map-results">
    <div className="mb-3 flex flex-wrap gap-2">
      <button type="button" disabled={!visibleBounds} onClick={() => onBounds(visibleBounds)} className="inline-flex min-h-11 items-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"><MapPin className="h-4 w-4" aria-hidden="true" /> {t('Pesquisar nesta área', 'Search visible area')}</button>
      {bounds && <button type="button" onClick={() => onBounds(undefined)} className="min-h-11 rounded border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">{t('Limpar área do mapa', 'Clear map area')}</button>}
    </div>
    <div className="relative">
      <LazyPostsMap criteria={criteria} selectedId={selectedId} onSelectPost={setSelectedId} onBoundsChange={handleBoundsChange} bounds={bounds} height="var(--results-map-height)" />
      {selected && <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-sm rounded-md border border-border bg-surface p-4 shadow-lift sm:bottom-5 sm:left-auto sm:right-5">
        <button type="button" onClick={() => setSelectedId(null)} aria-label={t('Fechar critérios selecionados', 'Close selected criteria post')} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="h-4 w-4" aria-hidden="true" /></button>
        <p className="pr-10 text-lg font-semibold text-foreground">{formatPriceRange(selected.priceMin, selected.priceMax)}</p>
        <p className="mt-1 line-clamp-2 text-sm font-medium">{selected.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{publicLocationLabel(selected.locationText, language)} · {t(`raio de ${selected.radiusKm} km`, `${selected.radiusKm} km radius`)}</p>
        <Link to={`/criteria/${selected.id}`} state={{ returnTo }} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700">{t('Ver critérios', 'View criteria')} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{t('As áreas de pesquisa são aproximadas. Selecione um marcador para ver os critérios.', 'Search areas are approximate. Select a marker to preview criteria.')}</p>
    <div role="list" aria-label={t('Critérios mostrados no mapa', 'Criteria shown on the map')} className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
      {criteria.map(item => <div role="listitem" key={item.id} className="min-w-[200px] max-w-[240px] shrink-0 snap-start">
        <Link to={`/criteria/${item.id}`} state={{ returnTo }} className={cn('block h-full rounded-md border bg-surface p-4 hover:border-primary-400 hover:bg-primary-100', selectedId === item.id ? 'border-primary' : 'border-border')}>
          <p className="text-lg font-semibold text-foreground">{formatPriceRange(item.priceMin, item.priceMax)}</p>
          <p className="mt-1 line-clamp-2 text-sm font-medium">{item.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{publicLocationLabel(item.locationText, language)}</p>
        </Link>
      </div>)}
    </div>
  </section>
}

function FilterDialog({ filters, onApply, onClose }: { filters: BuyerPostFilterValues; onApply: (filters: BuyerPostFilterValues) => void; onClose: () => void }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(filters)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEscape)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onEscape) }
  }, [onClose])
  const trapFocus = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Tab' || !dialog.current) return
    const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus() }
  }
  const invalidRange = (draft.budgetMin ?? 0) > (draft.budgetMax ?? Infinity)

  return <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6 lg:justify-end" role="presentation">
    <button type="button" tabIndex={-1} aria-label={t('Fechar filtros', 'Close filters')} onClick={onClose} className="absolute inset-0 bg-primary-900/55" />
    <section ref={dialog} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="requests-filter-title" className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-surface shadow-modal sm:max-h-[min(760px,90dvh)] sm:rounded-lg lg:mr-6 lg:w-[420px]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div><h2 id="requests-filter-title" className="text-xl font-semibold">{t('Filtrar critérios', 'Filter criteria')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('Encontre compradores para os quais o seu imóvel faz sentido.', 'Focus on the buyers your property can serve.')}</p></div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label={t('Fechar filtros', 'Close filters')} className="flex h-11 w-11 items-center justify-center rounded bg-accent text-primary hover:bg-primary-100"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5"><CriteriaFilters filters={draft} onChange={setDraft} onClear={() => setDraft({})} /></div>
      <div className="border-t border-border bg-surface px-5 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {invalidRange && <p role="alert" className="mb-3 text-sm text-destructive">{t('O orçamento mínimo deve ser inferior ao máximo.', 'The minimum budget must be below the maximum.')}</p>}
        <button type="button" disabled={invalidRange} onClick={() => onApply(draft)} className="flex min-h-12 w-full items-center justify-center rounded bg-primary px-5 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">{t('Mostrar critérios', 'Show criteria')}</button>
      </div>
    </section>
  </div>
}

function RequestsLoading({ view = 'list' }: { view?: ResultView }) {
  const { t } = useLanguage()
  return <div role="status" aria-label={t('A carregar critérios', 'Loading criteria')}><span className="sr-only">{t('A carregar critérios…', 'Loading criteria…')}</span>{view === 'map' ? <Skeleton className="h-[min(62dvh,640px)] w-full rounded-md" /> : <div className="result-card-grid">{Array.from({ length: 6 }, (_, index) => <div key={index} className="border border-border bg-surface p-5"><Skeleton className="h-8 w-40" /><Skeleton className="mt-4 h-5 w-4/5" /><Skeleton className="mt-3 h-4 w-3/5" /><Skeleton className="mt-8 h-4 w-1/2" /></div>)}</div>}</div>
}

function RequestsError({ retry, stale = false }: { retry: () => void; stale?: boolean }) {
  const { t } = useLanguage()
  return <div role="alert" className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive"><p className="font-semibold">{stale ? t('Estes critérios podem estar desatualizados.', 'These criteria may be out of date.') : t('Não foi possível carregar os critérios.', 'Criteria could not be loaded.')}</p><p className="mt-1">{t('Verifique a sua ligação e tente novamente.', 'Check your connection and try again.')}</p><button type="button" onClick={retry} className="mt-3 min-h-11 rounded border border-destructive/40 px-4 font-semibold hover:bg-surface">{t('Tentar novamente', 'Try again')}</button></div>
}

function RequestsEmpty({ filtered, emptyPage = false, onClear }: { filtered?: boolean; emptyPage?: boolean; onClear: () => void }) {
  const { t } = useLanguage()
  return <div className="mt-6 rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center"><p className="text-lg font-semibold">{emptyPage ? t('Sem critérios nesta página', 'No criteria on this page') : t('Nenhum critério encontrado', 'No criteria found')}</p><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{emptyPage ? t('Volte à primeira página para ver os critérios disponíveis.', 'Return to the first page to see current criteria.') : filtered ? t('Experimente uma localização mais abrangente ou menos filtros.', 'Try a broader place or fewer filters.') : t('Os novos critérios aparecerão aqui assim que forem publicados.', 'New criteria will appear here as they are published.')}</p>{emptyPage || filtered ? <button type="button" onClick={onClear} className="mt-5 min-h-11 rounded bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">{emptyPage ? t('Ir para a primeira página', 'Go to first page') : t('Limpar pesquisa e filtros', 'Clear search and filters')}</button> : <Link to="/feed" className="mt-5 inline-flex min-h-11 items-center rounded border border-border px-5 text-sm font-semibold text-foreground hover:bg-accent">{t('Explorar imóveis', 'Browse properties')}</Link>}</div>
}

function Pagination({ page, hasNext, total, limit, onPage }: { page: number; hasNext: boolean; total: number; limit: number; onPage: (page: number) => void }) {
  const { t } = useLanguage()
  if (total <= limit && page === 1) return null
  const pages = Math.max(1, Math.ceil(total / limit))
  return <nav aria-label={t('Páginas de critérios', 'Criteria pages')} className="mt-7 flex items-center justify-center gap-3"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="min-h-11 rounded border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">{t('Anterior', 'Previous')}</button><span className="text-sm text-muted-foreground">{t(`Página ${page} de ${pages}`, `Page ${page} of ${pages}`)}</span><button type="button" disabled={!hasNext} onClick={() => onPage(page + 1)} className="min-h-11 rounded border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">{t('Seguinte', 'Next')}</button></nav>
}

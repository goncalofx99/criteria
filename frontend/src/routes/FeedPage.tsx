import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useQuery } from '@apollo/client'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpDown, List, Loader2, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { SEARCH_SELLER_POSTS } from '@/lib/gql'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import { PropertyFilters, countPropertyFilters, type SellerPostFilterValues } from '@/components/feed/PropertyFilters'
import {
  SELLER_SORTS, cleanFilters, readBounds, readPage, readSellerFilters,
  readSort, writeBounds, writeSellerFilters,
  type MapBounds, type ResultView, type SellerSort,
} from '@/components/feed/feedState'
import { formatCompactPrice, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResultCardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { languageTag, useLanguage } from '@/lib/language'
import { publicLocationLabel } from '@/lib/locations'

const LIST_LIMIT = 24
const MAP_LIMIT = 200
const MOBILE_SORT_LABELS: Record<string, string> = {
  newest: 'Newest', oldest: 'Oldest', price_asc: 'Price: low', price_desc: 'Price: high',
  area_desc: 'Area: large', area_asc: 'Area: small', price_per_sqm_asc: '€/m²: low',
  price_per_sqm_desc: '€/m²: high',
}
function sellerSortLabel(value: string, mobile: boolean): string {
  const labels: Record<string, [string, string]> = {
    newest: ['Mais recentes', 'Mais recentes primeiro'], oldest: ['Mais antigos', 'Mais antigos primeiro'],
    price_asc: ['Preço: menor', 'Preço: menor primeiro'], price_desc: ['Preço: maior', 'Preço: maior primeiro'],
    area_desc: ['Área: maior', 'Área: maior primeiro'], area_asc: ['Área: menor', 'Área: menor primeiro'],
    price_per_sqm_asc: ['€/m²: menor', 'Preço por m²: menor primeiro'],
    price_per_sqm_desc: ['€/m²: maior', 'Preço por m²: maior primeiro'],
  }
  return labels[value]?.[mobile ? 0 : 1] ?? value
}
type SearchResult<T> = { items: T[]; totalCount: number; hasNextPage: boolean }

export default function FeedPage() {
  const { t, language } = useLanguage()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const view: ResultView = params.get('view') === 'map' ? 'map' : 'list'
  const sort = readSort(params, 'properties') as SellerSort
  const page = readPage(params)
  const search = params.get('q')?.trim() ?? ''
  const district = params.get('district')?.trim() ?? ''
  const municipality = params.get('municipality')?.trim() ?? ''
  const searchInput = municipality || district || search
  const searchContext = municipality
    ? `${municipality}${district && district !== municipality ? `, ${district}` : ''}`
    : district ? t(`Distrito de ${district}`, `${district} district`)
      : search ? t(`Pesquisa: “${search}”`, `Search: “${search}”`) : t('Em Portugal', 'Across Portugal')
  const [searchDraft, setSearchDraft] = useState(searchInput)
  const [showFilters, setShowFilters] = useState(false)
  const sellerFilters = readSellerFilters(params)
  const bounds = readBounds(params)
  const activeFilterCount = countPropertyFilters(sellerFilters)
  const returnTo = `${location.pathname}${location.search}`
  const resetScroll = Boolean((location.state as { resetScroll?: boolean } | null)?.resetScroll)
  const filterButton = useRef<HTMLButtonElement>(null)

  useEffect(() => setSearchDraft(searchInput), [searchInput])
  useEffect(() => {
    const key = `property-results-scroll:${returnTo}`
    const save = () => sessionStorage.setItem(key, String(window.scrollY))
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [returnTo])

  const closeFilters = useCallback(() => {
    setShowFilters(false)
    requestAnimationFrame(() => filterButton.current?.focus())
  }, [])

  const updateParams = (mutate: (next: URLSearchParams) => void, replace = false) => {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      mutate(next)
      return next
    }, { replace })
  }

  const changeView = (next: ResultView) => updateParams(params => {
    if (next === 'list') params.delete('view')
    else params.set('view', 'map')
    params.delete('page')
  })

  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    if (searchDraft.trim() === searchInput) return
    updateParams(params => {
      const value = searchDraft.trim()
      if (value) params.set('q', value)
      else params.delete('q')
      params.delete('district')
      params.delete('municipality')
      params.delete('page')
      writeBounds(params)
    })
  }

  const applyFilters = (filters: SellerPostFilterValues) => {
    updateParams(params => {
      writeSellerFilters(params, filters)
    })
    closeFilters()
  }

  const changeSort = (next: string) => updateParams(params => {
    if (next === 'newest') params.delete('sort')
    else params.set('sort', next)
    params.delete('page')
  })

  const changePage = (next: number) => {
    updateParams(params => {
      if (next <= 1) params.delete('page')
      else params.set('page', String(next))
    })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const changeBounds = (next?: MapBounds) => updateParams(params => writeBounds(params, next))
  const clearSearchFilters = () => updateParams(params => {
    params.delete('q')
    params.delete('district')
    params.delete('municipality')
    writeSellerFilters(params, {})
    writeBounds(params)
  })

  return (
    <div className="min-h-dvh">
      <PageHeader className="relative !top-auto bg-background backdrop-blur-none">
        <div className="workspace-content px-5 pb-3 pt-3 sm:px-6 md:px-8 md:pb-6 md:pt-7 lg:px-10">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end lg:gap-10 xl:gap-16">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              <Link to="/" aria-label={t('Voltar ao início', 'Back to home')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border bg-surface text-primary transition-colors hover:bg-accent"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>
              <div className="min-w-0">
                <h1 className="text-[1.5rem] font-semibold leading-tight tracking-[-.025em] text-foreground md:text-[2.25rem]">{t('Imóveis à venda', 'Homes for sale')}</h1>
                <p className="mt-0.5 truncate text-sm text-muted-foreground md:mt-1 md:text-base">{searchContext}</p>
              </div>
            </div>
            <form onSubmit={applySearch} role="search" className="mt-3 flex min-w-0 items-center rounded border border-border bg-surface p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 lg:mt-0">
              <Search className="ml-3 h-5 w-5 shrink-0 text-primary max-[359px]:hidden" aria-hidden="true" />
              <label htmlFor="feed-search" className="sr-only">{t('Pesquisar imóveis por cidade ou palavra-chave', 'Search homes by city or keyword')}</label>
              <input
                id="feed-search"
                type="search"
                value={searchDraft}
                onChange={event => setSearchDraft(event.target.value)}
                placeholder={t('Cidade ou palavra-chave', 'City or keyword')}
                maxLength={120}
                enterKeyHint="search"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button type="submit" className="flex min-h-11 shrink-0 items-center justify-center rounded bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700">{t('Pesquisar', 'Search')}</button>
            </form>
          </div>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:mt-5">
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <button
                ref={filterButton}
                type="button"
                onClick={() => setShowFilters(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-primary-400 hover:bg-accent sm:px-4"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {t('Filtros', 'Filters')}{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </button>
              <label className="relative inline-flex min-h-11 min-w-0 flex-1 items-center rounded border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 hover:border-primary-400 sm:flex-none">
                <ArrowUpDown className="pointer-events-none absolute left-3 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                <span className="sr-only">{t('Ordenar resultados', 'Sort results')}</span>
                <select value={sort} onChange={event => changeSort(event.target.value)} className="w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent py-2.5 pl-3 pr-2 text-base font-medium text-foreground outline-none focus-visible:ring-0 sm:hidden">
                  {SELLER_SORTS.map(option => <option key={option.value} value={option.value}>{language === 'pt' ? sellerSortLabel(option.value, true) : MOBILE_SORT_LABELS[option.value] ?? option.label}</option>)}
                </select>
                <select value={sort} onChange={event => changeSort(event.target.value)} className="hidden cursor-pointer appearance-none bg-transparent py-2.5 pl-9 pr-3 text-sm font-medium text-foreground outline-none focus-visible:ring-0 sm:block">
                  {SELLER_SORTS.map(option => <option key={option.value} value={option.value}>{language === 'pt' ? sellerSortLabel(option.value, false) : option.label}</option>)}
                </select>
              </label>
              <ViewToggle view={view} onChange={changeView} />
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="workspace-content px-5 pb-6 pt-4 sm:px-6 md:px-8 md:pt-6 lg:px-10">
        <Properties view={view} filters={sellerFilters} search={search} district={district} municipality={municipality} bounds={bounds} sort={sort} page={page} onPage={changePage} onBounds={changeBounds} onClear={clearSearchFilters} returnTo={returnTo} resetScroll={resetScroll} />
      </div>

      {showFilters && (
        <FilterDialog
          sellerFilters={sellerFilters}
          onApply={applyFilters}
          onClose={closeFilters}
        />
      )}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: ResultView; onChange: (view: ResultView) => void }) {
  const { t } = useLanguage()
  const nextView = view === 'list' ? 'map' : 'list'
  const NextIcon = nextView === 'map' ? MapIcon : List
  return (
    <>
      <button type="button" onClick={() => onChange(nextView)} aria-label={nextView === 'map' ? t('Mudar para mapa', 'Switch to map view') : t('Mudar para lista', 'Switch to list view')} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded border border-border bg-surface px-3 text-sm font-medium text-foreground hover:border-primary-400 hover:bg-accent sm:hidden">
        <NextIcon className="h-4 w-4" aria-hidden="true" />{nextView === 'map' ? t('Mapa', 'Map') : t('Lista', 'List')}
      </button>
      <div className="segmented-control !hidden sm:!inline-flex" role="group" aria-label={t('Vista de resultados', 'Result view')}>
        {([{ value: 'list', Icon: List, label: t('Vista de lista', 'List view') }, { value: 'map', Icon: MapIcon, label: t('Vista de mapa', 'Map view') }] as const).map(({ value, Icon, label }) => (
          <button key={value} type="button" onClick={() => onChange(value)} aria-label={label} aria-pressed={view === value} className={cn(
            'flex h-11 w-11 items-center justify-center rounded-sm transition-colors',
            view === value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary',
          )}><Icon className="h-4 w-4" aria-hidden="true" /></button>
        ))}
      </div>
    </>
  )
}

function FilterDialog({ sellerFilters, onApply, onClose }: {
  sellerFilters: SellerPostFilterValues
  onApply: (filters: SellerPostFilterValues) => void
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [draftSeller, setDraftSeller] = useState(sellerFilters)
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

  const invalidRange = (draftSeller.priceMin ?? 0) > (draftSeller.priceMax ?? Infinity) ||
    (draftSeller.areaSqmMin ?? 0) > (draftSeller.areaSqmMax ?? Infinity)

  const trapFocus = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Tab' || !dialog.current) return
    const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus() }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6 lg:justify-end" role="presentation">
      <button type="button" tabIndex={-1} aria-label={t('Fechar filtros', 'Close filters')} onClick={onClose} className="absolute inset-0 bg-primary-900/55" />
      <section ref={dialog} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="filter-title" className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-surface shadow-modal sm:max-h-[min(760px,90dvh)] sm:rounded-lg lg:mr-6 lg:w-[420px]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="filter-title" className="text-xl font-semibold">{t('Filtrar imóveis', 'Filter properties')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('Escolha os detalhes mais importantes para si.', 'Choose the details that matter to you.')}</p>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label={t('Fechar filtros', 'Close filters')} className="flex h-11 w-11 items-center justify-center rounded bg-accent text-primary hover:bg-primary-100"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          <PropertyFilters filters={draftSeller} onChange={setDraftSeller} onClear={() => setDraftSeller({})} />
        </div>
        <div className="border-t border-border bg-surface px-5 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {invalidRange && <p role="alert" className="mb-3 text-sm text-destructive">{t('O mínimo deve ser inferior ao máximo.', 'The minimum must be below the maximum.')}</p>}
          <button type="button" disabled={invalidRange} onClick={() => onApply(draftSeller)} className="flex min-h-12 w-full items-center justify-center rounded bg-primary px-5 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">{t('Mostrar resultados', 'Show results')}</button>
        </div>
      </section>
    </div>
  )
}

interface ResultsProps {
  view: ResultView
  filters: SellerPostFilterValues
  search: string
  district: string
  municipality: string
  bounds?: MapBounds
  sort: SellerSort
  page: number
  onPage: (page: number) => void
  onBounds: (bounds?: MapBounds) => void
  onClear: () => void
  returnTo: string
  resetScroll: boolean
}

function useResultScroll(returnTo: string, ready: boolean, resetScroll: boolean) {
  const restored = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || restored.current === returnTo) return
    restored.current = returnTo
    const saved = resetScroll ? 0 : Number(sessionStorage.getItem(`property-results-scroll:${returnTo}`))
    const top = Number.isFinite(saved) && saved > 0 ? saved : 0
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: 'auto' }))
    return () => cancelAnimationFrame(frame)
  }, [ready, returnTo, resetScroll])
}

function Properties({ view, filters, search, district, municipality, bounds, sort, page, onPage, onBounds, onClear, returnTo, resetScroll }: ResultsProps) {
  const gqlFilters = useMemo(() => cleanFilters(filters), [JSON.stringify(filters)]) // URL values are immutable; avoid a new query on each render.
  const limit = view === 'map' ? MAP_LIMIT : LIST_LIMIT
  const { data, loading, error, refetch } = useQuery<{ sellerPostSearch: SearchResult<PropertyCardData> }>(SEARCH_SELLER_POSTS, {
    variables: {
      limit, offset: (page - 1) * limit, filters: gqlFilters,
      search: search || undefined, district: district || undefined, municipality: municipality || undefined,
      bounds, sort,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })
  const result = data?.sellerPostSearch
  useResultScroll(returnTo, Boolean(result), resetScroll)

  if (loading && !result) return <FeedLoading view={view} />
  if (error && (!result || result.totalCount === 0)) return <FeedError retry={() => void refetch()} />
  if (!result || result.totalCount === 0) return <FeedEmpty search={search} filtered={Boolean(gqlFilters || bounds || district || municipality)} onClear={onClear} />
  if (result.items.length === 0) return <FeedEmpty emptyPage onClear={() => onPage(1)} />

  return (
    <>
      <ResultSummary count={result.totalCount} shown={result.items.length} page={page} limit={limit} loading={loading} label="properties" />
      {error && <FeedError stale retry={() => void refetch()} />}
      {view === 'map' ? <MapResults properties={result.items} bounds={bounds} onBounds={onBounds} returnTo={returnTo} /> : (
        <div className="result-card-grid">{result.items.map(property => <PropertyCard key={property.id} property={property} />)}</div>
      )}
      <Pagination page={page} hasNext={result.hasNextPage} total={result.totalCount} limit={limit} onPage={onPage} />
    </>
  )
}

function ResultSummary({ count, shown, page, limit, loading, label }: { count: number; shown: number; page: number; limit: number; loading: boolean; label: string }) {
  const { t, language } = useLanguage()
  const first = shown ? (page - 1) * limit + 1 : 0
  const last = (page - 1) * limit + shown
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground" aria-live="polite">
    <p><strong className="font-semibold text-foreground">{count.toLocaleString(languageTag(language))}</strong> {count === 1 ? t('imóvel', 'property') : t('imóveis', label)} <span className="ml-1">{t(`(a mostrar ${first}–${last})`, `(showing ${first}-${last})`)}</span></p>
    {loading && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('A atualizar resultados', 'Updating results')}</span>}
  </div>
}

function Pagination({ page, hasNext, total, limit, onPage }: { page: number; hasNext: boolean; total: number; limit: number; onPage: (page: number) => void }) {
  const { t } = useLanguage()
  if (total <= limit && page === 1) return null
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return <nav aria-label={t('Páginas de resultados', 'Result pages')} className="mt-7 flex items-center justify-center gap-3">
    <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="min-h-11 rounded border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">{t('Anterior', 'Previous')}</button>
    <span className="text-sm text-muted-foreground">{t(`Página ${page} de ${totalPages}`, `Page ${page} of ${totalPages}`)}</span>
    <button type="button" disabled={!hasNext} onClick={() => onPage(page + 1)} className="min-h-11 rounded border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">{t('Seguinte', 'Next')}</button>
  </nav>
}

function MapResults({ properties, bounds, onBounds, returnTo }: {
  properties: PropertyCardData[]
  bounds?: MapBounds
  onBounds: (bounds?: MapBounds) => void
  returnTo: string
}) {
  const { t, language } = useLanguage()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | undefined>()
  const handleBoundsChange = useCallback((next: MapBounds) => setVisibleBounds(next), [])
  const selectedProperty = properties.find(item => item.id === selectedId)

  return (
    <section aria-label={t('Resultados no mapa', 'Map results')} className="map-results">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!visibleBounds} onClick={() => onBounds(visibleBounds)} className="inline-flex min-h-11 items-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"><MapPin className="h-4 w-4" aria-hidden="true" /> {t('Pesquisar nesta área', 'Search visible area')}</button>
        {bounds && <button type="button" onClick={() => onBounds(undefined)} className="min-h-11 rounded border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">{t('Limpar área do mapa', 'Clear map area')}</button>}
      </div>
      <div className="relative">
        <LazyPostsMap
          properties={properties}
          selectedId={selectedId}
          onSelectPost={setSelectedId}
          onBoundsChange={handleBoundsChange}
          bounds={bounds}
          height="var(--results-map-height)"
        />
        {selectedProperty && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-sm rounded-md border border-border bg-surface p-4 shadow-lift sm:bottom-5 sm:left-auto sm:right-5">
            <button type="button" onClick={() => setSelectedId(null)} aria-label={t('Fechar resultado selecionado', 'Close selected result')} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="h-4 w-4" aria-hidden="true" /></button>
            <p className="pr-10 text-lg font-semibold text-foreground">{formatPrice(selectedProperty.price)}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">{selectedProperty.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{publicLocationLabel(selectedProperty.locationText, language)}</p>
            <Link to={`/listing/${selectedProperty.id}`} state={{ returnTo }} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700">{t('Ver detalhes', 'View details')} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t('Selecione um marcador para ver uma pré-visualização ou use os cartões abaixo.', 'Select a marker to preview it, or use the result cards below.')}</p>
      <div role="list" aria-label={t('Resultados mostrados no mapa', 'Results shown on the map')} className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {properties.map(property => (
          <div role="listitem" key={property.id} className="min-w-[200px] max-w-[240px] shrink-0 snap-start">
            <Link to={`/listing/${property.id}`} state={{ returnTo }} className={cn('block h-full rounded-md border bg-surface p-4 transition-colors hover:border-primary-400 hover:bg-primary-100', selectedId === property.id ? 'border-primary' : 'border-border')}>
              <p className="text-lg font-semibold text-foreground">{formatCompactPrice(property.price)}</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{property.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{publicLocationLabel(property.locationText, language)}</p>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeedLoading({ view = 'list' }: { view?: ResultView }) {
  const { t } = useLanguage()
  return <div role="status" aria-label={t('A carregar resultados', 'Loading results')}>
    <span className="sr-only">{t('A carregar resultados…', 'Loading results…')}</span>
    {view === 'map'
      ? <Skeleton className="h-[min(62dvh,640px)] w-full rounded-md" />
      : <div className="result-card-grid">{Array.from({ length: 6 }, (_, index) => <ResultCardSkeleton key={index} />)}</div>}
  </div>
}

function FeedError({ retry, stale = false }: { retry: () => void; stale?: boolean }) {
  const { t } = useLanguage()
  return <div role="alert" className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
    <p className="font-semibold">{stale ? t('Estes resultados podem estar desatualizados.', 'These results may be out of date.') : t('Não foi possível carregar os imóveis.', 'Properties could not be loaded.')}</p>
    <p className="mt-1">{t('Verifique a sua ligação e tente novamente.', 'Check your connection and try again.')}</p>
    <button type="button" onClick={retry} className="mt-3 min-h-11 rounded border border-destructive/40 px-4 font-semibold hover:bg-surface">{t('Tentar novamente', 'Try again')}</button>
  </div>
}

function FeedEmpty({ search, filtered, emptyPage = false, onClear }: { search?: string; filtered?: boolean; emptyPage?: boolean; onClear: () => void }) {
  const { t } = useLanguage()
  return <div className="mt-6 rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center">
    <p className="text-lg font-semibold">{emptyPage ? t('Sem imóveis nesta página', 'No properties on this page') : t('Nenhum imóvel encontrado', 'No properties found')}</p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{emptyPage ? t('Volte à primeira página para ver os imóveis disponíveis.', 'Return to the first page to see current properties.') : search || filtered ? t('Experimente uma localização mais abrangente ou menos filtros.', 'Try a broader place or fewer filters.') : t('Os novos imóveis aparecerão aqui assim que forem publicados.', 'New properties will appear here as they are published.')}</p>
    {emptyPage || search || filtered
      ? <button type="button" onClick={onClear} className="mt-5 inline-flex min-h-11 items-center rounded bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">{emptyPage ? t('Ir para a primeira página', 'Go to first page') : t('Limpar pesquisa e filtros', 'Clear search and filters')}</button>
      : <Link to="/" className="mt-5 inline-flex min-h-11 items-center rounded bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">{t('Pesquisar noutra localização', 'Search another place')}</Link>}
  </div>
}

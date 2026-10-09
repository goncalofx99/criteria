import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useQuery } from '@apollo/client'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpDown, List, Loader2, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { SEARCH_SELLER_POSTS, SEARCH_BUYER_POSTS } from '@/lib/gql'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import { PropertyFilters, countPropertyFilters, type SellerPostFilterValues } from '@/components/feed/PropertyFilters'
import { CriteriaFilters, countCriteriaFilters, type BuyerPostFilterValues } from '@/components/feed/CriteriaFilters'
import {
  BUYER_SORTS, SELLER_SORTS, cleanFilters, readBounds, readBuyerFilters, readPage, readSellerFilters,
  readSort, writeBounds, writeBuyerFilters, writeSellerFilters,
  type BuyerSort, type MapBounds, type ResultType, type ResultView, type SellerSort,
} from '@/components/feed/feedState'
import { formatCompactPrice, formatPrice, formatPriceRange } from '@/lib/format'
import { useMe } from '@/hooks/useMe'
import { cn } from '@/lib/utils'
import { ResultCardSkeleton, Skeleton } from '@/components/ui/skeleton'

const LIST_LIMIT = 24
const MAP_LIMIT = 200
type SearchResult<T> = { items: T[]; totalCount: number; hasNextPage: boolean }

export default function FeedPage() {
  const { me, canViewCriteria, loading: meLoading } = useMe()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const type: ResultType = canViewCriteria && params.get('type') === 'criteria' ? 'criteria' : 'properties'
  const blockedCriteria = Boolean(me && !canViewCriteria && params.get('type') === 'criteria')
  const view: ResultView = params.get('view') === 'map' ? 'map' : 'list'
  const sort = readSort(params, type)
  const page = readPage(params)
  const search = params.get('q')?.trim() ?? ''
  const [searchDraft, setSearchDraft] = useState(search)
  const [showFilters, setShowFilters] = useState(false)
  const sellerFilters = readSellerFilters(params)
  const buyerFilters = readBuyerFilters(params)
  const bounds = readBounds(params)
  const activeFilterCount = type === 'properties' ? countPropertyFilters(sellerFilters) : countCriteriaFilters(buyerFilters)
  const returnTo = `${location.pathname}${location.search}`
  const filterButton = useRef<HTMLButtonElement>(null)

  useEffect(() => setSearchDraft(search), [search])
  useEffect(() => setShowFilters(false), [type])
  useEffect(() => {
    const key = `criteria-feed-scroll:${returnTo}`
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

  const changeType = (next: ResultType) => updateParams(params => {
    if (next === 'properties') params.delete('type')
    else params.set('type', 'criteria')
    params.delete('sort')
    params.delete('page')
    writeBounds(params)
  })

  const changeView = (next: ResultView) => updateParams(params => {
    if (next === 'list') params.delete('view')
    else params.set('view', 'map')
    params.delete('page')
  })

  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    updateParams(params => {
      const value = searchDraft.trim()
      if (value) params.set('q', value)
      else params.delete('q')
      params.delete('page')
      writeBounds(params)
    })
  }

  const applyFilters = (filters: SellerPostFilterValues | BuyerPostFilterValues) => {
    updateParams(params => {
      if (type === 'properties') writeSellerFilters(params, filters as SellerPostFilterValues)
      else writeBuyerFilters(params, filters as BuyerPostFilterValues)
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
    writeSellerFilters(params, {})
    writeBuyerFilters(params, {})
    writeBounds(params)
  })

  if (meLoading && !me) return <FeedLoading fullPage />

  return (
    <div className="min-h-dvh">
      <PageHeader className="relative !top-auto bg-background/95">
        <div className={cn('workspace-content px-4 sm:px-6 md:px-8 lg:px-10', view === 'map' ? 'pb-4 pt-3 md:pb-5 md:pt-5' : 'pb-5 pt-3 md:pb-7 md:pt-8')}>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end lg:gap-10 xl:gap-16">
            <div className="min-w-0">
              <p className="editorial-kicker">Explore Portugal</p>
              <h1 className={cn(view === 'map' ? 'text-2xl font-semibold tracking-tight md:text-3xl' : 'editorial-title')}>{view === 'map' ? 'Explore the map.' : 'Find your place.'}</h1>
              {view === 'list' && <p className="editorial-subtitle mt-2 max-w-xl text-sm md:text-base">Homes for sale and requests from people ready to buy.</p>}
            </div>
            <form onSubmit={applySearch} role="search" className="mt-5 flex min-w-0 items-center rounded-2xl border border-border bg-surface p-1 shadow-sm focus-within:ring-2 focus-within:ring-ring lg:mt-0">
              <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="feed-search" className="sr-only">Search places, listings, or requests</label>
              <input
                id="feed-search"
                type="search"
                value={searchDraft}
                onChange={event => setSearchDraft(event.target.value)}
                placeholder="City or keyword"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700">Search</button>
            </form>
          </div>

          <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between', view === 'map' ? 'mt-3' : 'mt-5')}>
            {canViewCriteria ? (
              <div className="segmented-control w-full sm:w-auto" role="group" aria-label="Browse type">
                <TabButton active={type === 'properties'} onClick={() => changeType('properties')} label="Properties" />
                <TabButton active={type === 'criteria'} onClick={() => changeType('criteria')} label="Buyer requests" />
              </div>
            ) : <p className="editorial-kicker py-2">Available properties</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button
                ref={filterButton}
                type="button"
                onClick={() => setShowFilters(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-foreground hover:border-primary-400 hover:bg-primary-100 sm:px-4"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
              </button>
              <label className="relative inline-flex min-h-11 min-w-0 items-center rounded-full border border-border bg-surface hover:border-primary-400">
                <ArrowUpDown className="pointer-events-none absolute left-3 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                <span className="sr-only">Sort results</span>
                <select
                  value={sort}
                  onChange={event => changeSort(event.target.value)}
                  className="max-w-[124px] cursor-pointer appearance-none truncate bg-transparent py-2.5 pl-3 pr-3 text-sm font-medium text-foreground outline-none sm:max-w-none sm:pl-9"
                >
                  {(type === 'properties' ? SELLER_SORTS : BUYER_SORTS).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <ViewToggle view={view} onChange={changeView} />
            </div>
          </div>
        </div>
      </PageHeader>

      <div className={cn('workspace-content px-4 sm:px-6 md:px-8 lg:px-10', view === 'map' ? 'py-4' : 'py-6 lg:py-8')}>
        {blockedCriteria && <div role="status" className="mb-5 rounded-2xl border border-primary-200 bg-primary-100 p-4 text-sm text-foreground">Buyer requests are available to sellers. <Link to="/profile" className="font-semibold underline underline-offset-2">Update your role in Profile</Link> to browse them.</div>}
        {type === 'properties' ? (
          <Properties key="properties" view={view} filters={sellerFilters} search={search} bounds={bounds} sort={sort as SellerSort} page={page} onPage={changePage} onBounds={changeBounds} onClear={clearSearchFilters} returnTo={returnTo} />
        ) : (
          <Criteria key="criteria" view={view} filters={buyerFilters} search={search} bounds={bounds} sort={sort as BuyerSort} page={page} onPage={changePage} onBounds={changeBounds} onClear={clearSearchFilters} returnTo={returnTo} />
        )}
      </div>

      {showFilters && (
        <FilterDialog
          key={type}
          type={type}
          sellerFilters={sellerFilters}
          buyerFilters={buyerFilters}
          onApply={applyFilters}
          onClose={closeFilters}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(
      'min-h-10 flex-1 rounded-full px-4 text-sm font-medium transition-colors sm:flex-none',
      active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent hover:text-primary',
    )}>{label}</button>
  )
}

function ViewToggle({ view, onChange }: { view: ResultView; onChange: (view: ResultView) => void }) {
  return (
    <div className="segmented-control" role="group" aria-label="Result view">
      {([{ value: 'list', Icon: List, label: 'List view' }, { value: 'map', Icon: MapIcon, label: 'Map view' }] as const).map(({ value, Icon, label }) => (
        <button key={value} type="button" onClick={() => onChange(value)} aria-label={label} aria-pressed={view === value} className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
          view === value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary',
        )}><Icon className="h-4 w-4" aria-hidden="true" /></button>
      ))}
    </div>
  )
}

function FilterDialog({ type, sellerFilters, buyerFilters, onApply, onClose }: {
  type: ResultType
  sellerFilters: SellerPostFilterValues
  buyerFilters: BuyerPostFilterValues
  onApply: (filters: SellerPostFilterValues | BuyerPostFilterValues) => void
  onClose: () => void
}) {
  const [draftSeller, setDraftSeller] = useState(sellerFilters)
  const [draftBuyer, setDraftBuyer] = useState(buyerFilters)
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

  const invalidRange = type === 'properties'
    ? ((draftSeller.priceMin ?? 0) > (draftSeller.priceMax ?? Infinity) || (draftSeller.areaSqmMin ?? 0) > (draftSeller.areaSqmMax ?? Infinity))
    : (draftBuyer.budgetMin ?? 0) > (draftBuyer.budgetMax ?? Infinity)

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
      <button type="button" tabIndex={-1} aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-primary-900/55" />
      <section ref={dialog} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="filter-title" className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-xl flex-col overflow-hidden rounded-t-[24px] bg-surface shadow-modal sm:max-h-[min(760px,90dvh)] sm:rounded-[24px] lg:mr-6 lg:w-[420px]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="editorial-kicker">Explore</p>
            <h2 id="filter-title" className="mt-1 text-xl font-semibold">Filter {type === 'properties' ? 'properties' : 'buyer requests'}</h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close filters" className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary hover:bg-primary-100"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {type === 'properties'
            ? <PropertyFilters filters={draftSeller} onChange={setDraftSeller} onClear={() => setDraftSeller({})} />
            : <CriteriaFilters filters={draftBuyer} onChange={setDraftBuyer} onClear={() => setDraftBuyer({})} />}
        </div>
        <div className="border-t border-border bg-surface px-5 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {invalidRange && <p role="alert" className="mb-3 text-sm text-destructive">The minimum must be below the maximum.</p>}
          <button type="button" disabled={invalidRange} onClick={() => onApply(type === 'properties' ? draftSeller : draftBuyer)} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">Show results</button>
        </div>
      </section>
    </div>
  )
}

interface ResultsProps<TFilters, TSort> {
  view: ResultView
  filters: TFilters
  search: string
  bounds?: MapBounds
  sort: TSort
  page: number
  onPage: (page: number) => void
  onBounds: (bounds?: MapBounds) => void
  onClear: () => void
  returnTo: string
}

function useResultScroll(returnTo: string, ready: boolean) {
  const restored = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || restored.current === returnTo) return
    restored.current = returnTo
    const saved = Number(sessionStorage.getItem(`criteria-feed-scroll:${returnTo}`))
    if (!Number.isFinite(saved) || saved <= 0) return
    const frame = requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }))
    return () => cancelAnimationFrame(frame)
  }, [ready, returnTo])
}

function Properties({ view, filters, search, bounds, sort, page, onPage, onBounds, onClear, returnTo }: ResultsProps<SellerPostFilterValues, SellerSort>) {
  const gqlFilters = useMemo(() => cleanFilters(filters), [JSON.stringify(filters)]) // URL values are immutable; avoid a new query on each render.
  const limit = view === 'map' ? MAP_LIMIT : LIST_LIMIT
  const { data, loading, error, refetch } = useQuery<{ sellerPostSearch: SearchResult<PropertyCardData> }>(SEARCH_SELLER_POSTS, {
    variables: { limit, offset: (page - 1) * limit, filters: gqlFilters, search: search || undefined, bounds, sort },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })
  const result = data?.sellerPostSearch
  useResultScroll(returnTo, Boolean(result))

  if (loading && !result) return <FeedLoading view={view} />
  if (error && (!result || result.totalCount === 0)) return <FeedError message={error.message} retry={() => void refetch()} />
  if (!result || result.totalCount === 0) return <FeedEmpty search={search} filtered={Boolean(gqlFilters || bounds)} kind="properties" onClear={onClear} />
  if (result.items.length === 0) return <FeedEmpty kind="properties" emptyPage onClear={() => onPage(1)} />

  return (
    <>
      <ResultSummary count={result.totalCount} shown={result.items.length} page={page} limit={limit} loading={loading} label="properties" />
      {error && <FeedError message="Results may be out of date." retry={() => void refetch()} />}
      {view === 'map' ? <MapResults properties={result.items} bounds={bounds} onBounds={onBounds} returnTo={returnTo} /> : (
        <div className="result-card-grid lg:!grid-cols-3">{result.items.map(property => <PropertyCard key={property.id} property={property} />)}</div>
      )}
      <Pagination page={page} hasNext={result.hasNextPage} total={result.totalCount} limit={limit} onPage={onPage} />
    </>
  )
}

function Criteria({ view, filters, search, bounds, sort, page, onPage, onBounds, onClear, returnTo }: ResultsProps<BuyerPostFilterValues, BuyerSort>) {
  const gqlFilters = useMemo(() => cleanFilters(filters), [JSON.stringify(filters)])
  const limit = view === 'map' ? MAP_LIMIT : LIST_LIMIT
  const { data, loading, error, refetch } = useQuery<{ buyerPostSearch: SearchResult<CriteriaCardData> }>(SEARCH_BUYER_POSTS, {
    variables: { limit, offset: (page - 1) * limit, filters: gqlFilters, search: search || undefined, bounds, sort },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })
  const result = data?.buyerPostSearch
  useResultScroll(returnTo, Boolean(result))

  if (loading && !result) return <FeedLoading view={view} />
  if (error && (!result || result.totalCount === 0)) return <FeedError message={error.message} retry={() => void refetch()} />
  if (!result || result.totalCount === 0) return <FeedEmpty search={search} filtered={Boolean(gqlFilters || bounds)} kind="buyer requests" onClear={onClear} />
  if (result.items.length === 0) return <FeedEmpty kind="buyer requests" emptyPage onClear={() => onPage(1)} />

  return (
    <>
      <ResultSummary count={result.totalCount} shown={result.items.length} page={page} limit={limit} loading={loading} label="buyer requests" />
      {error && <FeedError message="Results may be out of date." retry={() => void refetch()} />}
      {view === 'map' ? <MapResults criteria={result.items} bounds={bounds} onBounds={onBounds} returnTo={returnTo} /> : (
        <div className="result-card-grid lg:!grid-cols-3">{result.items.map(criteria => <CriteriaCard key={criteria.id} criteria={criteria} />)}</div>
      )}
      <Pagination page={page} hasNext={result.hasNextPage} total={result.totalCount} limit={limit} onPage={onPage} />
    </>
  )
}

function ResultSummary({ count, shown, page, limit, loading, label }: { count: number; shown: number; page: number; limit: number; loading: boolean; label: string }) {
  const first = shown ? (page - 1) * limit + 1 : 0
  const last = (page - 1) * limit + shown
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground" aria-live="polite">
    <p><strong className="font-semibold text-foreground">{count.toLocaleString()}</strong> {label} found <span className="ml-1">· Showing {first}–{last}</span></p>
    {loading && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Updating results</span>}
  </div>
}

function Pagination({ page, hasNext, total, limit, onPage }: { page: number; hasNext: boolean; total: number; limit: number; onPage: (page: number) => void }) {
  if (total <= limit && page === 1) return null
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return <nav aria-label="Result pages" className="mt-7 flex items-center justify-center gap-3">
    <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="min-h-11 rounded-xl border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
    <button type="button" disabled={!hasNext} onClick={() => onPage(page + 1)} className="min-h-11 rounded-xl border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">Next</button>
  </nav>
}

function MapResults({ properties, criteria, bounds, onBounds, returnTo }: {
  properties?: PropertyCardData[]
  criteria?: CriteriaCardData[]
  bounds?: MapBounds
  onBounds: (bounds?: MapBounds) => void
  returnTo: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | undefined>()
  const handleBoundsChange = useCallback((next: MapBounds) => setVisibleBounds(next), [])
  const selectedProperty = properties?.find(item => item.id === selectedId)
  const selectedCriteria = criteria?.find(item => item.id === selectedId)

  return (
    <section aria-label="Map results">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!visibleBounds} onClick={() => onBounds(visibleBounds)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"><MapPin className="h-4 w-4" aria-hidden="true" /> Search visible area</button>
        {bounds && <button type="button" onClick={() => onBounds(undefined)} className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">Clear map area</button>}
      </div>
      <div className="relative">
        <LazyPostsMap
          properties={properties}
          criteria={criteria}
          selectedId={selectedId}
          onSelectPost={setSelectedId}
          onBoundsChange={handleBoundsChange}
          bounds={bounds}
          height="clamp(400px, 66vh, 720px)"
        />
        {(selectedProperty || selectedCriteria) && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-lift sm:bottom-5 sm:left-auto sm:right-5">
            <button type="button" onClick={() => setSelectedId(null)} aria-label="Close selected result" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"><X className="h-4 w-4" aria-hidden="true" /></button>
            <p className="editorial-kicker">{selectedProperty ? 'Property' : 'Buyer request'}</p>
            <p className="mt-1 pr-10 text-lg font-semibold text-foreground">{selectedProperty ? formatPrice(selectedProperty.price) : formatPriceRange(selectedCriteria!.priceMin, selectedCriteria!.priceMax)}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">{selectedProperty?.title ?? selectedCriteria?.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedProperty?.locationText ?? selectedCriteria?.locationText}</p>
            <Link to={selectedProperty ? `/listing/${selectedProperty.id}` : `/criteria/${selectedCriteria!.id}`} state={{ returnTo }} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700">View details <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Select a marker to preview it, or use the result cards below.</p>
      <div role="list" aria-label="Results shown on the map" className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {properties?.map(property => (
          <div role="listitem" key={property.id} className="min-w-[200px] max-w-[240px] shrink-0 snap-start">
            <Link to={`/listing/${property.id}`} state={{ returnTo }} className={cn('block h-full rounded-2xl border bg-surface p-4 transition-colors hover:border-primary-400 hover:bg-primary-100', selectedId === property.id ? 'border-primary' : 'border-border')}>
              <p className="editorial-kicker">Property</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCompactPrice(property.price)}</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{property.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{property.locationText}</p>
            </Link>
          </div>
        ))}
        {criteria?.map(request => (
          <div role="listitem" key={request.id} className="min-w-[200px] max-w-[240px] shrink-0 snap-start">
            <Link to={`/criteria/${request.id}`} state={{ returnTo }} className={cn('block h-full rounded-2xl border bg-surface p-4 transition-colors hover:border-primary-400 hover:bg-primary-100', selectedId === request.id ? 'border-primary' : 'border-border')}>
              <p className="editorial-kicker">Buyer request</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCompactPrice(request.priceMin)}–{formatCompactPrice(request.priceMax)}</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{request.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{request.locationText}</p>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeedLoading({ view = 'list', fullPage = false }: { view?: ResultView; fullPage?: boolean }) {
  return <div role="status" aria-label="Loading results" className={fullPage ? 'workspace-content px-4 py-6 sm:px-6 md:px-8 lg:px-10' : ''}>
    <span className="sr-only">Loading results…</span>
    {fullPage && <div aria-hidden="true" className="mb-9 space-y-4">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-12 w-full max-w-xl" />
      <div className="flex gap-3"><Skeleton className="h-10 w-32 rounded-full" /><Skeleton className="h-10 w-32 rounded-full" /></div>
    </div>}
    {view === 'map'
      ? <Skeleton className="h-[min(62dvh,640px)] w-full rounded-2xl" />
      : <div className="result-card-grid lg:!grid-cols-3">{Array.from({ length: 6 }, (_, index) => <ResultCardSkeleton key={index} />)}</div>}
  </div>
}

function FeedError({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
    <p>Couldn’t load results. {message}</p>
    <button type="button" onClick={retry} className="mt-3 min-h-10 rounded-full border border-destructive/40 px-4 font-semibold hover:bg-surface">Try again</button>
  </div>
}

function FeedEmpty({ search, filtered, kind, emptyPage = false, onClear }: { search?: string; filtered?: boolean; kind: string; emptyPage?: boolean; onClear: () => void }) {
  return <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
    <p className="text-lg font-semibold">{emptyPage ? 'No posts on this page' : `No ${kind} found`}</p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{emptyPage ? 'Return to the first page to see current posts.' : search || filtered ? 'Try a broader place or fewer filters.' : `New ${kind} will appear here as they are published.`}</p>
    {emptyPage || search || filtered
      ? <button type="button" onClick={onClear} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">{emptyPage ? 'Go to first page' : 'Clear search and filters'}</button>
      : <Link to="/create" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">Create a post</Link>}
  </div>
}

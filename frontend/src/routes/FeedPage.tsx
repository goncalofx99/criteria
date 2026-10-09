import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2, List, Map as MapIcon, SlidersHorizontal, ArrowUpDown, Sparkles } from 'lucide-react'
import { GET_SELLER_POSTS, GET_BUYER_POSTS } from '@/lib/gql'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import { PropertyFilters, countPropertyFilters, type SellerPostFilterValues } from '@/components/feed/PropertyFilters'
import { CriteriaFilters, countCriteriaFilters, type BuyerPostFilterValues } from '@/components/feed/CriteriaFilters'
import { useMe } from '@/hooks/useMe'
import { cn } from '@/lib/utils'

type Tab = 'properties' | 'criteria'
type View = 'list' | 'map'

type SortField = 'recency' | 'price' | 'areaSqm' | 'pricePerSqm'
type SortDir = 'asc' | 'desc'
interface SortOption { field: SortField; dir: SortDir }

const SORT_OPTIONS: { value: string; label: string; field: SortField; dir: SortDir }[] = [
  { value: 'recency-desc', label: 'Newest first',           field: 'recency',    dir: 'desc' },
  { value: 'recency-asc',  label: 'Oldest first',           field: 'recency',    dir: 'asc' },
  { value: 'price-asc',    label: 'Price: low to high',     field: 'price',      dir: 'asc' },
  { value: 'price-desc',   label: 'Price: high to low',     field: 'price',      dir: 'desc' },
  { value: 'areaSqm-desc', label: 'Area: largest first',    field: 'areaSqm',    dir: 'desc' },
  { value: 'areaSqm-asc',  label: 'Area: smallest first',   field: 'areaSqm',    dir: 'asc' },
  { value: 'pricePerSqm-asc',  label: 'Price/m²: low to high', field: 'pricePerSqm', dir: 'asc' },
  { value: 'pricePerSqm-desc', label: 'Price/m²: high to low', field: 'pricePerSqm', dir: 'desc' },
]

const DEFAULT_SORT: SortOption = { field: 'recency', dir: 'desc' }

const EMPTY_SELLER_FILTERS: SellerPostFilterValues = {}
const EMPTY_BUYER_FILTERS: BuyerPostFilterValues = {}

export default function FeedPage() {
  const { canViewCriteria } = useMe()
  const [tab, setTab] = useState<Tab>('properties')
  const [view, setView] = useState<View>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [sellerFilters, setSellerFilters] = useState<SellerPostFilterValues>(EMPTY_SELLER_FILTERS)
  const [buyerFilters, setBuyerFilters] = useState<BuyerPostFilterValues>(EMPTY_BUYER_FILTERS)
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT)
  const activeTab: Tab = canViewCriteria ? tab : 'properties'

  const activeFilterCount = activeTab === 'properties'
    ? countPropertyFilters(sellerFilters)
    : countCriteriaFilters(buyerFilters)

  const handleSortChange = (value: string) => {
    const opt = SORT_OPTIONS.find(o => o.value === value)
    if (opt) setSort({ field: opt.field, dir: opt.dir })
  }

  return (
    <div className="min-h-dvh">
      <PageHeader className="relative bg-background/95">
        <div className="workspace-content px-5 pb-5 pt-5 md:px-8 lg:px-10 lg:pb-6 lg:pt-8">
          <p className="editorial-kicker">Discover · Portugal</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="editorial-title">Find your place.</h1>
              <p className="editorial-subtitle mt-2 max-w-xl text-sm md:text-base">
                Explore homes for sale and the people searching for one.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-primary-200 bg-primary-100 px-4 py-2 text-xs font-medium text-primary-700 md:flex">
              <Sparkles size={15} /> Two sides. More possibilities.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {canViewCriteria ? (
              <div className="segmented-control w-full sm:w-auto" role="group" aria-label="Browse type">
                <TabButton active={activeTab === 'properties'} onClick={() => setTab('properties')} label="Properties" />
                <TabButton active={activeTab === 'criteria'} onClick={() => setTab('criteria')} label="Buyer requests" />
              </div>
            ) : <p className="editorial-kicker">Available properties</p>}

            <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                aria-expanded={showFilters}
                aria-controls="mobile-feed-filters"
                className={cn(
                  'mobile-filter-toggle inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium',
                  showFilters ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-foreground',
                )}
              >
                <SlidersHorizontal size={16} /> Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
              {activeTab === 'properties' && (
                <label className="relative inline-flex min-w-0 items-center rounded-full border border-border bg-surface">
                  <ArrowUpDown size={15} className="pointer-events-none absolute left-3 text-muted-foreground" />
                  <span className="sr-only">Sort properties</span>
                  <select
                    value={`${sort.field}-${sort.dir}`}
                    onChange={e => handleSortChange(e.target.value)}
                    className="max-w-[148px] cursor-pointer appearance-none truncate bg-transparent py-2 pl-9 pr-3 text-xs font-medium text-foreground outline-none sm:max-w-none"
                  >
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              )}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="workspace-content px-5 py-6 md:px-8 lg:px-10 lg:py-8">
        <div id="mobile-feed-filters" className="mobile-filters-panel mb-5" hidden={!showFilters}>
          {showFilters && (activeTab === 'properties'
            ? <PropertyFilters filters={sellerFilters} onChange={setSellerFilters} onClear={() => setSellerFilters(EMPTY_SELLER_FILTERS)} />
            : <CriteriaFilters filters={buyerFilters} onChange={setBuyerFilters} onClear={() => setBuyerFilters(EMPTY_BUYER_FILTERS)} />)}
        </div>
        <div className="feed-grid">
          <aside className="desktop-filters self-start" aria-label="Refine results">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-primary-900">Refine results</h2>
              {activeFilterCount > 0 && <span className="quiet-chip">{activeFilterCount} active</span>}
            </div>
            {activeTab === 'properties'
              ? <PropertyFilters filters={sellerFilters} onChange={setSellerFilters} onClear={() => setSellerFilters(EMPTY_SELLER_FILTERS)} />
              : <CriteriaFilters filters={buyerFilters} onChange={setBuyerFilters} onClear={() => setBuyerFilters(EMPTY_BUYER_FILTERS)} />}
          </aside>
          <div className="min-w-0">
            {activeTab === 'properties'
              ? <Properties view={view} filters={sellerFilters} sort={sort} />
              : <Criteria view={view} filters={buyerFilters} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="segmented-control shrink-0" role="group" aria-label="Result view">
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-pressed={view === 'list'}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground',
        )}
      >
        <List size={17} />
      </button>
      <button
        type="button"
        onClick={() => onChange('map')}
        aria-label="Map view"
        aria-pressed={view === 'map'}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          view === 'map' ? 'bg-primary text-white' : 'text-muted-foreground',
        )}
      >
        <MapIcon size={17} />
      </button>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-10 flex-1 rounded-full px-5 text-sm font-medium transition-all sm:flex-none',
        active ? 'bg-primary text-white font-semibold' : 'text-muted-foreground hover:text-primary',
      )}
    >
      {label}
    </button>
  )
}

/** Strip undefined values so Apollo doesn't send nulls for unset filters */
function cleanFilters<T extends object>(f: T): T | undefined {
  const cleaned = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as T
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

function Properties({ view, filters, sort }: { view: View; filters: SellerPostFilterValues; sort: SortOption }) {
  const gqlFilters = useMemo(() => cleanFilters(filters), [filters])
  const { data, loading, error } = useQuery<{ sellerPosts: PropertyCardData[] }>(GET_SELLER_POSTS, {
    variables: { limit: 50, offset: 0, filters: gqlFilters },
    fetchPolicy: 'cache-and-network',
  })

  const properties = useMemo(() => {
    const list = [...(data?.sellerPosts ?? [])]
    const dir = sort.dir === 'asc' ? 1 : -1

    list.sort((a, b) => {
      switch (sort.field) {
        case 'recency': {
          const ta = Number(a.createdAt) || new Date(a.createdAt).getTime()
          const tb = Number(b.createdAt) || new Date(b.createdAt).getTime()
          return (ta - tb) * dir
        }
        case 'price':
          return (a.price - b.price) * dir
        case 'areaSqm': {
          const aa = a.areaSqm ?? (dir > 0 ? Infinity : -Infinity)
          const ba = b.areaSqm ?? (dir > 0 ? Infinity : -Infinity)
          return (aa - ba) * dir
        }
        case 'pricePerSqm': {
          const aPpm = a.areaSqm ? a.price / a.areaSqm : (dir > 0 ? Infinity : -Infinity)
          const bPpm = b.areaSqm ? b.price / b.areaSqm : (dir > 0 ? Infinity : -Infinity)
          return (aPpm - bPpm) * dir
        }
        default:
          return 0
      }
    })

    return list
  }, [data, sort])

  if (loading && !data) return <FeedLoading />
  if (error) return <FeedError message={error.message} />
  if (properties.length === 0) {
    return <FeedEmpty title="No properties yet" body="Be the first to list a property — sellers post here, buyers reach out directly." />
  }

  if (view === 'map') {
    return (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'} on the map
        </p>
        <LazyPostsMap properties={properties} height="clamp(300px, 60vh, 600px)" />
      </>
    )
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
      </p>
      <div className="result-card-grid">
        {properties.map(p => <PropertyCard key={p.id} property={p} />)}
      </div>
    </>
  )
}

function Criteria({ view, filters }: { view: View; filters: BuyerPostFilterValues }) {
  const gqlFilters = useMemo(() => cleanFilters(filters), [filters])
  const { data, loading, error } = useQuery<{ buyerPosts: CriteriaCardData[] }>(GET_BUYER_POSTS, {
    variables: { limit: 50, offset: 0, filters: gqlFilters },
    fetchPolicy: 'cache-and-network',
  })

  if (loading && !data) return <FeedLoading />
  if (error) return <FeedError message={error.message} />

  const criteria = data?.buyerPosts ?? []
  if (criteria.length === 0) {
    return <FeedEmpty title="No criteria yet" body="Once buyers publish what they're looking for, you'll see them here." />
  }

  const intro = (
    <div className="mb-5 flex items-start gap-3 rounded-[20px] border border-primary-200 bg-primary-100/70 p-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Sparkles size={15} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-primary">You're browsing buyer requests</p>
        <p className="mt-0.5 text-xs leading-relaxed text-primary-700/80">
          These are real people actively looking to buy. If you have a matching property, reach out directly.
        </p>
      </div>
    </div>
  )

  if (view === 'map') {
    return (
      <>
        {intro}
        <p className="mb-3 text-sm text-muted-foreground">
          {criteria.length} active buyers on the map
        </p>
        <LazyPostsMap criteria={criteria} height="clamp(300px, 60vh, 600px)" />
      </>
    )
  }

  return (
    <>
      {intro}
      <p className="mb-3 text-sm text-muted-foreground">{criteria.length} active buyers</p>
      <div className="result-card-grid">
        {criteria.map(c => <CriteriaCard key={c.id} criteria={c} />)}
      </div>
    </>
  )
}

function FeedLoading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

function FeedError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
      Couldn't load: {message}
    </div>
  )
}

function FeedEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

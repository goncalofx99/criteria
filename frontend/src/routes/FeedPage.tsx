import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2, List, Map as MapIcon, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
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
    <div>
      <PageHeader>
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-xl font-bold tracking-widest text-primary">CRITERIA</h1>
        </div>

        {canViewCriteria && (
          <div className="px-5 pb-3">
            <div className="flex rounded-xl bg-accent p-1">
              <TabButton
                active={activeTab === 'properties'}
                onClick={() => setTab('properties')}
                label="Properties"
              />
              <TabButton
                active={activeTab === 'criteria'}
                onClick={() => setTab('criteria')}
                label="Buyer Criteria"
              />
            </div>
          </div>
        )}

        {/* Toolbar: filters + sort + view toggle */}
        <div className="flex items-center justify-between gap-1.5 px-5 pb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                'relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors',
                showFilters
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-foreground hover:bg-accent',
              )}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeTab === 'properties' && (
              <div className="relative inline-flex items-center rounded-xl border border-border bg-surface min-w-0">
                <ArrowUpDown size={15} className="pointer-events-none absolute left-2.5 shrink-0 text-muted-foreground" />
                <select
                  value={`${sort.field}-${sort.dir}`}
                  onChange={e => handleSortChange(e.target.value)}
                  className="appearance-none bg-transparent py-2 pl-7 pr-5 text-[13px] font-medium text-foreground outline-none focus:outline-none focus:ring-0 cursor-pointer min-w-0 truncate"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </PageHeader>

      <div className="px-5 py-4">
        {showFilters && activeTab === 'properties' && (
          <div className="mb-4">
            <PropertyFilters
              filters={sellerFilters}
              onChange={setSellerFilters}
              onClear={() => setSellerFilters(EMPTY_SELLER_FILTERS)}
            />
          </div>
        )}
        {showFilters && activeTab === 'criteria' && (
          <div className="mb-4">
            <CriteriaFilters
              filters={buyerFilters}
              onChange={setBuyerFilters}
              onClear={() => setBuyerFilters(EMPTY_BUYER_FILTERS)}
            />
          </div>
        )}

        {activeTab === 'properties'
          ? <Properties view={view} filters={sellerFilters} sort={sort} />
          : <Criteria view={view} filters={buyerFilters} />}
      </div>
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex shrink-0 rounded-xl border border-border p-0.5">
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label="List view"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground',
        )}
      >
        <List size={17} />
      </button>
      <button
        type="button"
        onClick={() => onChange('map')}
        aria-label="Map view"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
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
      className={cn(
        'flex-1 h-10 rounded-lg text-sm font-medium transition-all',
        active ? 'bg-primary text-white font-semibold shadow-elevation-1' : 'text-muted-foreground',
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-100/60 p-4">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm">
        💡
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

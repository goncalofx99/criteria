import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2 } from 'lucide-react'
import { GET_SELLER_POSTS, GET_BUYER_POSTS } from '@/lib/gql'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMe } from '@/hooks/useMe'
import { cn } from '@/lib/utils'

type Tab = 'properties' | 'criteria'

export default function FeedPage() {
  const { canViewCriteria } = useMe()
  const [tab, setTab] = useState<Tab>('properties')
  const activeTab: Tab = canViewCriteria ? tab : 'properties'

  return (
    <div>
      <PageHeader>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
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
      </PageHeader>

      <div className="px-5 py-4">
        {activeTab === 'properties' ? <PropertiesList /> : <CriteriaList />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 h-9 rounded-lg text-sm transition-all',
        active ? 'bg-primary text-white font-semibold shadow-elevation-1' : 'text-muted-foreground',
      )}
    >
      {label}
    </button>
  )
}

function PropertiesList() {
  const { data, loading, error } = useQuery<{ sellerPosts: PropertyCardData[] }>(GET_SELLER_POSTS, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network',
  })

  if (loading && !data) return <FeedLoading />
  if (error) return <FeedError message={error.message} />

  const properties = data?.sellerPosts ?? []
  if (properties.length === 0) return <FeedEmpty title="No properties yet" body="Be the first to list a property — sellers post here, buyers reach out directly." />

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
      </p>
      <div className="flex flex-col gap-4">
        {properties.map(p => <PropertyCard key={p.id} property={p} />)}
      </div>
    </>
  )
}

function CriteriaList() {
  const { data, loading, error } = useQuery<{ buyerPosts: CriteriaCardData[] }>(GET_BUYER_POSTS, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network',
  })

  if (loading && !data) return <FeedLoading />
  if (error) return <FeedError message={error.message} />

  const criteria = data?.buyerPosts ?? []
  if (criteria.length === 0) return <FeedEmpty title="No criteria yet" body="Once buyers publish what they're looking for, you'll see them here." />

  return (
    <>
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

      <p className="mb-3 text-sm text-muted-foreground">{criteria.length} active buyers</p>
      <div className="flex flex-col gap-4">
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

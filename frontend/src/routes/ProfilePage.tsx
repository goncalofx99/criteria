import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2 } from 'lucide-react'
import { GET_MY_SELLER_POSTS, GET_MY_BUYER_POSTS } from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'listings' | 'criteria'

export default function ProfilePage() {
  const { me, canCreateProperty, canCreateCriteria, loading: meLoading } = useMe()
  const [tab, setTab] = useState<Tab | null>(null)

  // Sync tab once role loads
  useEffect(() => {
    if (!meLoading && tab === null) {
      setTab(canCreateProperty ? 'listings' : 'criteria')
    }
  }, [meLoading, canCreateProperty, tab])

  if (!me) {
    return (
      <div className="flex justify-center py-16">
        {meLoading
          ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
          : <p className="text-sm text-muted-foreground">Couldn't load profile.</p>}
      </div>
    )
  }

  const showBothTabs = canCreateProperty && canCreateCriteria
  const activeTab: Tab = showBothTabs
    ? (tab ?? 'listings')
    : canCreateProperty
      ? 'listings'
      : 'criteria'
  const roleLabel = me.role === 'both' ? 'BUYER + SELLER' : me.role.toUpperCase()
  const roleBadgeClass =
    me.role === 'buyer'
      ? 'bg-primary-100 text-primary'
      : me.role === 'seller'
        ? 'bg-warning-muted text-warning-foreground'
        : 'bg-primary text-white'

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="overflow-hidden rounded-2xl bg-surface shadow-elevation-1">
          <div className="h-14 bg-primary" />
          <div className="px-5 pb-5">
            <div className="-mt-9 mb-3 h-[72px] w-[72px] overflow-hidden rounded-full border-4 border-surface bg-primary flex items-center justify-center">
              {me.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-accent">{initialsOf(me.fullName)}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{me.fullName ?? 'Unnamed user'}</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-widest',
                  roleBadgeClass,
                )}
              >
                {roleLabel}
              </span>
            </div>
            {me.email && <p className="mt-1 text-sm text-muted-foreground">{me.email}</p>}
          </div>
        </div>

        {showBothTabs && (
          <div className="mt-5 flex rounded-xl bg-accent p-1">
            <ProfileTabBtn
              active={activeTab === 'listings'}
              label="My listings"
              onClick={() => setTab('listings')}
            />
            <ProfileTabBtn
              active={activeTab === 'criteria'}
              label="My criteria"
              onClick={() => setTab('criteria')}
            />
          </div>
        )}

        <div className="mt-5">
          {activeTab === 'listings' ? <MyListings /> : <MyCriteria />}
        </div>
      </div>
    </div>
  )
}

function ProfileTabBtn({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
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

function MyListings() {
  const { data, loading, error } = useQuery<{ mySellerPosts: PropertyCardData[] }>(GET_MY_SELLER_POSTS, {
    fetchPolicy: 'cache-and-network',
  })
  if (loading && !data) return <ProfileLoading />
  if (error) return <p className="text-sm text-destructive">Couldn't load: {error.message}</p>
  const items = data?.mySellerPosts ?? []
  if (items.length === 0) return <ProfileEmpty body="You haven't listed any properties yet." />
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map(p => <PropertyCard key={p.id} property={p} />)}
    </div>
  )
}

function MyCriteria() {
  const { data, loading, error } = useQuery<{ myBuyerPosts: CriteriaCardData[] }>(GET_MY_BUYER_POSTS, {
    fetchPolicy: 'cache-and-network',
  })
  if (loading && !data) return <ProfileLoading />
  if (error) return <p className="text-sm text-destructive">Couldn't load: {error.message}</p>
  const items = data?.myBuyerPosts ?? []
  if (items.length === 0) return <ProfileEmpty body="You haven't posted any criteria yet." />
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map(c => <CriteriaCard key={c.id} criteria={c} />)}
    </div>
  )
}

function ProfileLoading() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

function ProfileEmpty({ body }: { body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

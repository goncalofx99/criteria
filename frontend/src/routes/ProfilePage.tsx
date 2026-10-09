import { useState, useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Loader2, LogOut } from 'lucide-react'
import { GET_ME, GET_MY_SELLER_POSTS, GET_MY_BUYER_POSTS, UPSERT_USER, REACTIVATE_SELLER_POST, REACTIVATE_BUYER_POST } from '@/lib/gql'
import { useMe, type UserRole } from '@/hooks/useMe'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'listings' | 'criteria'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { me, canCreateProperty, canCreateCriteria, loading: meLoading } = useMe()
  const [tab, setTab] = useState<Tab | null>(null)
  const [chosenRole, setChosenRole] = useState<UserRole | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [roleSaved, setRoleSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [saveRole, { loading: roleSaving }] = useMutation(UPSERT_USER)

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

  const activeTab: Tab = tab ?? (me.role === 'buyer' ? 'criteria' : 'listings')
  const selectedRole = chosenRole ?? me.role
  const currentRole = me.role
  const roleLabel = me.role === 'both' ? 'BUYER + SELLER' : me.role.toUpperCase()
  const roleBadgeClass =
    me.role === 'buyer'
      ? 'bg-primary-100 text-primary'
      : me.role === 'seller'
        ? 'bg-warning-muted text-warning-foreground'
        : 'bg-primary text-white'

  async function handleSaveRole() {
    if (selectedRole === currentRole) return
    setRoleError(null)
    setRoleSaved(false)
    try {
      await saveRole({ variables: { input: { role: selectedRole } }, refetchQueries: [GET_ME], awaitRefetchQueries: true })
      setRoleSaved(true)
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : 'Could not update your role. Try again.')
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="workspace-content px-5 py-7 md:px-8 lg:px-10 lg:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="editorial-kicker">Your account</p><h1 className="editorial-title mt-2">Profile and posts</h1></div>
        <Button variant="outline" onClick={() => { void handleSignOut() }} disabled={signingOut} className="min-h-11">
          {signingOut ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
          Sign out
        </Button>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(270px,350px)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:gap-10">
        <div className="min-w-0">
          <div className="surface-panel overflow-hidden">
            <div className="h-20 bg-primary-900 md:h-28" />
            <div className="px-5 pb-6 md:px-8">
              <div className="-mt-9 mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-primary md:h-20 md:w-20">
                {me.avatarUrl ? (
                  <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">{initialsOf(me.fullName)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-foreground">{me.fullName ?? 'Unnamed user'}</h2>
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

          <section className="surface-panel mt-6 p-5 md:p-6" aria-labelledby="role-heading">
            <h2 id="role-heading" className="text-lg font-semibold text-foreground">How you use CRITERIA</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your role controls what you can publish and browse. Your existing posts stay here to manage.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1" role="group" aria-label="Account role">
              {([
                ['buyer', 'Buyer', 'Browse properties and publish buyer requests'],
                ['seller', 'Seller', 'Browse buyer requests and publish properties'],
                ['both', 'Both', 'Buy and sell with one account'],
              ] as const).map(([value, label, description]) => (
                <button key={value} type="button" onClick={() => { setChosenRole(value); setRoleError(null); setRoleSaved(false) }} aria-pressed={selectedRole === value}
                  className={cn('min-h-20 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selectedRole === value ? 'border-primary bg-primary-100' : 'border-border bg-surface hover:border-primary-200')}>
                  <span className="block text-sm font-semibold text-foreground">{label}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => { void handleSaveRole() }} disabled={selectedRole === me.role || roleSaving} className="min-h-11">
                {roleSaving && <Loader2 className="animate-spin" aria-hidden="true" />}Save role
              </Button>
              {roleSaved && <p role="status" className="text-sm text-primary">Role updated.</p>}
              {roleError && <p role="alert" className="text-sm text-destructive">{roleError}</p>}
            </div>
          </section>
        </div>

        <section className="min-w-0 mt-8 lg:mt-0" aria-label="Your posts">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-foreground">Your posts</h2>
            {(canCreateProperty || canCreateCriteria) && <Link to="/create" state={{ returnTo: '/profile' }} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Create a post</Link>}
          </div>
          <div className="segmented-control mt-4 flex w-full sm:w-auto" role="group" aria-label="Post type">
            <ProfileTabBtn
              active={activeTab === 'listings'}
              label="My listings"
              onClick={() => setTab('listings')}
            />
            <ProfileTabBtn
              active={activeTab === 'criteria'}
              label="Buyer requests"
              onClick={() => setTab('criteria')}
            />
          </div>

        <div className="mt-7">
          {activeTab === 'listings' ? <MyListings canRepublish={canCreateProperty} /> : <MyCriteria canRepublish={canCreateCriteria} />}
        </div>
        </section>
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
      aria-pressed={active}
      className={cn(
        'min-h-11 flex-1 rounded-full px-5 text-sm transition-all sm:flex-none',
        active ? 'bg-primary text-white font-semibold shadow-elevation-1' : 'text-muted-foreground',
      )}
    >
      {label}
    </button>
  )
}

function MyListings({ canRepublish }: { canRepublish: boolean }) {
  const { data, loading, error, refetch } = useQuery<{ mySellerPosts: PropertyCardData[] }>(GET_MY_SELLER_POSTS, {
    fetchPolicy: 'cache-and-network',
  })
  const [reactivate] = useMutation(REACTIVATE_SELLER_POST)
  if (loading && !data) return <ProfileLoading />
  if (error) return <ProfileError onRetry={() => { void refetch() }} />
  const items = data?.mySellerPosts ?? []
  return (
    <PostCollection items={items} noun="listing" canRepublish={canRepublish}
      editPath={id => `/listing/${id}/edit`} renderCard={item => <PropertyCard property={item} />}
      onReactivate={async id => { await reactivate({ variables: { id } }); await refetch() }} />
  )
}

function MyCriteria({ canRepublish }: { canRepublish: boolean }) {
  const { data, loading, error, refetch } = useQuery<{ myBuyerPosts: CriteriaCardData[] }>(GET_MY_BUYER_POSTS, {
    fetchPolicy: 'cache-and-network',
  })
  const [reactivate] = useMutation(REACTIVATE_BUYER_POST)
  if (loading && !data) return <ProfileLoading />
  if (error) return <ProfileError onRetry={() => { void refetch() }} />
  const items = data?.myBuyerPosts ?? []
  return (
    <PostCollection items={items} noun="buyer request" canRepublish={canRepublish}
      editPath={id => `/criteria/${id}/edit`} renderCard={item => <CriteriaCard criteria={item} />}
      onReactivate={async id => { await reactivate({ variables: { id } }); await refetch() }} />
  )
}

function PostCollection<T extends { id: string; isActive: boolean }>({ items, noun, canRepublish, editPath, renderCard, onReactivate }: {
  items: T[]
  noun: string
  canRepublish: boolean
  editPath: (id: string) => string
  renderCard: (item: T) => ReactNode
  onReactivate: (id: string) => Promise<void>
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const active = items.filter(item => item.isActive)
  const archived = items.filter(item => !item.isActive)

  async function republish(id: string) {
    setActionError(null)
    setBusyId(id)
    try {
      await onReactivate(id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not republish. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) return <ProfileEmpty body={`You have no ${noun}s yet. Create your first post to get started.`} />

  function cards(posts: T[]) {
    const single = posts.length === 1
    return <div className={cn('result-card-grid mt-4', single && 'lg:!grid-cols-1')}>
      {posts.map(item => <div key={item.id} className={cn(
        'min-w-0',
        single && noun === 'listing' && 'lg:[&_.listing-card]:!flex-row lg:[&_.listing-card>div:first-child]:!aspect-auto lg:[&_.listing-card>div:first-child]:!min-h-[280px] lg:[&_.listing-card>div:first-child]:!w-[42%] lg:[&_.listing-card>div:first-child]:!shrink-0',
      )}>
        {renderCard(item)}
        <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
          <Link to={editPath(item.id)} state={{ returnTo: '/profile' }} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit {noun}</Link>
          {!item.isActive && canRepublish && <Button variant="outline" size="sm" className="ml-auto min-h-11" disabled={busyId === item.id} onClick={() => { void republish(item.id) }}>
            {busyId === item.id && <Loader2 className="animate-spin" aria-hidden="true" />}Republish
          </Button>}
          {!item.isActive && !canRepublish && <span className="ml-auto text-xs text-muted-foreground">Change role to republish</span>}
        </div>
      </div>)}
    </div>
  }

  return <div className="space-y-8">
    {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
    <section>
      <h3 className="text-lg font-semibold text-foreground">Active <span className="text-sm font-normal text-muted-foreground">({active.length})</span></h3>
      {active.length ? cards(active) : <ProfileEmpty body={`No active ${noun}s.`} />}
    </section>
    {archived.length > 0 && <section>
      <h3 className="text-lg font-semibold text-foreground">Archived <span className="text-sm font-normal text-muted-foreground">({archived.length})</span></h3>
      <p className="mt-1 text-sm text-muted-foreground">Archived posts are hidden from Explore. You can edit or republish them.</p>
      {cards(archived)}
    </section>}
  </div>
}

function ProfileLoading() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

function ProfileError({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-xl border border-destructive/30 bg-surface p-5"><p className="text-sm text-destructive">Couldn’t load your posts.</p><Button variant="outline" className="mt-3 min-h-11" onClick={onRetry}>Try again</Button></div>
}

function ProfileEmpty({ body }: { body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

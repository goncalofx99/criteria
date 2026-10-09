import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, Loader2, MessageCircle } from 'lucide-react'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import {
  GET_BUYER_POST,
  GET_MY_BUYER_POSTS,
  DEACTIVATE_BUYER_POST,
  REACTIVATE_BUYER_POST,
  MATCHING_SELLER_POSTS,
  START_CONVERSATION,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { PostMenu } from '@/components/posts/PostMenu'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { Button } from '@/components/ui/button'
import { safeInternalPath } from '@/lib/returnTo'
import { formatPriceRange, initialsOf, avatarColorFor, timeAgo } from '@/lib/format'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import {
  AMENITY_LABEL,
  PROPERTY_CONDITION_LABEL,
  formatFloor,
  type PropertyCondition,
} from '@/lib/amenities'

interface BuyerPostData {
  id: string
  title: string
  description: string | null
  locationText: string
  lat: number
  lng: number
  radiusKm: number
  propertyType: PropertyType
  priceMin: number
  priceMax: number
  bedroomsMin: number
  bathroomsMin: number
  areaSqmMin: number | null
  yearBuiltMin: number | null
  conditions: PropertyCondition[] | null
  floorMin: number | null
  floorMax: number | null
  requiresBalcony: boolean | null
  requiresCentralHeating: boolean | null
  requiredAmenities: string[]
  isActive: boolean
  createdAt: string
  buyer: { id: string; fullName: string | null; avatarUrl: string | null }
}

export default function CriteriaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const returnTo = safeInternalPath((routeLocation.state as { returnTo?: string } | null)?.returnTo, '/feed')
  const { me } = useMe()
  const [contactError, setContactError] = useState<string | null>(null)
  const { data, loading, error, refetch } = useQuery<{ buyerPost: BuyerPostData | null }>(GET_BUYER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [deactivate] = useMutation(DEACTIVATE_BUYER_POST, {
    refetchQueries: [{ query: GET_MY_BUYER_POSTS }],
  })
  const [reactivate] = useMutation(REACTIVATE_BUYER_POST, { refetchQueries: [{ query: GET_MY_BUYER_POSTS }] })
  const [startConversation, { loading: contacting }] = useMutation(START_CONVERSATION)

  const post = data?.buyerPost ?? null
  const isOwner = !!post && !!me && post.buyer.id === me.id
  const canContact = !isOwner && !!post?.isActive && (me?.role === 'seller' || me?.role === 'both')
  const canMatch = me?.role === 'buyer' || me?.role === 'both'
  const { data: matchesData, loading: matchesLoading, error: matchesError, refetch: refetchMatches } = useQuery<{ matchingSellerPosts: PropertyCardData[] }>(MATCHING_SELLER_POSTS, { variables: { buyerPostId: id }, skip: !post || !isOwner || !post.isActive || !canMatch })

  async function contactBuyer() {
    if (!post) return
    setContactError(null)
    try {
      const result = await startConversation({ variables: { input: { buyerPostId: post.id } } })
      navigate(`/inbox/${result.data.startConversation.id}`)
    } catch (cause) {
      setContactError(cause instanceof Error ? cause.message : 'Could not start a conversation. Try again.')
    }
  }

  const prefRows: { label: string; value: string }[] = []
  if (post) {
    if (post.yearBuiltMin != null)
      prefRows.push({ label: 'Built no earlier than', value: String(post.yearBuiltMin) })
    if (post.conditions && post.conditions.length > 0)
      prefRows.push({
        label: 'Acceptable conditions',
        value: post.conditions.map(c => PROPERTY_CONDITION_LABEL[c]).join(', '),
      })
    if (post.floorMin != null || post.floorMax != null) {
      const lo = post.floorMin != null ? formatFloor(post.floorMin) : 'any'
      const hi = post.floorMax != null ? formatFloor(post.floorMax) : 'any'
      prefRows.push({ label: 'Floor range', value: `${lo} – ${hi}` })
    }
    if (post.requiresBalcony) prefRows.push({ label: 'Balcony', value: 'Required' })
    if (post.requiresCentralHeating) prefRows.push({ label: 'Central heating', value: 'Required' })
  }

  return (
    <div>
      <PageHeader>
        <div className="workspace-content flex items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
            onClick={() => navigate(returnTo)}
            aria-label="Back to results"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-overlay"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Buyer request</h1>
          </div>
          {post && isOwner && (
            <PostMenu
              editTo={`/criteria/${post.id}/edit`}
              returnTo={returnTo}
              onArchive={async () => {
                await deactivate({ variables: { id: post.id } })
                await refetch()
              }}
              onReactivate={async () => { await reactivate({ variables: { id: post.id } }); await refetch() }}
              canReactivate={canMatch}
              isActive={post.isActive}
              removeLabel="Archive request"
              confirmTitle="Archive this request?"
            />
          )}
        </div>
      </PageHeader>

      {loading && !post ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error || !post ? (
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h2 className="text-xl font-semibold">{error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? 'Buyer requests are for sellers' : 'Request unavailable'}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? 'Add the seller role in your profile to browse and contact buyers.' : 'This request may have been removed or the link may be incorrect.'}</p>
          <Link to={error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? '/profile' : '/feed'} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white">{error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? 'Manage role' : 'Explore posts'}</Link>
        </div>
      ) : (
        <article className="mx-auto max-w-[940px] px-5 pb-8 pt-5 md:px-8 lg:pt-9">
          <div className="detail-frame">
            <div className="bg-primary-900 px-6 py-6 text-white md:px-9">
              <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-primary-200">A buyer is searching</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">A place that fits their life.</p>
            </div>
            <div className="p-6 md:p-9">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: avatarColorFor(post.buyer.id) }}
                >
                  {initialsOf(post.buyer.fullName)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {post.buyer.fullName ?? 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {post.isActive ? 'Active request' : 'Archived request'} · {timeAgo(post.createdAt)}
                  </p>
                </div>
                {!post.isActive && (
                  <span className="rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white">
                    ARCHIVED
                  </span>
                )}
              </div>

              <h2 className="mt-6 text-[28px] font-semibold leading-tight tracking-[-.04em] text-primary-900">{post.title}</h2>

              <div className="mt-4">
                <p className="editorial-kicker">Budget</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-.04em] text-primary-900">
                  {formatPriceRange(post.priceMin, post.priceMax)}
                </p>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-foreground/70">
                <MapPin size={14} className="text-muted-foreground/70" />
                {post.locationText}
                <span className="text-muted-foreground/70">· {post.radiusKm}km radius</span>
              </p>

              <div className="mt-3">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground/70">
                  {PROPERTY_TYPE_LABEL[post.propertyType]}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-5 text-sm text-foreground/80">
                {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                  <BedDouble size={16} className="text-muted-foreground/70" />
                  {post.bedroomsMin}+ bed
                </span>}
                {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                  <Bath size={16} className="text-muted-foreground/70" />
                  {post.bathroomsMin}+ bath
                </span>}
                {post.areaSqmMin != null && (
                  <span className="flex items-center gap-1.5">
                    <Maximize2 size={16} className="text-muted-foreground/70" />
                    {post.areaSqmMin.toLocaleString()}+ m²
                  </span>
                )}
              </div>

              {prefRows.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {prefRows.map(row => (
                    <div key={row.label} className="rounded-lg border border-border px-3 py-2">
                      <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground">
                        {row.label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">{row.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {post.requiredAmenities.length > 0 && (
                <div className="mt-5">
                  <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground">
                    Required amenities
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {post.requiredAmenities.map(a => (
                      <span key={a} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground/70">
                        {AMENITY_LABEL[a] ?? a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {post.description && (
                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {post.description}
                </p>
              )}

              <section className="mt-5">
                <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  Approximate search area
                </p>
                <LazyPostsMap
                  criteria={[{
                    id: post.id,
                    lat: post.lat,
                    lng: post.lng,
                    radiusKm: post.radiusKm,
                  }]}
                  interactive={false}
                  height="clamp(200px, 30vh, 360px)"
                />
              </section>
              {canContact && <div className="mt-6">
                {contactError && <p role="alert" className="mb-2 text-sm text-destructive">{contactError}</p>}
                <Button type="button" size="lg" className="w-full rounded-xl" disabled={contacting} onClick={() => void contactBuyer()}><MessageCircle size={17} /> {contacting ? 'Opening conversation…' : 'Message buyer'}</Button>
              </div>}
              {isOwner && post.isActive && <section className="mt-8 border-t border-border pt-7">
                <h3 className="text-xl font-semibold text-primary-900">Matching properties</h3>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">Listings that fit your budget and preferences.</p>
                {!canMatch ? <p className="rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground">Add the buyer role in <Link to="/profile" className="font-semibold text-primary underline">your profile</Link> to see matching properties.</p> : matchesLoading ? <Loader2 className="animate-spin text-primary" aria-label="Loading matches" /> : matchesError ? <div><p role="alert" className="text-sm text-destructive">Could not load matches.</p><button type="button" onClick={() => void refetchMatches()} className="mt-2 text-sm font-semibold text-primary underline">Retry</button></div> : (matchesData?.matchingSellerPosts.length ?? 0) > 0 ? <div className="result-card-grid">{matchesData?.matchingSellerPosts.map(item => <PropertyCard key={item.id} property={item} />)}</div> : <p className="rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground">No matching listings yet. Sellers can still discover your request.</p>}
              </section>}
              {!isOwner && !canContact && post.isActive && <p className="mt-5 text-sm text-muted-foreground">Only members with a seller role can contact buyers. <Link to="/profile" className="font-semibold text-primary underline">Manage your role</Link>.</p>}
            </div>
          </div>
        </article>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, Loader2, Calendar, Building, Check, X, ChevronLeft, ChevronRight, MessageCircle, ImageIcon } from 'lucide-react'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import {
  GET_SELLER_POST,
  GET_MY_SELLER_POSTS,
  DEACTIVATE_SELLER_POST,
  REACTIVATE_SELLER_POST,
  MATCHING_BUYER_POSTS,
  START_CONVERSATION,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { PostMenu } from '@/components/posts/PostMenu'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { Button } from '@/components/ui/button'
import { safeInternalPath } from '@/lib/returnTo'
import { formatPrice, initialsOf, avatarColorFor, timeAgo } from '@/lib/format'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import {
  AMENITY_LABEL,
  PROPERTY_CONDITION_LABEL,
  formatFloor,
  type PropertyCondition,
} from '@/lib/amenities'

interface SellerPostData {
  id: string
  title: string
  description: string | null
  locationText: string
  lat: number
  lng: number
  propertyType: PropertyType
  price: number
  bedrooms: number
  bathrooms: number
  areaSqm: number | null
  yearBuilt: number | null
  condition: PropertyCondition
  floor: number | null
  totalFloors: number | null
  hasBalcony: boolean
  hasCentralHeating: boolean
  amenities: string[]
  images: string[]
  isActive: boolean
  createdAt: string
  seller: { id: string; fullName: string | null; avatarUrl: string | null }
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const returnTo = safeInternalPath((routeLocation.state as { returnTo?: string } | null)?.returnTo, '/feed')
  const { me } = useMe()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [contactError, setContactError] = useState<string | null>(null)
  const { data, loading, error, refetch } = useQuery<{ sellerPost: SellerPostData | null }>(GET_SELLER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [deactivate] = useMutation(DEACTIVATE_SELLER_POST, {
    refetchQueries: [{ query: GET_MY_SELLER_POSTS }],
  })
  const [reactivate] = useMutation(REACTIVATE_SELLER_POST, { refetchQueries: [{ query: GET_MY_SELLER_POSTS }] })
  const [startConversation, { loading: contacting }] = useMutation(START_CONVERSATION)

  const post = data?.sellerPost ?? null
  const isOwner = !!post && !!me && post.seller.id === me.id
  const canContact = !isOwner && !!post?.isActive && (me?.role === 'buyer' || me?.role === 'both')
  const canMatch = me?.role === 'seller' || me?.role === 'both'
  const { data: matchesData, loading: matchesLoading, error: matchesError, refetch: refetchMatches } = useQuery<{ matchingBuyerPosts: CriteriaCardData[] }>(MATCHING_BUYER_POSTS, { variables: { sellerPostId: id }, skip: !post || !isOwner || !post.isActive || !canMatch })
  const cover = post?.images[photoIndex % Math.max(1, post.images.length)]

  async function contactSeller() {
    if (!post) return
    setContactError(null)
    try {
      const result = await startConversation({ variables: { input: { sellerPostId: post.id } } })
      navigate(`/inbox/${result.data.startConversation.id}`)
    } catch (cause) {
      setContactError(cause instanceof Error ? cause.message : 'Could not start a conversation. Try again.')
    }
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
            <h1 className="text-lg font-semibold text-foreground">Property details</h1>
          </div>
          {post && isOwner && (
            <PostMenu
              editTo={`/listing/${post.id}/edit`}
              returnTo={returnTo}
              onArchive={async () => {
                await deactivate({ variables: { id: post.id } })
                await refetch()
              }}
              onReactivate={async () => { await reactivate({ variables: { id: post.id } }); await refetch() }}
              canReactivate={canMatch}
              isActive={post.isActive}
              removeLabel="Archive listing"
              confirmTitle="Archive this listing?"
            />
          )}
        </div>
      </PageHeader>

      {loading && !post ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error || !post ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          {error?.message ?? 'Listing not found.'}
        </p>
      ) : (
        <article className="property-detail-layout detail-frame mx-4 mt-4 max-w-[1280px] pb-6 md:mx-8 lg:mx-auto lg:mt-8">
          <div className="property-detail-image relative h-60 w-full bg-overlay md:h-80">
            {cover ? (
              <img src={cover} alt={post.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary-100 via-accent to-primary-200 text-sm text-primary-700">
                <ImageIcon size={38} aria-hidden="true" /> Photo coming soon
              </div>
            )}
            <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm">
              {PROPERTY_TYPE_LABEL[post.propertyType]}
            </span>
            {!post.isActive && (
              <span className="absolute top-3 right-3 rounded-full bg-destructive/90 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                Archived
              </span>
            )}
            {post.images.length > 1 && <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-primary-900/85 px-2 py-1 text-xs text-white">
              <button type="button" aria-label="Previous photo" onClick={() => setPhotoIndex(index => (index - 1 + post.images.length) % post.images.length)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/20"><ChevronLeft size={17} /></button>
              <span aria-live="polite">{photoIndex % post.images.length + 1} / {post.images.length}</span>
              <button type="button" aria-label="Next photo" onClick={() => setPhotoIndex(index => (index + 1) % post.images.length)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/20"><ChevronRight size={17} /></button>
            </div>}
          </div>

          <div className="px-5 pt-6 lg:p-9 xl:p-12">
            <p className="editorial-kicker">Property · For sale</p>
            <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-.045em] text-primary-900 md:text-[38px]">{post.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} className="text-muted-foreground/70" />
              {post.locationText}
            </p>

            <p className="mt-5 text-[32px] font-semibold tracking-[-.045em] text-primary-900">
              {formatPrice(post.price)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-y border-border/70 py-4 text-sm font-medium text-foreground/80">
              {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                <BedDouble size={16} className="text-muted-foreground/70" />
                {post.bedrooms} bed
              </span>}
              {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                <Bath size={16} className="text-muted-foreground/70" />
                {post.bathrooms} bath
              </span>}
              {post.areaSqm != null && (
                <span className="flex items-center gap-1.5">
                  <Maximize2 size={16} className="text-muted-foreground/70" />
                  {post.areaSqm.toLocaleString()} m²
                </span>
              )}
            </div>

            <DetailGrid>
              {(post.propertyType === 'apartment' || post.propertyType === 'house') && <DetailItem
                icon={<Building size={14} />}
                label="Condition"
                value={PROPERTY_CONDITION_LABEL[post.condition]}
              />}
              {post.yearBuilt != null && (
                <DetailItem
                  icon={<Calendar size={14} />}
                  label="Year built"
                  value={String(post.yearBuilt)}
                />
              )}
              {post.floor != null && (
                <DetailItem
                  label="Floor"
                  value={post.totalFloors
                    ? `${formatFloor(post.floor)} of ${post.totalFloors}`
                    : formatFloor(post.floor)}
                />
              )}
              {(post.propertyType === 'apartment' || post.propertyType === 'house') && <DetailItem
                label="Balcony"
                value={post.hasBalcony ? 'Yes' : 'No'}
                positive={post.hasBalcony}
              />}
              {(post.propertyType === 'apartment' || post.propertyType === 'house') && <DetailItem
                label="Central heating"
                value={post.hasCentralHeating ? 'Yes' : 'No'}
                positive={post.hasCentralHeating}
              />}
            </DetailGrid>

            {post.amenities.length > 0 && (
              <section className="mt-6">
                <h3 className="text-lg font-semibold text-primary-900">
                  Other amenities
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.amenities.map(a => (
                    <span key={a} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground/70">
                      {AMENITY_LABEL[a] ?? a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {post.description && (
              <section className="mt-6">
                <h3 className="mb-2 text-lg font-semibold text-primary-900">About this property</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">{post.description}</p>
              </section>
            )}

            <section className="mt-6">
              <h3 className="mb-2 text-lg font-semibold text-primary-900">
                {isOwner ? 'Location' : 'Approximate location'}
              </h3>
              <LazyPostsMap
                {...(isOwner
                  ? { pin: { lat: post.lat, lng: post.lng } }
                  : { approximate: { lat: post.lat, lng: post.lng, radiusM: 1500 } })}
                interactive={false}
                height="clamp(200px, 30vh, 360px)"
              />
            </section>

            <div className="mt-6 flex items-center gap-3 rounded-[18px] border border-border bg-accent/50 p-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: avatarColorFor(post.seller.id) }}
              >
                {initialsOf(post.seller.fullName)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {post.seller.fullName ?? 'Anonymous'}
                </p>
                <p className="text-xs text-muted-foreground">Posted {timeAgo(post.createdAt)}</p>
              </div>
            </div>
            {canContact && <div className="mt-5">
              {contactError && <p role="alert" className="mb-2 text-sm text-destructive">{contactError}</p>}
              <Button type="button" size="lg" className="w-full rounded-xl" disabled={contacting} onClick={() => void contactSeller()}><MessageCircle size={17} /> {contacting ? 'Opening conversation…' : 'Message seller'}</Button>
            </div>}
            {!isOwner && post.isActive && me?.role === 'seller' && <p className="mt-4 text-sm text-muted-foreground">Want to enquire about this property? <Link to="/profile" className="font-semibold text-primary underline">Add the buyer role</Link> in your profile.</p>}
            {isOwner && post.isActive && <section className="mt-8 border-t border-border pt-7">
              <h3 className="text-xl font-semibold text-primary-900">Matching buyer requests</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Buyers whose criteria match this listing.</p>
              {!canMatch ? <p className="rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground">Add the seller role in <Link to="/profile" className="font-semibold text-primary underline">your profile</Link> to see matching buyer requests.</p> : matchesLoading ? <Loader2 className="animate-spin text-primary" aria-label="Loading matches" /> : matchesError ? <div><p role="alert" className="text-sm text-destructive">Could not load matches.</p><button type="button" onClick={() => void refetchMatches()} className="mt-2 text-sm font-semibold text-primary underline">Retry</button></div> : (matchesData?.matchingBuyerPosts.length ?? 0) > 0 ? <div className="result-card-grid">{matchesData?.matchingBuyerPosts.map(item => <CriteriaCard key={item.id} criteria={item} />)}</div> : <p className="rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground">No matching buyer requests yet. Your listing remains discoverable.</p>}
            </section>}
          </div>
        </article>
      )}
    </div>
  )
}
function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-3">
      {children}
    </section>
  )
}

function DetailItem({
  icon, label, value, positive,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="rounded-[16px] border border-border bg-accent/30 px-3 py-3">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground">
        {positive === true && <Check size={14} className="text-primary" />}
        {positive === false && <X size={14} className="text-muted-foreground" />}
        {value}
      </p>
    </div>
  )
}

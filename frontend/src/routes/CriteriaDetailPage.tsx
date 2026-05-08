import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, Loader2 } from 'lucide-react'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import {
  GET_BUYER_POST,
  GET_BUYER_POSTS,
  GET_MY_BUYER_POSTS,
  DEACTIVATE_BUYER_POST,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { PostMenu } from '@/components/posts/PostMenu'
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
  const { me } = useMe()
  const { data, loading, error } = useQuery<{ buyerPost: BuyerPostData | null }>(GET_BUYER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [deactivate] = useMutation(DEACTIVATE_BUYER_POST, {
    refetchQueries: [
      { query: GET_BUYER_POSTS, variables: { limit: 50, offset: 0 } },
      { query: GET_MY_BUYER_POSTS },
    ],
  })

  const post = data?.buyerPost ?? null
  const isOwner = !!post && !!me && post.buyer.id === me.id

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
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-overlay"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-foreground">Buyer criteria</h1>
          </div>
          {post && isOwner && (
            <PostMenu
              editTo={`/criteria/${post.id}/edit`}
              onDelete={async () => {
                await deactivate({ variables: { id: post.id } })
                navigate(-1)
              }}
              isActive={post.isActive}
              removeLabel="Remove criteria"
              confirmTitle="Remove this criteria?"
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
          {error?.message ?? 'Criteria not found.'}
        </p>
      ) : (
        <article className="px-5 pt-5 pb-6">
          <div className="rounded-xl bg-surface shadow-elevation-1 overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-5">
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
                    Active buyer · {timeAgo(post.createdAt)}
                  </p>
                </div>
                {!post.isActive && (
                  <span className="rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white">
                    INACTIVE
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-xl font-semibold text-foreground">{post.title}</h2>

              <div className="mt-4">
                <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground">
                  Budget
                </p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
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
                <span className="flex items-center gap-1.5">
                  <BedDouble size={16} className="text-muted-foreground/70" />
                  {post.bedroomsMin}+ bed
                </span>
                <span className="flex items-center gap-1.5">
                  <Bath size={16} className="text-muted-foreground/70" />
                  {post.bathroomsMin}+ bath
                </span>
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
                  Search area
                </p>
                <LazyPostsMap
                  criteria={[{
                    id: post.id,
                    lat: post.lat,
                    lng: post.lng,
                    radiusKm: post.radiusKm,
                  }]}
                  interactive={false}
                  height={220}
                />
              </section>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}

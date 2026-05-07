import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, Loader2, Calendar, Building, Check, X } from 'lucide-react'
import {
  GET_SELLER_POST,
  GET_SELLER_POSTS,
  GET_MY_SELLER_POSTS,
  DEACTIVATE_SELLER_POST,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { PostMenu } from '@/components/posts/PostMenu'
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
  const { me } = useMe()
  const { data, loading, error } = useQuery<{ sellerPost: SellerPostData | null }>(GET_SELLER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [deactivate] = useMutation(DEACTIVATE_SELLER_POST, {
    refetchQueries: [
      { query: GET_SELLER_POSTS, variables: { limit: 50, offset: 0 } },
      { query: GET_MY_SELLER_POSTS },
    ],
  })

  const post = data?.sellerPost ?? null
  const isOwner = !!post && !!me && post.seller.id === me.id
  const cover = post?.images[0]

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
            <h1 className="text-lg font-bold text-foreground">Listing</h1>
          </div>
          {post && isOwner && (
            <PostMenu
              editTo={`/listing/${post.id}/edit`}
              onDelete={async () => {
                await deactivate({ variables: { id: post.id } })
                navigate(-1)
              }}
              isActive={post.isActive}
              removeLabel="Remove listing"
              confirmTitle="Remove this listing?"
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
        <article className="pb-6">
          <div className="relative h-56 w-full bg-overlay">
            {cover ? (
              <img src={cover} alt={post.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No photo
              </div>
            )}
            <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              {PROPERTY_TYPE_LABEL[post.propertyType]}
            </span>
            {!post.isActive && (
              <span className="absolute top-3 right-3 rounded-full bg-destructive/90 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                Inactive
              </span>
            )}
          </div>

          <div className="px-5 pt-5">
            <p className="text-3xl font-bold tracking-tight text-primary">
              {formatPrice(post.price)}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{post.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} className="text-muted-foreground/70" />
              {post.locationText}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground/80">
              <span className="flex items-center gap-1.5">
                <BedDouble size={16} className="text-muted-foreground/70" />
                {post.bedrooms} bed
              </span>
              <span className="flex items-center gap-1.5">
                <Bath size={16} className="text-muted-foreground/70" />
                {post.bathrooms} bath
              </span>
              {post.areaSqm != null && (
                <span className="flex items-center gap-1.5">
                  <Maximize2 size={16} className="text-muted-foreground/70" />
                  {post.areaSqm.toLocaleString()} m²
                </span>
              )}
            </div>

            <DetailGrid>
              <DetailItem
                icon={<Building size={14} />}
                label="Condition"
                value={PROPERTY_CONDITION_LABEL[post.condition]}
              />
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
              <DetailItem
                label="Balcony"
                value={post.hasBalcony ? 'Yes' : 'No'}
                positive={post.hasBalcony}
              />
              <DetailItem
                label="Central heating"
                value={post.hasCentralHeating ? 'Yes' : 'No'}
                positive={post.hasCentralHeating}
              />
            </DetailGrid>

            {post.amenities.length > 0 && (
              <section className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
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
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {post.description}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
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
          </div>
        </article>
      )}
    </div>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-3">
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
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
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

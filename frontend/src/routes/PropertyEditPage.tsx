import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { ArrowLeft } from 'lucide-react'
import {
  GET_SELLER_POST,
  GET_MY_SELLER_POSTS,
  UPDATE_SELLER_POST,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { PropertyForm, type PropertyFormValues } from '@/components/posts/PropertyForm'
import { EditFormSkeleton } from '@/components/ui/skeleton'
import type { PropertyType } from '@/lib/propertyType'
import type { PropertyCondition } from '@/lib/amenities'
import { safeInternalPath } from '@/lib/returnTo'

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
  seller: { id: string }
}

export default function PropertyEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = safeInternalPath((location.state as { returnTo?: string } | null)?.returnTo, '/feed')
  const { me, loading: meLoading } = useMe()

  const { data, loading, error } = useQuery<{ sellerPost: SellerPostData | null }>(GET_SELLER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [updateSellerPost] = useMutation(UPDATE_SELLER_POST, {
    refetchQueries: [{ query: GET_MY_SELLER_POSTS }],
  })

  const post = data?.sellerPost ?? null
  const isOwner = !!post && !!me && post.seller.id === me.id

  async function handleSubmit(values: PropertyFormValues) {
    if (!post) return
    await updateSellerPost({
      variables: { id: post.id, input: values },
    })
    navigate(`/listing/${post.id}`, { replace: true, state: { returnTo } })
  }

  return (
    <div>
      <PageHeader>
        <div className="workspace-content flex items-center gap-3 px-5 py-4 md:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => navigate(`/listing/${id}`, { state: { returnTo } })}
            aria-label="Back to listing"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-overlay"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Edit listing</h1>
        </div>
      </PageHeader>

      {(loading && !post) || (meLoading && !me) ? (
        <EditFormSkeleton />
      ) : error || !post ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground"><p>Listing unavailable. The post may have been removed or the link may be incorrect.</p><Link to={returnTo} className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">Back to {returnTo.startsWith('/profile') ? 'Profile' : 'Explore'}</Link></div>
      ) : !isOwner ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground"><p>You can only edit your own listings.</p><Link to={`/listing/${post.id}`} state={{ returnTo }} className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">View listing</Link></div>
      ) : (
        <div className="mx-auto max-w-[1160px] px-5 py-7 md:px-8 md:py-10 lg:grid lg:grid-cols-[minmax(220px,290px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
          <div className="lg:sticky lg:top-28">
          <p className="editorial-kicker">Your listing</p>
          <h2 className="editorial-title mb-7 mt-2 lg:mb-0">Refine your post.</h2>
          </div>
          <PropertyForm
            initial={{
              title: post.title,
              description: post.description,
              locationText: post.locationText,
              lat: post.lat,
              lng: post.lng,
              propertyType: post.propertyType,
              price: post.price,
              bedrooms: post.bedrooms,
              bathrooms: post.bathrooms,
              areaSqm: post.areaSqm ?? undefined,
              yearBuilt: post.yearBuilt ?? undefined,
              condition: post.condition,
              floor: post.floor,
              totalFloors: post.totalFloors,
              hasBalcony: post.hasBalcony,
              hasCentralHeating: post.hasCentralHeating,
              amenities: post.amenities,
              images: post.images,
            }}
            submitLabel="Save changes"
            uploadOwnerId={post.seller.id}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  )
}

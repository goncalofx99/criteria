import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  GET_SELLER_POST,
  GET_SELLER_POSTS,
  GET_MY_SELLER_POSTS,
  UPDATE_SELLER_POST,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { PropertyForm, type PropertyFormValues } from '@/components/posts/PropertyForm'
import type { PropertyType } from '@/lib/propertyType'
import type { PropertyCondition } from '@/lib/amenities'

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
  seller: { id: string }
}

export default function PropertyEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { me } = useMe()

  const { data, loading, error } = useQuery<{ sellerPost: SellerPostData | null }>(GET_SELLER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [updateSellerPost] = useMutation(UPDATE_SELLER_POST, {
    refetchQueries: [
      { query: GET_SELLER_POSTS, variables: { limit: 50, offset: 0 } },
      { query: GET_MY_SELLER_POSTS },
    ],
  })

  const post = data?.sellerPost ?? null
  const isOwner = !!post && !!me && post.seller.id === me.id

  async function handleSubmit(values: PropertyFormValues) {
    if (!post) return
    await updateSellerPost({
      variables: { id: post.id, input: values },
    })
    navigate(`/listing/${post.id}`, { replace: true })
  }

  return (
    <div>
      <PageHeader>
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-overlay"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Edit listing</h1>
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
      ) : !isOwner ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          You can only edit your own listings.
        </p>
      ) : (
        <div className="px-5 py-5">
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
            }}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  )
}

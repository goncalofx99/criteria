import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  GET_BUYER_POST,
  GET_BUYER_POSTS,
  GET_MY_BUYER_POSTS,
  UPDATE_BUYER_POST,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { CriteriaForm, type CriteriaFormValues } from '@/components/posts/CriteriaForm'
import type { PropertyType } from '@/lib/propertyType'
import type { PropertyCondition } from '@/lib/amenities'

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
  buyer: { id: string }
}

export default function CriteriaEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { me } = useMe()

  const { data, loading, error } = useQuery<{ buyerPost: BuyerPostData | null }>(GET_BUYER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [updateBuyerPost] = useMutation(UPDATE_BUYER_POST, {
    refetchQueries: [
      { query: GET_BUYER_POSTS, variables: { limit: 50, offset: 0 } },
      { query: GET_MY_BUYER_POSTS },
    ],
  })

  const post = data?.buyerPost ?? null
  const isOwner = !!post && !!me && post.buyer.id === me.id

  async function handleSubmit(values: CriteriaFormValues) {
    if (!post) return
    await updateBuyerPost({
      variables: { id: post.id, input: values },
    })
    navigate(`/criteria/${post.id}`, { replace: true })
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
          <h1 className="text-lg font-bold text-foreground">Edit criteria</h1>
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
      ) : !isOwner ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          You can only edit your own criteria.
        </p>
      ) : (
        <div className="px-5 py-5">
          <CriteriaForm
            initial={{
              title: post.title,
              description: post.description,
              locationText: post.locationText,
              lat: post.lat,
              lng: post.lng,
              radiusKm: post.radiusKm,
              propertyType: post.propertyType,
              priceMin: post.priceMin,
              priceMax: post.priceMax,
              bedroomsMin: post.bedroomsMin,
              bathroomsMin: post.bathroomsMin,
              areaSqmMin: post.areaSqmMin,
              yearBuiltMin: post.yearBuiltMin,
              conditions: post.conditions,
              floorMin: post.floorMin,
              floorMax: post.floorMax,
              requiresBalcony: post.requiresBalcony,
              requiresCentralHeating: post.requiresCentralHeating,
              requiredAmenities: post.requiredAmenities,
            }}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  )
}

import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { ArrowLeft } from 'lucide-react'
import {
  GET_BUYER_POST,
  GET_MY_BUYER_POSTS,
  UPDATE_BUYER_POST,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/layout/PageHeader'
import { CriteriaForm, type CriteriaFormValues } from '@/components/posts/CriteriaForm'
import { EditFormSkeleton } from '@/components/ui/skeleton'
import type { PropertyType } from '@/lib/propertyType'
import type { PropertyCondition } from '@/lib/amenities'
import { safeInternalPath } from '@/lib/returnTo'

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
  const location = useLocation()
  const returnTo = safeInternalPath((location.state as { returnTo?: string } | null)?.returnTo, '/feed')
  const { me, loading: meLoading } = useMe()

  const { data, loading, error } = useQuery<{ buyerPost: BuyerPostData | null }>(GET_BUYER_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const [updateBuyerPost] = useMutation(UPDATE_BUYER_POST, {
    refetchQueries: [{ query: GET_MY_BUYER_POSTS }],
  })

  const post = data?.buyerPost ?? null
  const isOwner = !!post && !!me && post.buyer.id === me.id

  async function handleSubmit(values: CriteriaFormValues) {
    if (!post) return
    await updateBuyerPost({
      variables: { id: post.id, input: values },
    })
    navigate(`/criteria/${post.id}`, { replace: true, state: { returnTo } })
  }

  return (
    <div>
      <PageHeader>
        <div className="workspace-content flex items-center gap-3 px-5 py-4 md:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => navigate(`/criteria/${id}`, { state: { returnTo } })}
            aria-label="Back to request"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:bg-overlay"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Edit criteria</h1>
        </div>
      </PageHeader>

      {(loading && !post) || (meLoading && !me) ? (
        <EditFormSkeleton />
      ) : error || !post ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground"><p>Buyer request unavailable. The post may have been removed or the link may be incorrect.</p><Link to={returnTo} className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">Back to {returnTo.startsWith('/profile') ? 'Profile' : 'Explore'}</Link></div>
      ) : !isOwner ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground"><p>You can only edit your own buyer requests.</p><Link to={`/criteria/${post.id}`} state={{ returnTo }} className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">View request</Link></div>
      ) : (
        <div className="mx-auto max-w-[1160px] px-5 py-7 md:px-8 md:py-10 lg:grid lg:grid-cols-[minmax(220px,290px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
          <div className="lg:sticky lg:top-28">
          <p className="editorial-kicker">Your request</p>
          <h2 className="editorial-title mb-7 mt-2 lg:mb-0">Refine your search.</h2>
          </div>
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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { ArrowLeft, Building2, Search, Loader2, Check } from 'lucide-react'
import {
  CREATE_SELLER_POST,
  CREATE_BUYER_POST,
  GET_SELLER_POSTS,
  GET_BUYER_POSTS,
  GET_MY_SELLER_POSTS,
  GET_MY_BUYER_POSTS,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PropertyForm, type PropertyFormValues } from '@/components/posts/PropertyForm'
import { CriteriaForm, type CriteriaFormValues } from '@/components/posts/CriteriaForm'
import { cn } from '@/lib/utils'

type Mode = 'property' | 'criteria'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { me, canCreateProperty, canCreateCriteria, loading: meLoading } = useMe()
  const [mode, setMode] = useState<Mode | null>(null)

  // Sync mode once role loads, avoiding stale useState initial value
  useEffect(() => {
    if (!meLoading && mode === null) {
      setMode(canCreateProperty ? 'property' : 'criteria')
    }
  }, [meLoading, canCreateProperty, mode])
  const [submitted, setSubmitted] = useState(false)

  const [createSellerPost] = useMutation(CREATE_SELLER_POST, {
    refetchQueries: [
      { query: GET_SELLER_POSTS, variables: { limit: 50, offset: 0 } },
      { query: GET_MY_SELLER_POSTS },
    ],
  })
  const [createBuyerPost] = useMutation(CREATE_BUYER_POST, {
    refetchQueries: [
      { query: GET_BUYER_POSTS, variables: { limit: 50, offset: 0 } },
      { query: GET_MY_BUYER_POSTS },
    ],
  })

  if (!me) {
    return (
      <div>
        <Header onBack={() => navigate(-1)} />
        <div className="flex justify-center py-16">
          {meLoading
            ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
            : <p className="text-sm text-muted-foreground">Couldn't load your profile.</p>}
        </div>
      </div>
    )
  }

  if (!canCreateProperty && !canCreateCriteria) {
    return (
      <div>
        <Header onBack={() => navigate(-1)} />
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          Your account doesn't have a posting role yet.
        </p>
      </div>
    )
  }

  const showToggle = canCreateProperty && canCreateCriteria
  const activeMode: Mode = showToggle
    ? (mode ?? 'property')
    : canCreateProperty
      ? 'property'
      : 'criteria'

  if (submitted) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        }}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary-100">
          <Check size={36} strokeWidth={2.5} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {activeMode === 'property' ? 'Property listed' : 'Criteria published'}
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {activeMode === 'property'
            ? 'Your property is now live and visible to buyers.'
            : 'Sellers can now find you and reach out directly.'}
        </p>
        <Button className="mt-8 rounded-xl" onClick={() => navigate('/feed')}>
          Back to feed
        </Button>
      </div>
    )
  }

  async function handleProperty(values: PropertyFormValues) {
    await createSellerPost({
      variables: { input: { ...values, images: [] } },
    })
    setSubmitted(true)
  }

  async function handleCriteria(values: CriteriaFormValues) {
    await createBuyerPost({ variables: { input: values } })
    setSubmitted(true)
  }

  return (
    <div>
      <Header onBack={() => navigate(-1)} />

      <div className="px-5 py-5">
        {showToggle && (
          <div className="mb-6 flex rounded-xl bg-accent p-1">
            <ModeButton
              icon={<Building2 size={16} />}
              label="List a Property"
              active={activeMode === 'property'}
              onClick={() => setMode('property')}
            />
            <ModeButton
              icon={<Search size={16} />}
              label="Post Criteria"
              active={activeMode === 'criteria'}
              onClick={() => setMode('criteria')}
            />
          </div>
        )}

        {activeMode === 'property' ? (
          <PropertyForm submitLabel="Publish listing" onSubmit={handleProperty} />
        ) : (
          <CriteriaForm
            submitLabel="Post my criteria"
            intro={
              <div className="rounded-xl border border-primary-200 bg-primary-100/60 p-4">
                <p className="text-sm leading-relaxed text-primary-700">
                  <strong>How it works:</strong> publish your search criteria publicly. Sellers with matching properties will reach out to you directly.
                </p>
              </div>
            }
            onSubmit={handleCriteria}
          />
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your post will be visible to all CRITERIA users immediately.
        </p>
      </div>
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <PageHeader>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-overlay"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Create post</h1>
      </div>
    </PageHeader>
  )
}

function ModeButton({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg h-11 text-sm transition-all',
        active ? 'bg-primary text-white font-semibold shadow-elevation-1' : 'text-muted-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

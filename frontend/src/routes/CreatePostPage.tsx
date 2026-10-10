import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { ArrowLeft, Building2, Search, Check } from 'lucide-react'
import {
  CREATE_SELLER_POST,
  CREATE_BUYER_POST,
  GET_MY_SELLER_POSTS,
  GET_MY_BUYER_POSTS,
} from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PropertyForm, type PropertyFormValues } from '@/components/posts/PropertyForm'
import { CriteriaForm, type CriteriaFormValues } from '@/components/posts/CriteriaForm'
import { EditFormSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { safeInternalPath } from '@/lib/returnTo'
import { useLanguage } from '@/lib/language'

type Mode = 'property' | 'criteria'

export default function CreatePostPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = safeInternalPath((location.state as { returnTo?: string } | null)?.returnTo, '/feed')
  const { me, canCreateProperty, canCreateCriteria, loading: meLoading, refetch } = useMe()
  const [modeSelection, setModeSelection] = useState<{ search: string; mode: Mode } | null>(null)
  const [createdPath, setCreatedPath] = useState<string | null>(null)

  const [createSellerPost] = useMutation(CREATE_SELLER_POST, {
    refetchQueries: [{ query: GET_MY_SELLER_POSTS }],
  })
  const [createBuyerPost] = useMutation(CREATE_BUYER_POST, {
    refetchQueries: [{ query: GET_MY_BUYER_POSTS }],
  })

  if (!me) {
    return (
      <div>
        <Header onBack={() => navigate(returnTo)} />
        {meLoading ? <EditFormSkeleton /> : <div className="px-6 py-16 text-center text-sm text-muted-foreground"><p>{t('Não foi possível carregar a sua conta.', 'Couldn’t load your account.')}</p><Button type="button" variant="outline" onClick={() => void refetch()} className="mt-4 min-h-11">{t('Tentar novamente', 'Try again')}</Button></div>}
      </div>
    )
  }

  if (!canCreateProperty && !canCreateCriteria) {
    return (
      <div>
        <Header onBack={() => navigate(returnTo)} />
        <div className="screen-wrap max-w-xl"><p className="screen-intro">{t('Escolha o papel de comprador ou vendedor para publicar.', 'Choose a buyer or seller role to publish a post.')}</p><Button className="mt-5" onClick={() => navigate('/profile')}>{t('Escolher papel', 'Choose your role')}</Button></div>
      </div>
    )
  }

  const showToggle = canCreateProperty && canCreateCriteria
  // A route change resets the manual selection, so /create?type=criteria also
  // works when navigating to it from another part of the app without remounting.
  const requestedMode = new URLSearchParams(location.search).get('type') === 'criteria' ? 'criteria' : 'property'
  const activeMode: Mode = showToggle
    ? (modeSelection?.search === location.search ? modeSelection.mode : requestedMode)
    : canCreateProperty
      ? 'property'
      : 'criteria'

  if (createdPath) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        }}
      >
        <div className="mb-7 flex h-16 w-16 items-center justify-center rounded bg-primary-100">
          <Check size={30} strokeWidth={2} className="text-primary" />
        </div>
        <h1 className="screen-heading text-foreground">
          {activeMode === 'property' ? t('Imóvel publicado', 'Property listed') : t('Critérios publicados', 'Criteria published')}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {activeMode === 'property'
            ? t('O seu imóvel está publicado e visível para todos.', 'Your property is now live and visible to everyone.')
            : t('Os vendedores já podem encontrá-lo e entrar em contacto.', 'Sellers can now find you and reach out directly.')}
        </p>
        <Button className="mt-8 min-h-12 rounded px-7" onClick={() => navigate(createdPath, { replace: true })}>
          {t('Ver publicação', 'View your post')}
        </Button>
        <Button variant="ghost" className="mt-2" onClick={() => navigate('/profile', { replace: true })}>{t('O seu perfil', 'Your profile')}</Button>
      </div>
    )
  }

  async function handleProperty(values: PropertyFormValues) {
    const { data } = await createSellerPost({
      variables: { input: values },
    })
    setCreatedPath(`/listing/${data.createSellerPost.id}`)
  }

  async function handleCriteria(values: CriteriaFormValues) {
    const { data } = await createBuyerPost({ variables: { input: values } })
    setCreatedPath(`/criteria/${data.createBuyerPost.id}`)
  }

  return (
    <div>
      <Header onBack={() => navigate(returnTo)} />

      <div className="mx-auto max-w-[1160px] px-5 pb-14 pt-5 md:px-8 md:pt-10 lg:grid lg:grid-cols-[minmax(220px,300px)_minmax(0,720px)] lg:items-start lg:gap-12 xl:gap-20">
        <div className="mb-4 lg:sticky lg:top-28 lg:mb-0">
          <h2 className="hidden max-w-[480px] text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.06] tracking-[-.035em] text-foreground lg:block">{t('Dê visibilidade ao seu próximo passo.', 'Make your next move visible.')}</h2>
          <p className="screen-intro max-w-md lg:mt-4">
            {t('Partilhe os detalhes que ajudam a encontrar a combinação certa.', 'Share the details that help someone find a good fit.')}
          </p>
          <div className="mt-8 hidden border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground lg:block">
            {t('Partilhe informações corretas. Pode editar ou arquivar a publicação mais tarde no seu perfil.', 'Share accurate details now. You can edit your post or archive it later from your profile.')}
          </div>
        </div>
        <div className="min-w-0">
        {showToggle && (
          <div className="mb-5 grid w-full grid-cols-2 gap-2 border-b border-border pb-5" role="group" aria-label={t('Tipo de publicação', 'Post type')}>
            <ModeButton
              icon={<Building2 size={16} />}
              label={t('Anunciar imóvel', 'List property')}
              active={activeMode === 'property'}
              onClick={() => setModeSelection({ search: location.search, mode: 'property' })}
            />
            <ModeButton
              icon={<Search size={16} />}
              label="Criteria"
              active={activeMode === 'criteria'}
              onClick={() => setModeSelection({ search: location.search, mode: 'criteria' })}
            />
          </div>
        )}

        <div hidden={activeMode !== 'property'}>
          <PropertyForm submitLabel={t('Publicar imóvel', 'Publish listing')} uploadOwnerId={me.id} onSubmit={handleProperty} />
        </div>
        <div hidden={activeMode !== 'criteria'}>
          <CriteriaForm
            submitLabel={t('Publicar critérios', 'Post my criteria')}
            intro={
              <div className="rounded bg-primary-100/60 px-4 py-3">
                <p className="text-sm leading-relaxed text-primary-700">
                  <strong>{t('Como funciona:', 'How it works:')}</strong> {t('Partilhe a sua pesquisa com vendedores elegíveis. Quem tiver imóveis compatíveis pode contactá-lo diretamente.', 'Share your search with eligible sellers. Sellers with matching properties can reach out directly.')}
                </p>
              </div>
            }
            onSubmit={handleCriteria}
          />
        </div>

        <p className="mt-5 max-w-xl text-xs leading-relaxed text-muted-foreground">
          {t('Os anúncios ativos são públicos. Os critérios são visíveis para vendedores elegíveis. As páginas dos imóveis mostram uma localização aproximada: não inclua moradas exatas em textos ou fotografias.', 'Active listings are public. Criteria are visible to eligible sellers. Listing pages show an approximate location, so leave exact addresses out of text and photos.')}
        </p>
        </div>
      </div>
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage()
  return (
    <PageHeader>
      <div className="workspace-content flex items-center gap-3 px-5 py-4 md:px-8 lg:px-10">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('Voltar', 'Go back')}
          className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-overlay"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-foreground">{t('Criar publicação', 'Create a post')}</h1>
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
      aria-pressed={active}
      className={cn(
        'flex min-h-12 min-w-0 items-center justify-center gap-2 rounded border px-2 text-sm font-semibold transition-colors max-[359px]:gap-1 max-[359px]:px-1 max-[359px]:text-[13px] max-[359px]:whitespace-nowrap',
        active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-foreground hover:border-primary-400',
      )}
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, MessageCircle } from 'lucide-react'
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
import { DetailSkeleton, ResultCardSkeleton } from '@/components/ui/skeleton'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { safeInternalPath } from '@/lib/returnTo'
import { formatPriceRange, timeAgo } from '@/lib/format'
import { languageTag, useLanguage } from '@/lib/language'
import { publicLocationLabel } from '@/lib/locations'
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
  const { t, language } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const { me } = useMe()
  const defaultReturnTo = me?.role === 'buyer' ? '/profile' : '/requests'
  const returnTo = safeInternalPath((routeLocation.state as { returnTo?: string } | null)?.returnTo, defaultReturnTo)
  const sourceLabel = returnTo.startsWith('/profile') ? t('Perfil', 'Profile') : returnTo.startsWith('/listing/') ? t('Anúncio', 'Listing') : returnTo.startsWith('/requests') ? t('Critérios', 'Criteria') : t('Resultados', 'Search results')
  const backLabel = returnTo.startsWith('/profile') ? t('Voltar ao perfil', 'Back to Profile') : returnTo.startsWith('/listing/') ? t('Voltar ao anúncio', 'Back to Listing') : returnTo.startsWith('/requests') ? t('Voltar aos critérios', 'Back to Criteria') : t('Voltar aos resultados', 'Back to Search results')
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
    } catch {
      setContactError(t('Não foi possível abrir a conversa. Tente novamente.', 'Could not open a conversation. Try again.'))
    }
  }

  const prefRows: { label: string; value: string }[] = []
  if (post) {
    if (post.yearBuiltMin != null)
      prefRows.push({ label: t('Construído a partir de', 'Built no earlier than'), value: String(post.yearBuiltMin) })
    if (post.conditions && post.conditions.length > 0)
      prefRows.push({
        label: t('Estados aceitáveis', 'Acceptable conditions'),
        value: post.conditions.map(c => PROPERTY_CONDITION_LABEL[c]).join(', '),
      })
    if (post.floorMin != null || post.floorMax != null) {
      const lo = post.floorMin != null ? formatFloor(post.floorMin) : t('qualquer', 'any')
      const hi = post.floorMax != null ? formatFloor(post.floorMax) : t('qualquer', 'any')
      prefRows.push({ label: t('Intervalo de andares', 'Floor range'), value: t(`${lo} a ${hi}`, `${lo} to ${hi}`) })
    }
    if (post.requiresBalcony) prefRows.push({ label: t('Varanda', 'Balcony'), value: t('Indispensável', 'Required') })
    if (post.requiresCentralHeating) prefRows.push({ label: t('Aquecimento central', 'Central heating'), value: t('Indispensável', 'Required') })
  }

  return (
    <div>
      <PageHeader>
        <div className="workspace-content flex items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              aria-label={backLabel}
              className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-overlay"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="text-base font-semibold text-foreground">Criteria</span>
            <nav aria-label={t('Navegação estrutural', 'Breadcrumb')} className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <span aria-hidden="true">/</span><Link to={returnTo} className="hover:text-primary hover:underline">{sourceLabel}</Link>
              <span aria-hidden="true">/</span><span aria-current="page">Criteria</span>
            </nav>
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
              removeLabel={t('Arquivar critérios', 'Archive criteria')}
              confirmTitle={t('Arquivar estes critérios?', 'Archive this criteria post?')}
            />
          )}
        </div>
      </PageHeader>

      {loading && !post ? <DetailSkeleton variant="criteria" /> : error || !post ? (
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">{error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? t('Só vendedores podem consultar critérios', 'Only sellers can browse criteria') : t('Critérios indisponíveis', 'Criteria unavailable')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? t('Adicione o papel de vendedor no seu perfil para consultar e contactar compradores.', 'Add the seller role in your profile to browse and contact buyers.') : t('Estes critérios podem ter sido removidos ou o endereço pode estar incorreto.', 'This criteria post may have been removed or the link may be incorrect.')}</p>
          <Link to={error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? '/profile' : '/requests'} className="mt-5 inline-flex min-h-11 items-center rounded bg-primary px-5 text-sm font-semibold text-white">{error?.graphQLErrors.some(item => item.extensions?.code === 'FORBIDDEN') ? t('Gerir papel', 'Manage role') : t('Explorar critérios', 'Browse criteria')}</Link>
        </div>
      ) : (
        <article className={`mx-auto max-w-[1180px] px-5 pt-6 md:px-8 md:pb-14 lg:pt-10 ${canContact ? 'pb-20' : 'pb-8'}`}>
            <div>
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-12 xl:gap-16">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="price-display text-[clamp(1.5rem,6vw,2rem)] font-semibold leading-tight tracking-[-.025em] tabular-nums text-foreground md:text-[2.5rem]">
                    {formatPriceRange(post.priceMin, post.priceMax)}
                  </p>
                  <span className="text-sm font-medium text-muted-foreground">{t(`Critérios para ${PROPERTY_TYPE_LABEL[post.propertyType].toLowerCase()}`, `${PROPERTY_TYPE_LABEL[post.propertyType]} criteria`)}{post.isActive ? '' : t(' (arquivado)', ' (archived)')}</span>
                </div>
                <h1 className="mt-3 text-[1.75rem] font-semibold leading-[1.16] tracking-[-.025em] text-foreground md:text-[2.25rem]">{post.title}</h1>

                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin size={14} className="text-muted-foreground/70" aria-hidden="true" />
                  {publicLocationLabel(post.locationText, language)}
                  <span>({t(`raio de ${post.radiusKm} km`, `${post.radiusKm} km radius`)})</span>
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border/70 py-4 text-sm font-medium text-foreground">
                  {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                    <BedDouble size={16} className="text-muted-foreground/70" />
                    {post.bedroomsMin}+ {t(post.bedroomsMin === 1 ? 'quarto' : 'quartos', 'bed')}
                  </span>}
                  {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                    <Bath size={16} className="text-muted-foreground/70" />
                    {post.bathroomsMin}+ {t(post.bathroomsMin === 1 ? 'casa de banho' : 'casas de banho', 'bath')}
                  </span>}
                  {post.areaSqmMin != null && (
                    <span className="flex items-center gap-1.5">
                      <Maximize2 size={16} className="text-muted-foreground/70" />
                      {post.areaSqmMin.toLocaleString(languageTag(language))}+ m²
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <MemberAvatar member={post.buyer} className="h-11 w-11 text-sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{post.buyer.fullName ?? t('Comprador', 'Buyer')}</p>
                    <p className="text-xs text-muted-foreground">{post.isActive ? t('Critérios ativos', 'Active criteria') : t('Critérios arquivados', 'Archived criteria')} ({t('publicados', 'posted')} {timeAgo(post.createdAt)})</p>
                  </div>
                </div>

                {prefRows.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 gap-x-6 min-[400px]:grid-cols-2">
                    {prefRows.map(row => (
                      <div key={row.label} className="border-b border-border/70 py-4">
                        <p className="text-xs text-muted-foreground">
                          {row.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{row.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {post.requiredAmenities.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-foreground">
                      {t('Comodidades essenciais', 'Required amenities')}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.requiredAmenities.map(a => (
                        <span key={a} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-foreground">
                          {AMENITY_LABEL[a] ?? a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {post.description && (
                  <p className="mt-8 max-w-[70ch] whitespace-pre-line text-sm leading-[1.75] text-foreground/80">
                    {post.description}
                  </p>
                )}
              </div>

              <aside className="mt-9 lg:sticky lg:top-28 lg:mt-0" aria-label={t('Área de pesquisa e contacto', 'Search area and contact')}>
                {canContact && <div className="hidden md:block">
                  {contactError && <p role="alert" className="mb-2 text-sm text-destructive">{contactError}</p>}
                  <Button type="button" size="lg" className="min-h-12 w-full rounded" disabled={contacting} onClick={() => void contactBuyer()}><MessageCircle size={17} /> {contacting ? t('A abrir conversa…', 'Opening conversation…') : t('Contactar comprador', 'Message buyer')}</Button>
                </div>}
                <section className={canContact ? 'lg:mt-6' : ''}>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {t('Área de pesquisa aproximada', 'Approximate search area')}
                  </h3>
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
              </aside>
              </div>
              {isOwner && post.isActive && <section className="mt-8 border-t border-border pt-7">
                <h3 className="text-xl font-semibold text-foreground">{t('Imóveis compatíveis', 'Matching properties')}</h3>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">{t('Anúncios que correspondem ao seu orçamento e preferências.', 'Listings that fit your budget and preferences.')}</p>
                {!canMatch ? <p className="rounded bg-accent/50 p-4 text-sm text-muted-foreground">{t('Adicione o papel de comprador em', 'Add the buyer role in')} <Link to="/profile" className="font-semibold text-primary underline">{t('o seu perfil', 'your profile')}</Link> {t('para ver imóveis compatíveis.', 'to see matching properties.')}</p> : matchesLoading ? <div role="status" aria-label={t('A carregar imóveis compatíveis', 'Loading matching properties')} className="result-card-grid"><span className="sr-only">{t('A carregar correspondências…', 'Loading matches…')}</span>{[0, 1].map(index => <ResultCardSkeleton key={index} />)}</div> : matchesError ? <div><p role="alert" className="text-sm text-destructive">{t('Não foi possível carregar as correspondências.', 'Could not load matches.')}</p><button type="button" onClick={() => void refetchMatches()} className="mt-2 min-h-11 text-sm font-semibold text-primary underline">{t('Tentar novamente', 'Retry')}</button></div> : (matchesData?.matchingSellerPosts.length ?? 0) > 0 ? <div className="result-card-grid">{matchesData?.matchingSellerPosts.map(item => <PropertyCard key={item.id} property={item} />)}</div> : <p className="rounded bg-accent/50 p-4 text-sm text-muted-foreground">{t('Ainda não há anúncios compatíveis. Os vendedores podem encontrar os seus critérios.', 'No matching listings yet. Sellers can still discover your criteria.')}</p>}
              </section>}
              {!isOwner && !canContact && post.isActive && <p className="mt-5 text-sm text-muted-foreground">{t('Só membros com papel de vendedor podem contactar compradores.', 'Only members with a seller role can contact buyers.')} <Link to="/profile" className="font-semibold text-primary underline">{t('Gerir papel', 'Manage your role')}</Link>.</p>}
            </div>
            {canContact && (
              <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-app border-t border-border bg-surface px-4 py-3 md:hidden">
                {contactError && <p role="alert" className="mb-2 text-sm text-destructive">{contactError}</p>}
                <Button type="button" size="lg" className="min-h-12 w-full rounded" disabled={contacting} onClick={() => void contactBuyer()}><MessageCircle size={17} aria-hidden="true" />{contacting ? t('A abrir conversa…', 'Opening conversation…') : t('Contactar comprador', 'Message buyer')}</Button>
              </div>
            )}
        </article>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin, Calendar, Building, Check, X, ChevronLeft, ChevronRight, MessageCircle, ImageIcon } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { PostMenu } from '@/components/posts/PostMenu'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { Button } from '@/components/ui/button'
import { DetailSkeleton, Skeleton } from '@/components/ui/skeleton'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { safeInternalPath } from '@/lib/returnTo'
import { formatPrice, timeAgo } from '@/lib/format'
import { languageTag, useLanguage } from '@/lib/language'
import { publicLocationLabel } from '@/lib/locations'
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
  const { t, language } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const returnTo = safeInternalPath((routeLocation.state as { returnTo?: string } | null)?.returnTo, '/feed')
  const sourceLabel = returnTo.startsWith('/profile') ? t('Perfil', 'Profile') : returnTo.startsWith('/criteria/') ? t('Critérios', 'Criteria') : t('Resultados', 'Search results')
  const backLabel = returnTo.startsWith('/profile') ? t('Voltar ao perfil', 'Back to Profile') : returnTo.startsWith('/criteria/') ? t('Voltar aos critérios', 'Back to Criteria') : t('Voltar aos resultados', 'Back to Search results')
  const { me } = useMe()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoFailed, setPhotoFailed] = useState(false)
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
  const showMobileContact = !!post?.isActive && !isOwner && (canContact || (!authLoading && !isAuthenticated))
  const canMatch = me?.role === 'seller' || me?.role === 'both'
  const { data: matchesData, loading: matchesLoading, error: matchesError, refetch: refetchMatches } = useQuery<{ matchingBuyerPosts: CriteriaCardData[] }>(MATCHING_BUYER_POSTS, { variables: { sellerPostId: id }, skip: !post || !isOwner || !post.isActive || !canMatch })
  const cover = post?.images[photoIndex % Math.max(1, post.images.length)]
  useEffect(() => setPhotoFailed(false), [cover])

  async function contactSeller() {
    if (!post) return
    setContactError(null)
    try {
      const result = await startConversation({ variables: { input: { sellerPostId: post.id } } })
      navigate(`/inbox/${result.data.startConversation.id}`)
    } catch {
      setContactError(t('Não foi possível abrir a conversa. Tente novamente.', 'Could not open a conversation. Try again.'))
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
              aria-label={backLabel}
              className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-overlay"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="text-base font-semibold text-foreground">{t('Anúncio', 'Listing')}</span>
            <nav aria-label={t('Navegação estrutural', 'Breadcrumb')} className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <span aria-hidden="true">/</span><Link to={returnTo} className="hover:text-primary hover:underline">{sourceLabel}</Link>
              <span aria-hidden="true">/</span><span aria-current="page">{t('Anúncio', 'Listing')}</span>
            </nav>
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
              removeLabel={t('Arquivar anúncio', 'Archive listing')}
              confirmTitle={t('Arquivar este anúncio?', 'Archive this listing?')}
            />
          )}
        </div>
      </PageHeader>

      {loading && !post ? <DetailSkeleton variant="property" /> : error || !post ? (
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">{t('Anúncio indisponível', 'Listing unavailable')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('Este anúncio pode ter sido removido ou o endereço pode estar incorreto.', 'This listing may have been removed or the link may be incorrect.')}</p>
          <Link to={returnTo} className="mt-5 inline-flex min-h-11 items-center rounded bg-primary px-5 text-sm font-semibold text-white">{backLabel}</Link>
        </div>
      ) : (
        <article className={`mx-auto max-w-[1280px] px-5 pt-4 md:px-8 md:pb-14 md:pt-8 lg:px-10 ${showMobileContact ? 'pb-20' : 'pb-8'}`}>
          <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-stretch lg:gap-9 xl:gap-14">
            <div className="relative -mx-5 h-64 overflow-hidden rounded-none bg-overlay md:mx-0 md:h-[480px] md:rounded-sm lg:h-full lg:min-h-[500px]">
              {cover && !photoFailed ? (
                <img src={cover} alt={t(`Fotografia ${photoIndex % post.images.length + 1} de ${post.images.length} de ${post.title}`, `Photo ${photoIndex % post.images.length + 1} of ${post.images.length} for ${post.title}`)} loading="eager" decoding="async" onError={() => setPhotoFailed(true)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-100 text-sm text-primary-700">
                  <ImageIcon size={38} aria-hidden="true" /> {t('Fotografia em breve', 'Photo coming soon')}
                </div>
              )}
              {post.images.length > 1 && <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded bg-primary-900/90 px-2 py-1 text-xs text-white">
                <button type="button" aria-label={t('Fotografia anterior', 'Previous photo')} onClick={() => setPhotoIndex(index => (index - 1 + post.images.length) % post.images.length)} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/20"><ChevronLeft size={17} /></button>
                <span aria-live="polite">{photoIndex % post.images.length + 1} / {post.images.length}</span>
                <button type="button" aria-label={t('Fotografia seguinte', 'Next photo')} onClick={() => setPhotoIndex(index => (index + 1) % post.images.length)} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/20"><ChevronRight size={17} /></button>
              </div>}
            </div>
            <div className="flex min-w-0 flex-col pt-6 lg:py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="price-display text-[2rem] font-semibold leading-tight tracking-[-.025em] tabular-nums text-foreground md:text-[2.5rem]">{formatPrice(post.price)}</p>
                <span className="text-sm font-medium text-muted-foreground">{PROPERTY_TYPE_LABEL[post.propertyType]}{post.isActive ? '' : t(' (arquivado)', ' (archived)')}</span>
              </div>
              <h1 className="mt-3 text-[1.75rem] font-semibold leading-[1.16] tracking-[-.025em] text-foreground md:text-[2.25rem]">{post.title}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={14} className="text-muted-foreground/70" />
                {publicLocationLabel(post.locationText, language)}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border/70 py-4 text-sm font-medium text-foreground">
                {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                  <BedDouble size={16} className="text-muted-foreground/70" />
                  {post.bedrooms} {t(post.bedrooms === 1 ? 'quarto' : 'quartos', 'bed')}
                </span>}
                {(post.propertyType === 'apartment' || post.propertyType === 'house') && <span className="flex items-center gap-1.5">
                  <Bath size={16} className="text-muted-foreground/70" />
                  {post.bathrooms} {t(post.bathrooms === 1 ? 'casa de banho' : 'casas de banho', 'bath')}
                </span>}
                {post.areaSqm != null && (
                  <span className="flex items-center gap-1.5">
                    <Maximize2 size={16} className="text-muted-foreground/70" />
                    {post.areaSqm.toLocaleString(languageTag(language))} m²
                  </span>
                )}
              </div>
              <div className="mt-7">
                <div className="flex items-center gap-3">
                  <MemberAvatar member={post.seller} className="h-10 w-10" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {post.seller.fullName ?? t('Anónimo', 'Anonymous')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('Publicado', 'Posted')} {timeAgo(post.createdAt)}</p>
                  </div>
                </div>
                {canContact && <div className="mt-5 hidden md:block">
                  {contactError && <p role="alert" className="mb-2 text-sm text-destructive">{contactError}</p>}
                  <Button type="button" size="lg" className="min-h-12 w-full rounded" disabled={contacting} onClick={() => void contactSeller()}><MessageCircle size={17} /> {contacting ? t('A abrir conversa…', 'Opening conversation…') : t('Contactar vendedor', 'Message seller')}</Button>
                </div>}
                {!authLoading && !isAuthenticated && post.isActive && <div className="mt-5 hidden md:block">
                  <Button asChild size="lg" className="min-h-12 w-full rounded"><Link to={`/sign-in?next=${encodeURIComponent(routeLocation.pathname)}`}><MessageCircle size={17} />{t('Inicie sessão para contactar o vendedor', 'Log in to message seller')}</Link></Button>
                  <p className="mt-3 text-center text-sm text-muted-foreground">{t('Ainda não tem conta?', 'New to CRITERIA?')} <Link to={`/sign-up?next=${encodeURIComponent(routeLocation.pathname)}`} className="font-semibold text-primary underline underline-offset-4">{t('Criar conta', 'Create an account')}</Link></p>
                </div>}
                {!isOwner && post.isActive && me?.role === 'seller' && <p className="mt-4 text-sm text-muted-foreground">{t('Quer saber mais sobre este imóvel?', 'Want to enquire about this property?')} <Link to="/profile" className="font-semibold text-primary underline">{t('Adicione o papel de comprador', 'Add the buyer role')}</Link> {t('no seu perfil.', 'in your profile.')}</p>}
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-border/70 pt-8 md:mt-12 md:pt-10">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,390px)] lg:items-start lg:gap-10 xl:gap-14">
              <div className="min-w-0">
                <DetailGrid>
                  {(post.propertyType === 'apartment' || post.propertyType === 'house') && <DetailItem
                    icon={<Building size={14} />}
                    label={t('Estado', 'Condition')}
                    value={PROPERTY_CONDITION_LABEL[post.condition]}
                  />}
                  {post.yearBuilt != null && (
                    <DetailItem
                      icon={<Calendar size={14} />}
                      label={t('Ano de construção', 'Year built')}
                      value={String(post.yearBuilt)}
                    />
                  )}
                  {post.floor != null && (
                    <DetailItem
                      label={t('Andar', 'Floor')}
                      value={post.totalFloors
                        ? t(`${formatFloor(post.floor)} de ${post.totalFloors}`, `${formatFloor(post.floor)} of ${post.totalFloors}`)
                        : formatFloor(post.floor)}
                    />
                  )}
                  {(post.propertyType === 'apartment' || post.propertyType === 'house') && <DetailItem
                    label={t('Varanda', 'Balcony')}
                    value={post.hasBalcony ? t('Sim', 'Yes') : t('Não', 'No')}
                    positive={post.hasBalcony}
                  />}
                  {(post.propertyType === 'apartment' || post.propertyType === 'house') && <DetailItem
                    label={t('Aquecimento central', 'Central heating')}
                    value={post.hasCentralHeating ? t('Sim', 'Yes') : t('Não', 'No')}
                    positive={post.hasCentralHeating}
                  />}
                </DetailGrid>

                {post.amenities.length > 0 && (
                  <section className="mt-8">
                    <h3 className="text-lg font-semibold text-foreground">
                      {t('Outras comodidades', 'Other amenities')}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.amenities.map(a => (
                        <span key={a} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-foreground">
                          {AMENITY_LABEL[a] ?? a}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {post.description && (
                  <section className="mt-8">
                    <h3 className="mb-2 text-lg font-semibold text-foreground">{t('Sobre este imóvel', 'About this property')}</h3>
                    <p className="max-w-[70ch] whitespace-pre-line text-sm leading-[1.75] text-foreground/80">{post.description}</p>
                  </section>
                )}
              </div>
              <aside aria-label={t('Localização do imóvel', 'Property location')}>
                <section className="mt-9 lg:mt-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {isOwner ? t('Localização', 'Location') : t('Localização aproximada', 'Approximate location')}
                  </h3>
                  <LazyPostsMap
                    {...(isOwner
                      ? { pin: { lat: post.lat, lng: post.lng } }
                      : { approximate: { lat: post.lat, lng: post.lng, radiusM: 1500 } })}
                    interactive={false}
                    height="clamp(200px, 30vh, 360px)"
                  />
                </section>
              </aside>
            </div>
            {isOwner && post.isActive && <section className="mt-8 border-t border-border pt-7">
              <h3 className="text-xl font-semibold text-foreground">{t('Critérios compatíveis', 'Matching criteria')}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t('Compradores cujos critérios correspondem a este anúncio.', 'Buyers whose criteria match this listing.')}</p>
              {!canMatch ? <p className="rounded bg-accent/50 p-4 text-sm text-muted-foreground">{t('Adicione o papel de vendedor em', 'Add the seller role in')} <Link to="/profile" className="font-semibold text-primary underline">{t('o seu perfil', 'your profile')}</Link> {t('para ver critérios compatíveis.', 'to see matching criteria.')}</p> : matchesLoading ? <div role="status" aria-label={t('A carregar critérios compatíveis', 'Loading matching criteria')} className="result-card-grid"><span className="sr-only">{t('A carregar correspondências…', 'Loading matches…')}</span>{[0, 1].map(index => <div key={index} className="space-y-3 rounded-md border border-border bg-surface p-5"><Skeleton className="h-8 w-3/5" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-5 h-10 w-full" /></div>)}</div> : matchesError ? <div><p role="alert" className="text-sm text-destructive">{t('Não foi possível carregar as correspondências.', 'Could not load matches.')}</p><button type="button" onClick={() => void refetchMatches()} className="mt-2 min-h-11 text-sm font-semibold text-primary underline">{t('Tentar novamente', 'Retry')}</button></div> : (matchesData?.matchingBuyerPosts.length ?? 0) > 0 ? <div className="result-card-grid">{matchesData?.matchingBuyerPosts.map(item => <CriteriaCard key={item.id} criteria={item} />)}</div> : <p className="rounded bg-accent/50 p-4 text-sm text-muted-foreground">{t('Ainda não há critérios compatíveis. O seu anúncio continua visível nas pesquisas.', 'No matching criteria yet. Your listing remains discoverable.')}</p>}
            </section>}
          </div>
          {showMobileContact && (
            <div
              className={`fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-app border-t border-border bg-surface px-4 py-3 md:hidden ${isAuthenticated ? 'bottom-[calc(72px+env(safe-area-inset-bottom))]' : ''}`}
              style={!isAuthenticated ? { paddingBottom: 'max(12px, env(safe-area-inset-bottom))' } : undefined}
            >
              {contactError && <p role="alert" className="mb-2 text-sm text-destructive">{contactError}</p>}
              {canContact ? (
                <Button type="button" size="lg" className="min-h-12 w-full rounded" disabled={contacting} onClick={() => void contactSeller()}><MessageCircle size={17} aria-hidden="true" />{contacting ? t('A abrir conversa…', 'Opening conversation…') : t('Contactar vendedor', 'Message seller')}</Button>
              ) : (
                <Button asChild size="lg" className="min-h-12 w-full rounded"><Link to={`/sign-in?next=${encodeURIComponent(routeLocation.pathname)}`}><MessageCircle size={17} aria-hidden="true" />{t('Inicie sessão para contactar o vendedor', 'Log in to message seller')}</Link></Button>
              )}
            </div>
          )}
        </article>
      )}
    </div>
  )
}
function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-x-6 min-[400px]:grid-cols-2 xl:grid-cols-3">
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
    <div className="border-b border-border/70 py-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-foreground">
        {positive === true && <Check size={14} className="text-primary" />}
        {positive === false && <X size={14} className="text-muted-foreground" />}
        {value}
      </p>
    </div>
  )
}

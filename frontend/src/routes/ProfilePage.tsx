import { useState, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { ArrowUpRight, Check, Loader2, Plus, Settings2 } from 'lucide-react'
import { GET_ME, GET_MY_SELLER_POSTS, GET_MY_BUYER_POSTS, UPSERT_USER, REACTIVATE_SELLER_POST, REACTIVATE_BUYER_POST } from '@/lib/gql'
import { useMe, type UserRole } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { PropertyCard, type PropertyCardData } from '@/components/posts/PropertyCard'
import { CriteriaCard, type CriteriaCardData } from '@/components/posts/CriteriaCard'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { cn } from '@/lib/utils'
import { ResultCardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { localizedError, useLanguage } from '@/lib/language'

type Tab = 'listings' | 'criteria'

export default function ProfilePage() {
  const { language, t } = useLanguage()
  const { me, canCreateProperty, canCreateCriteria, loading: meLoading, error: meError, refetch: refetchMe } = useMe()
  const [tab, setTab] = useState<Tab | null>(null)
  const [chosenRole, setChosenRole] = useState<UserRole | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [roleSaved, setRoleSaved] = useState(false)
  const [saveRole, { loading: roleSaving }] = useMutation(UPSERT_USER)

  // Sync tab once role loads
  useEffect(() => {
    if (!meLoading && tab === null) {
      setTab(canCreateProperty ? 'listings' : 'criteria')
    }
  }, [meLoading, canCreateProperty, tab])

  if (!me) {
    if (meLoading) return <ProfilePageSkeleton />
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
        {meError ? <><p role="alert" className="text-sm text-muted-foreground">{t('Não foi possível carregar o perfil.', "Couldn't load profile.")}</p><Button type="button" variant="outline" onClick={refetchMe} className="min-h-11">{t('Tentar novamente', 'Try again')}</Button></>
            : <><p role="status" className="text-sm text-muted-foreground">{t('A sua conta já não está disponível. Inicie sessão novamente para continuar.', 'Your account is no longer available. Sign in again to continue.')}</p><Button asChild variant="outline" className="min-h-11"><Link to="/sign-in">{t('Iniciar sessão', 'Sign in')}</Link></Button></>}
      </div>
    )
  }

  const activeTab: Tab = tab ?? (me.role === 'buyer' ? 'criteria' : 'listings')
  const selectedRole = chosenRole ?? me.role
  const currentRole = me.role
  const roleLabel = me.role === 'both' ? t('Comprador e vendedor', 'Buyer & seller') : me.role === 'buyer' ? t('Comprador', 'Buyer') : t('Vendedor', 'Seller')
  const roleBadgeClass =
    me.role === 'buyer'
      ? 'bg-primary-100 text-primary'
      : me.role === 'seller'
        ? 'bg-warning-muted text-warning-foreground'
        : 'bg-primary text-white'

  async function handleSaveRole() {
    if (selectedRole === currentRole) return
    setRoleError(null)
    setRoleSaved(false)
    try {
      await saveRole({ variables: { input: { role: selectedRole } }, refetchQueries: [GET_ME], awaitRefetchQueries: true })
      setRoleSaved(true)
    } catch (error) {
      setRoleError(localizedError(error, language, 'Não foi possível alterar o perfil. Tente novamente.', 'Could not update your role. Try again.'))
    }
  }

  function roleControls(headingId: string, className: string) {
    return (
      <section className={className} aria-labelledby={headingId}>
        <h2 id={headingId} className="section-title text-foreground">{t('O seu perfil', 'Your role')}</h2>
        <p className="field-note mt-1">{t('Escolha como utiliza a CRITERIA. As suas publicações continuam disponíveis aqui.', 'Choose how you use CRITERIA. Your existing posts remain available here.')}</p>
        <div className="mt-4 divide-y divide-border border-y border-border" role="group" aria-label={t('Tipo de conta', 'Account role')}>
          {([
            ['buyer', t('Comprador', 'Buyer'), t('Consultar imóveis e publicar critérios', 'Browse properties and publish criteria')],
            ['seller', t('Vendedor', 'Seller'), t('Consultar critérios e publicar imóveis', 'Browse criteria and publish properties')],
            ['both', t('Ambos', 'Both'), t('Comprar e vender com uma só conta', 'Buy and sell with one account')],
          ] as const).map(([value, label, description]) => (
            <button key={value} type="button" onClick={() => { setChosenRole(value); setRoleError(null); setRoleSaved(false) }} aria-pressed={selectedRole === value}
              className={cn('relative flex min-h-[76px] w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selectedRole === value ? 'bg-primary-100' : 'hover:bg-overlay')}>
              <span className="min-w-0"><span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span></span>
              {selectedRole === value && <Check size={18} aria-hidden="true" className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => { void handleSaveRole() }} disabled={selectedRole === currentRole || roleSaving} className="min-h-11">
            {roleSaving && <Loader2 className="animate-spin" aria-hidden="true" />}{t('Guardar perfil', 'Save role')}
          </Button>
          {roleSaved && <p role="status" className="text-sm text-primary">{t('Perfil atualizado.', 'Role updated.')}</p>}
          {roleError && <p role="alert" className="text-sm text-destructive">{roleError}</p>}
        </div>
      </section>
    )
  }

  return (
    <div className="workspace-content px-5 pb-14 pt-8 md:px-8 md:pt-12 lg:px-10">
      <div className="mb-5 flex items-center justify-between gap-3 md:mb-8">
        <div><h1 className="screen-heading text-foreground">{t('Perfil', 'Profile')}</h1><p className="screen-intro mt-1">{t('A sua conta e publicações.', 'Your account and posts.')}</p></div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/settings"><Settings2 aria-hidden="true" />{t('Definições', 'Settings')}</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(270px,340px)_minmax(0,1fr)] lg:items-start lg:gap-x-10 xl:gap-x-14">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="border-y border-border py-5">
            <div className="flex min-w-0 items-center gap-4">
              <MemberAvatar member={me} className="h-16 w-16 shrink-0 text-xl md:h-[72px] md:w-[72px]" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{me.fullName ?? t('Utilizador sem nome', 'Unnamed user')}</h2>
                {me.email && <p className="mt-0.5 truncate text-sm text-muted-foreground" title={me.email}>{me.email}</p>}
                <span
                  className={cn(
                    'mt-2 inline-flex rounded-sm px-2.5 py-1 text-xs font-semibold',
                    roleBadgeClass,
                  )}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
          {roleControls('role-heading-desktop', 'mt-7 hidden border-t border-border pt-7 lg:block')}
        </div>

        <section className="mt-7 min-w-0 lg:col-start-2 lg:row-start-1 lg:mt-0" aria-label={t('As suas publicações', 'Your posts')}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title text-foreground">{t('As suas publicações', 'Your posts')}</h2>
            {(canCreateProperty || canCreateCriteria) && <Link to="/create" state={{ returnTo: '/profile' }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Plus size={16} aria-hidden="true" />{t('Nova publicação', 'New post')}</Link>}
          </div>
          <div className="mt-3 flex w-full border-b border-border" role="group" aria-label={t('Tipo de publicação', 'Post type')}>
            <ProfileTabBtn
              active={activeTab === 'listings'}
              label={t('Os meus imóveis', 'My listings')}
              onClick={() => setTab('listings')}
            />
            <ProfileTabBtn
              active={activeTab === 'criteria'}
              label={t('Critérios', 'Criteria')}
              onClick={() => setTab('criteria')}
            />
          </div>

        <div className="mt-5">
          {activeTab === 'listings' ? <MyListings canRepublish={canCreateProperty} /> : <MyCriteria canRepublish={canCreateCriteria} />}
        </div>
        </section>
        {roleControls('role-heading-mobile', 'mt-9 border-t border-border pt-7 lg:hidden')}
      </div>
    </div>
  )
}

function ProfileTabBtn({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-11 flex-1 border-b-2 px-4 text-sm font-semibold transition-colors sm:flex-none',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

function MyListings({ canRepublish }: { canRepublish: boolean }) {
  const { data, loading, error, refetch } = useQuery<{ mySellerPosts: PropertyCardData[] }>(GET_MY_SELLER_POSTS, {
    fetchPolicy: 'cache-and-network',
  })
  const [reactivate] = useMutation(REACTIVATE_SELLER_POST)
  if (loading && !data) return <ProfileLoading />
  if (error) return <ProfileError onRetry={() => { void refetch() }} />
  const items = data?.mySellerPosts ?? []
  return (
    <PostCollection items={items} kind="listing" canRepublish={canRepublish}
      editPath={id => `/listing/${id}/edit`} renderCard={item => <PropertyCard property={item} />}
      onReactivate={async id => { await reactivate({ variables: { id } }); await refetch() }} />
  )
}

function MyCriteria({ canRepublish }: { canRepublish: boolean }) {
  const { data, loading, error, refetch } = useQuery<{ myBuyerPosts: CriteriaCardData[] }>(GET_MY_BUYER_POSTS, {
    fetchPolicy: 'cache-and-network',
  })
  const [reactivate] = useMutation(REACTIVATE_BUYER_POST)
  if (loading && !data) return <ProfileLoading />
  if (error) return <ProfileError onRetry={() => { void refetch() }} />
  const items = data?.myBuyerPosts ?? []
  return (
    <PostCollection items={items} kind="criteria" canRepublish={canRepublish}
      editPath={id => `/criteria/${id}/edit`} renderCard={item => <CriteriaCard criteria={item} />}
      onReactivate={async id => { await reactivate({ variables: { id } }); await refetch() }} />
  )
}

function PostCollection<T extends { id: string; isActive: boolean }>({ items, kind, canRepublish, editPath, renderCard, onReactivate }: {
  items: T[]
  kind: 'listing' | 'criteria'
  canRepublish: boolean
  editPath: (id: string) => string
  renderCard: (item: T) => ReactNode
  onReactivate: (id: string) => Promise<void>
}) {
  const { language, t } = useLanguage()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const active = items.filter(item => item.isActive)
  const archived = items.filter(item => !item.isActive)

  async function republish(id: string) {
    setActionError(null)
    setBusyId(id)
    try {
      await onReactivate(id)
    } catch (error) {
      setActionError(localizedError(error, language, 'Não foi possível republicar. Tente novamente.', 'Could not republish. Try again.'))
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) return <ProfileEmpty body={kind === 'listing' ? t('Ainda não publicou imóveis.', 'You have no listings yet.') : t('Ainda não publicou critérios.', 'You have no criteria yet.')} create={canRepublish} />

  function cards(posts: T[]) {
    const single = posts.length === 1
    return <div className={cn('result-card-grid mt-4 [&_.criteria-card]:!h-auto [&_.listing-card]:!h-auto', single && 'lg:!grid-cols-1')}>
      {posts.map(item => <div key={item.id} className={cn(
        'flex min-w-0 flex-col',
        single && kind === 'listing' && 'lg:[&_.listing-card]:!flex-row lg:[&_.listing-card>div:first-child]:!aspect-auto lg:[&_.listing-card>div:first-child]:!min-h-[280px] lg:[&_.listing-card>div:first-child]:!w-[42%] lg:[&_.listing-card>div:first-child]:!shrink-0',
      )}>
        {renderCard(item)}
        <div className="mt-3 flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 px-1">
          <Link to={editPath(item.id)} state={{ returnTo: '/profile' }} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{kind === 'listing' ? t('Editar imóvel', 'Edit listing') : t('Editar critério', 'Edit criteria')}</Link>
          {!item.isActive && canRepublish && <Button variant="outline" size="sm" className="ml-auto min-h-11" disabled={busyId === item.id} onClick={() => { void republish(item.id) }}>
            {busyId === item.id && <Loader2 className="animate-spin" aria-hidden="true" />}{t('Republicar', 'Republish')}
          </Button>}
          {!item.isActive && !canRepublish && <span className="ml-auto text-xs text-muted-foreground">{t('Altere o perfil para republicar', 'Change role to republish')}</span>}
        </div>
      </div>)}
    </div>
  }

  return <div className="space-y-8">
    {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
    <section>
      <h3 className="text-lg font-semibold text-foreground">{t('Ativos', 'Active')} <span className="text-sm font-normal text-muted-foreground">({active.length})</span></h3>
      {active.length ? cards(active) : <ProfileEmpty body={kind === 'listing' ? t('Não há imóveis ativos.', 'No active listings.') : t('Não há critérios ativos.', 'No active criteria.')} />}
    </section>
    {archived.length > 0 && <section>
      <h3 className="text-lg font-semibold text-foreground">{t('Arquivados', 'Archived')} <span className="text-sm font-normal text-muted-foreground">({archived.length})</span></h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('As publicações arquivadas não aparecem nos resultados. Pode editá-las ou republicá-las.', 'Archived posts are hidden from search results. You can edit or republish them.')}</p>
      {cards(archived)}
    </section>}
  </div>
}

function ProfileLoading() {
  const { t } = useLanguage()
  return (
    <div role="status" aria-label={t('A carregar as suas publicações', 'Loading your posts')} className="result-card-grid mt-4">
      <span className="sr-only">{t('A carregar as suas publicações…', 'Loading your posts…')}</span>
      {[0, 1, 2].map(index => <ResultCardSkeleton key={index} />)}
    </div>
  )
}

function ProfilePageSkeleton() {
  const { t } = useLanguage()
  return <div role="status" aria-label={t('A carregar perfil', 'Loading profile')} className="workspace-content w-full px-5 py-7 md:px-8 lg:px-10 lg:py-10">
    <span className="sr-only">{t('A carregar perfil…', 'Loading profile…')}</span>
    <Skeleton className="mb-7 h-10 w-56" />
    <div className="grid gap-8 lg:grid-cols-[minmax(270px,350px)_minmax(0,1fr)]">
      <div className="space-y-6"><Skeleton className="h-56 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>
      <div className="space-y-5"><Skeleton className="h-8 w-40" /><div className="result-card-grid"><ResultCardSkeleton /><ResultCardSkeleton /></div></div>
    </div>
  </div>
}

function ProfileError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage()
  return <div className="rounded-lg border border-destructive/30 bg-surface p-5"><p className="text-sm text-destructive">{t('Não foi possível carregar as suas publicações.', 'Couldn’t load your posts.')}</p><Button variant="outline" className="mt-3 min-h-11" onClick={onRetry}>{t('Tentar novamente', 'Try again')}</Button></div>
}

function ProfileEmpty({ body, create = false }: { body: string; create?: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-lg border border-border bg-surface px-5 py-6">
      <p className="text-sm text-muted-foreground">{body}</p>
      {create && <Link to="/create" state={{ returnTo: '/profile' }} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{t('Criar publicação', 'Create a post')} <ArrowUpRight size={16} aria-hidden="true" /></Link>}
    </div>
  )
}

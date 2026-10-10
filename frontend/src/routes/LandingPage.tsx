import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ChevronDown, MessageCircle, Plus, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useMe'
import { warmUpBackend } from '@/lib/warmup'
import { PORTUGAL_DISTRICTS } from '@/lib/portugalLocations'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { BottomNav } from '@/components/layout/BottomNav'
import { HomeSearch } from '@/components/search/HomeSearch'
import { LandingFAQ } from '@/components/LandingFAQ'
import { SiteFooter } from '@/components/SiteFooter'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/lib/language'
import './landing.css'

type PlaceSelection = {
  type: 'district' | 'municipality'
  name: string
  district?: string
}

const areas = [...PORTUGAL_DISTRICTS, 'Açores', 'Madeira']
const firstPlaces = ['Lisboa', 'Porto', 'Setúbal', 'Braga', 'Faro', 'Madeira']
const morePlaces = areas.filter(area => !firstPlaces.includes(area))

function resultsPath(query: string, place?: PlaceSelection): string {
  const params = new URLSearchParams()
  if (place?.type === 'district') params.set('district', place.name)
  else if (place?.type === 'municipality') {
    params.set('municipality', place.name)
    if (place.district) params.set('district', place.district)
  } else if (query.trim()) params.set('q', query.trim())
  const search = params.toString()
  return `/feed${search ? `?${search}` : ''}`
}

export default function LandingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [homeParams, setHomeParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { me, canViewCriteria, canCreateCriteria } = useMe()
  const { t } = useLanguage()
  const searchMode = homeParams.get('mode') === 'requests' ? 'requests' : 'properties'

  useEffect(() => { warmUpBackend() }, [])
  useEffect(() => {
    if (location.hash !== '#faq') return
    const frame = requestAnimationFrame(() => document.getElementById('faq')?.scrollIntoView())
    return () => cancelAnimationFrame(frame)
  }, [location.hash])

  const criteriaAccess = !isAuthenticated
    ? t('Inicie sessão com uma conta de vendedor para consultar critérios.', 'Sign in with a seller account to browse criteria.')
    : !me
      ? t('Os critérios estão disponíveis para vendedores e contas com ambos os perfis.', 'Criteria are available to sellers and members with both roles.')
      : canViewCriteria
        ? t('Consulte critérios publicados por compradores em Portugal.', 'Browse criteria published by buyers across Portugal.')
        : t('Adicione o perfil de vendedor na sua conta para consultar critérios.', 'Add the seller role in your profile to browse criteria.')

  const chooseMode = (mode: 'properties' | 'requests') => {
    setHomeParams(previous => {
      const next = new URLSearchParams(previous)
      if (mode === 'requests') next.set('mode', 'requests')
      else next.delete('mode')
      return next
    }, { replace: true })
  }

  const search = (query: string, place?: PlaceSelection) => {
    const destination = searchMode === 'requests'
      ? query.trim() ? `/requests?q=${encodeURIComponent(query.trim())}` : '/requests'
      : resultsPath(query, place)
    navigate(destination, { state: { resetScroll: true } })
  }

  const placePath = (area: string) => searchMode === 'requests'
    ? `/requests?q=${encodeURIComponent(area)}`
    : `/feed?district=${encodeURIComponent(area)}`

  return (
    <div className={isAuthenticated ? 'home-authenticated pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0' : undefined}>
      <header className="border-b border-border bg-surface pt-safe">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-7 lg:px-12 xl:px-20">
          <Brand />
          <div className="flex items-center gap-4">
            <Link to="/#faq" className="hidden min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline md:inline-flex">{t('Como funciona', 'How it works')}</Link>
            <LanguageSwitcher variant="light" />
            <HeaderActions authenticated={isAuthenticated} />
          </div>
        </div>
      </header>

      <main>
        <section aria-labelledby="home-heading" className="home-feature">
          <div className="home-photo" aria-hidden="true">
            <img src="/landing-home.jpg" alt="" width="1536" height="1024" loading="eager" fetchPriority="high" decoding="async" />
          </div>
          <div className="home-feature-content">
            <div className="home-search-panel">
              <h1 id="home-heading">{searchMode === 'properties' ? t('Encontre um imóvel', 'Find a property') : t('Encontre um comprador', 'Find a buyer')}</h1>
              <div role="group" aria-label={t('Escolha o que procura', 'Choose what to search')} className="home-mode-switch">
                <button type="button" aria-pressed={searchMode === 'properties'} onClick={() => chooseMode('properties')}>{t('Imóveis', 'Properties')}</button>
                <button type="button" aria-pressed={searchMode === 'requests'} onClick={() => chooseMode('requests')}>{t('Critérios', 'Criteria')}</button>
              </div>
              <HomeSearch mode={searchMode} onSearch={search} className="home-search-form" />
              <p className="home-search-note">{searchMode === 'requests' ? criteriaAccess : t('Pesquise por distrito, concelho ou palavra-chave. Não precisa de conta.', 'Search any district, municipality or keyword. No account needed.')}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="locations-heading" className="home-places hidden md:block">
          <div className="mx-auto max-w-[1400px]">
            <h2 id="locations-heading">{t('Comece por uma localização', 'Start with a place')}</h2>
            <div className="home-place-grid">
              {firstPlaces.map(area => (
                <PlaceLink key={area} area={area} mode={searchMode} path={placePath(area)} />
              ))}
            </div>
            <details className="home-more-places">
              <summary>{t('Mais distritos e regiões', 'More districts and regions')} <ChevronDown className="h-5 w-5 shrink-0" aria-hidden="true" /></summary>
              <div className="home-more-grid">
                {morePlaces.map(area => (
                  <PlaceLink key={area} area={area} mode={searchMode} path={placePath(area)} />
                ))}
              </div>
            </details>
          </div>
        </section>

        <section className="home-criteria-invite hidden md:block" aria-labelledby="post-criteria-heading">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="max-w-[55ch]">
              <h2 id="post-criteria-heading">{t('Diga aos vendedores o que procura.', "Tell sellers what you're looking for.")}</h2>
              <p>{t('Publique os seus critérios, incluindo a localização e o orçamento, para que os vendedores o possam contactar.', 'Publish your criteria, including location and budget, so sellers can reach you.')}</p>
            </div>
            {me && !canCreateCriteria ? (
              <Link to="/profile" className="home-invite-link">{t('Adicionar perfil de comprador', 'Add buyer role')} <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link>
            ) : (
              <Link to="/create?type=criteria" className="home-invite-link">{t('Publicar critérios', 'Post criteria')} <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link>
            )}
          </div>
        </section>

        <div className="hidden md:block"><LandingFAQ /></div>
      </main>
      <div className="hidden md:block"><SiteFooter /></div>
      {isAuthenticated && <BottomNav />}
    </div>
  )
}

function PlaceLink({ area, mode, path }: { area: string, mode: 'properties' | 'requests', path: string }) {
  const { t } = useLanguage()
  return (
    <Link to={path} state={{ resetScroll: true }} aria-label={`${mode === 'requests' ? t('Critérios', 'Criteria') : t('Imóveis', 'Properties')} ${t('em', 'in')} ${area}`} className="home-place-link">
      <span>{area}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  )
}

function HeaderActions({ authenticated }: { authenticated: boolean }) {
  const { t } = useLanguage()
  if (authenticated) return <AuthenticatedActions />
  return (
    <div className="flex items-center gap-3">
      <Link to="/sign-in" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-primary">{t('Entrar', 'Log in')}</Link>
      <Link to="/sign-up" className="inline-flex min-h-11 items-center rounded bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-700 sm:px-4"><span className="sm:hidden">{t('Registar', 'Join')}</span><span className="hidden sm:inline">{t('Criar conta', 'Join CRITERIA')}</span></Link>
    </div>
  )
}

function AuthenticatedActions() {
  const { me } = useMe()
  const { t } = useLanguage()
  return (
    <nav aria-label={t('Navegação da conta', 'Account navigation')} className="flex items-center gap-1">
      <Link to="/create" className="hidden h-11 w-11 items-center justify-center rounded text-sm font-semibold text-primary hover:bg-primary/10 md:inline-flex xl:w-auto xl:gap-2 xl:px-3"><Plus className="h-4 w-4" aria-hidden="true" /><span className="sr-only xl:not-sr-only">{t('Criar', 'Create')}</span></Link>
      <Link to="/inbox" className="hidden h-11 w-11 items-center justify-center rounded text-sm font-semibold text-primary hover:bg-primary/10 md:inline-flex xl:w-auto xl:gap-2 xl:px-3"><MessageCircle className="h-4 w-4" aria-hidden="true" /><span className="sr-only xl:not-sr-only">{t('Mensagens', 'Inbox')}</span></Link>
      <Link to="/profile" aria-label={me?.fullName ? t(`Abrir perfil de ${me.fullName}`, `Open ${me.fullName}'s profile`) : t('Abrir perfil', 'Open profile')} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-primary/10">
        {me ? <MemberAvatar member={me} className="h-9 w-9 border border-border" /> : <UserRound className="h-5 w-5" aria-hidden="true" />}
      </Link>
    </nav>
  )
}

function Brand() {
  const { t } = useLanguage()
  return (
    <Link to="/" aria-label={t('Início da CRITERIA', 'CRITERIA home')} className="inline-flex min-h-11 items-center gap-2.5 rounded text-sm font-semibold tracking-[.14em] text-foreground">
      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-accent">
        <img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" />
      </span>
      CRITERIA
    </Link>
  )
}

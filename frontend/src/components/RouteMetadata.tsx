import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '@/lib/language'

const SITE_URL = 'https://criteria-app.com'
const PREVIEW_IMAGE = `${SITE_URL}/social-preview.png`

type Metadata = {
  title: string
  description: string
  canonical?: string
  indexable?: boolean
}

type Translate = (portuguese: string, english: string) => string

function getMetadata(pathname: string, t: Translate): Metadata {
  const publicPages: Record<string, Metadata> = {
    '/': {
      title: t('CRITERIA | Encontre casa. Encontre comprador.', 'CRITERIA | Find a home. Find your buyer.'),
      description: t('Pesquise imóveis em Portugal por distrito, concelho ou palavra-chave. Os vendedores podem descobrir critérios e os compradores podem publicar o que procuram.', 'Search properties across Portugal by district, concelho, or keyword. Sellers can also discover criteria, and buyers can publish what they need.'),
      canonical: `${SITE_URL}/`,
      indexable: true,
    },
    '/privacy': {
      title: t('Política de Privacidade | CRITERIA', 'Privacy policy | CRITERIA'),
      description: t('Saiba como a CRITERIA trata os dados de conta, armazenamento no navegador, publicações e serviços externos.', 'Read how CRITERIA handles account information, browser storage, property posts, and external services.'),
      canonical: `${SITE_URL}/privacy`,
    },
    '/terms': {
      title: t('Termos e Condições | CRITERIA', 'Terms and conditions | CRITERIA'),
      description: t('Leia os termos de utilização da CRITERIA para publicar imóveis e critérios.', 'Read the terms for using CRITERIA to publish property listings and criteria.'),
      canonical: `${SITE_URL}/terms`,
    },
  }
  const privateTitles: Record<string, string> = {
    '/sign-in': t('Entrar', 'Sign in'),
    '/sign-up': t('Criar conta', 'Create an account'),
    '/forgot-password': t('Recuperar palavra-passe', 'Reset your password'),
    '/reset-password': t('Escolher nova palavra-passe', 'Choose a new password'),
    '/onboarding': t('Completar perfil', 'Complete your profile'),
    '/feed': t('Resultados de imóveis', 'Property results'),
    '/requests': t('Critérios', 'Criteria'),
    '/create': t('Criar publicação', 'Create a post'),
    '/profile': t('O seu perfil', 'Your profile'),
    '/settings': t('Definições', 'Settings'),
    '/inbox': t('Mensagens', 'Inbox'),
  }
  const path = pathname.replace(/\/+$/, '') || '/'
  if (publicPages[path]) return publicPages[path]

  const section = path.split('/')[1]
  const title = privateTitles[path]
    ?? (section === 'listing' ? t('Anúncio de imóvel', 'Property listing')
      : section === 'criteria' ? t('Critérios', 'Criteria')
        : section === 'inbox' ? t('Mensagens', 'Inbox')
          : section === 'settings' ? t('Definições da conta', 'Account settings')
            : section === 'auth' ? t('A iniciar sessão', 'Signing in')
              : t('Página não encontrada', 'Page not found'))
  return {
    title: `${title} | CRITERIA`,
    description: t('A CRITERIA é uma plataforma de anúncios de imóveis e critérios de compradores.', 'CRITERIA is a marketplace for property listings and buyer criteria.'),
  }
}

function setMeta(key: 'name' | 'property', value: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, value)
    document.head.append(element)
  }
  element.content = content
}

/** Keeps browser metadata current as the SPA navigates; private routes are noindex. */
export function RouteMetadata() {
  const { pathname } = useLocation()
  const { t } = useLanguage()

  useEffect(() => {
    const page = getMetadata(pathname, t)
    document.title = page.title
    setMeta('name', 'description', page.description)
    setMeta('name', 'robots', page.indexable ? 'index,follow' : 'noindex')
    setMeta('property', 'og:title', page.title)
    setMeta('property', 'og:description', page.description)
    setMeta('property', 'og:url', page.canonical ?? `${SITE_URL}${pathname}`)
    setMeta('property', 'og:image', PREVIEW_IMAGE)
    setMeta('property', 'og:image:alt', t('Cartão da CRITERIA: Encontre casa. Encontre comprador. Imóveis e critérios de compradores, num só lugar.', 'CRITERIA graphic reading “Encontre casa. Encontre comprador. Imóveis e critérios de compradores, num só lugar.”'))
    setMeta('name', 'twitter:title', page.title)
    setMeta('name', 'twitter:description', page.description)
    setMeta('name', 'twitter:image', PREVIEW_IMAGE)
    setMeta('name', 'twitter:image:alt', t('Cartão da CRITERIA: Encontre casa. Encontre comprador. Imóveis e critérios de compradores, num só lugar.', 'CRITERIA graphic reading “Encontre casa. Encontre comprador. Imóveis e critérios de compradores, num só lugar.”'))

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (page.canonical) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.append(canonical)
      }
      canonical.href = page.canonical
    } else {
      canonical?.remove()
    }
  }, [pathname, t])

  return null
}

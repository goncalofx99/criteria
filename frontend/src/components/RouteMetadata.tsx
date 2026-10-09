import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://criteria-app.com'
const PREVIEW_IMAGE = `${SITE_URL}/social-preview.png`

type Metadata = {
  title: string
  description: string
  canonical?: string
  indexable?: boolean
}

const publicPages: Record<string, Metadata> = {
  '/': {
    title: 'CRITERIA | Find a home. Find your buyer.',
    description: 'CRITERIA connects property sellers and buyers through listings and buyer requests. Create an account to explore, publish, and start a conversation.',
    canonical: `${SITE_URL}/`,
    indexable: true,
  },
  '/privacy': {
    title: 'Privacy policy | CRITERIA',
    description: 'Read how CRITERIA handles account information, browser storage, property posts, and external services.',
    canonical: `${SITE_URL}/privacy`,
  },
  '/terms': {
    title: 'Terms and conditions | CRITERIA',
    description: 'Read the terms for using CRITERIA to publish property listings and buyer requests.',
    canonical: `${SITE_URL}/terms`,
  },
}

const privateTitles: Record<string, string> = {
  '/sign-in': 'Sign in',
  '/sign-up': 'Create an account',
  '/forgot-password': 'Reset your password',
  '/reset-password': 'Choose a new password',
  '/onboarding': 'Complete your profile',
  '/feed': 'Explore',
  '/create': 'Create a post',
  '/profile': 'Your profile',
  '/settings': 'Settings',
  '/inbox': 'Inbox',
}

function getMetadata(pathname: string): Metadata {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (publicPages[path]) return publicPages[path]

  const section = path.split('/')[1]
  const title = privateTitles[path]
    ?? (section === 'listing' ? 'Property listing'
      : section === 'criteria' ? 'Buyer request'
        : section === 'inbox' ? 'Inbox'
          : section === 'settings' ? 'Account settings'
            : section === 'auth' ? 'Signing in'
              : 'Page not found')
  return {
    title: `${title} | CRITERIA`,
    description: 'CRITERIA is a marketplace for property listings and buyer requests.',
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

  useEffect(() => {
    const page = getMetadata(pathname)
    document.title = page.title
    setMeta('name', 'description', page.description)
    setMeta('name', 'robots', page.indexable ? 'index,follow' : 'noindex')
    setMeta('property', 'og:title', page.title)
    setMeta('property', 'og:description', page.description)
    setMeta('property', 'og:url', page.canonical ?? `${SITE_URL}${pathname}`)
    setMeta('property', 'og:image', PREVIEW_IMAGE)
    setMeta('name', 'twitter:title', page.title)
    setMeta('name', 'twitter:description', page.description)
    setMeta('name', 'twitter:image', PREVIEW_IMAGE)

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
  }, [pathname])

  return null
}

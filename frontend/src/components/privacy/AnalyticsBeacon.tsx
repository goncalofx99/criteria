import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { reviewMode } from '@/review/mode'
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  CLOUDFLARE_WEB_ANALYTICS_TOKEN,
  getAnalyticsConsent,
  isAnalyticsSafePath,
  webAnalyticsAvailable,
} from '@/lib/analytics'

const SCRIPT_ID = 'criteria-cloudflare-analytics'
const SCRIPT_URL = 'https://static.cloudflareinsights.com/beacon.min.js'

/** The beacon is never requested until explicit, recorded browser opt-in. */
export function AnalyticsBeacon() {
  useEffect(() => {
    if (!webAnalyticsAvailable(window.location.hostname, import.meta.env.PROD, Capacitor.isNativePlatform(), reviewMode)) return

    function syncChoice() {
      if (getAnalyticsConsent() === 'granted') {
        // Single-use auth tokens are carried in these routes' query strings.
        // Do not load a third-party script on the token landing pages.
        if (!isAnalyticsSafePath(window.location.pathname)) return
        if (document.getElementById(SCRIPT_ID)) return
        const script = document.createElement('script')
        script.id = SCRIPT_ID
        script.type = 'module'
        script.src = SCRIPT_URL
        script.referrerPolicy = 'origin'
        // The site's auth and account flows are SPA routes. Disable automatic
        // soft-navigation measurement; initial loads still measure page speed.
        script.dataset.cfBeacon = JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN, spa: false })
        document.head.appendChild(script)
      } else if (document.getElementById(SCRIPT_ID)) {
        // The downloaded beacon may retain History/visibility listeners. A
        // reload is needed to stop it reliably after consent is withdrawn.
        window.location.reload()
      }
    }

    function onStorage(event: StorageEvent) {
      if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) syncChoice()
    }

    syncChoice()
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncChoice)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncChoice)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return null
}

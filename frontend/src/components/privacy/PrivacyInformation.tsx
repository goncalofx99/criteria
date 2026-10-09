import { useId } from 'react'
import { Capacitor } from '@capacitor/core'
import { reviewMode } from '@/review/mode'
import { getAnalyticsConsent, webAnalyticsAvailable } from '@/lib/analytics'

export function PrivacyInformation() {
  const id = useId()
  const native = Capacitor.isNativePlatform()
  const analyticsAvailable = typeof window !== 'undefined' && webAnalyticsAvailable(window.location.hostname, import.meta.env.PROD, native, reviewMode)
  const analyticsAllowed = analyticsAvailable && getAnalyticsConsent() === 'granted'
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      <section aria-labelledby={`${id}-storage-heading`}>
        <h2 id={`${id}-storage-heading`} className="mb-2 text-base font-semibold text-foreground">Stored on your device</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Sign-in:</strong> access and refresh tokens are kept in local storage so you can stay signed in. Signing out removes them from {native ? 'this app' : 'this browser'}.</li>
          <li><strong className="text-foreground">Appearance:</strong> your light, dark, or system choice is kept in local storage until you change it or clear site data.</li>
          <li><strong className="text-foreground">Navigation:</strong> session storage remembers where to return after sign-in and your Explore scroll position for this session.</li>
          {!native && <li><strong className="text-foreground">This notice:</strong> local storage remembers that you have seen it, so it does not appear on every visit.</li>}
        </ul>
      </section>

      <section aria-labelledby={`${id}-external-heading`}>
        <h2 id={`${id}-external-heading`} className="mb-2 text-base font-semibold text-foreground">External services in specific features</h2>
        <p>
          When a map appears, its tiles load from the configured map provider (OpenStreetMap by default). Pressing Find or Enter for an address sends that search text to OpenStreetMap Nominatim. These services receive normal request information, such as your IP address. See the{' '}
          <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">OpenStreetMap privacy policy</a>.
        </p>
        <p className="mt-2">Choosing Google sign-in takes you through Google’s sign-in service. A Google profile photo or an older listing photo hosted outside CRITERIA may also be requested from its image host when shown. CRITERIA serves its interface fonts itself.</p>
      </section>

      <section aria-labelledby={`${id}-control-heading`}>
        <h2 id={`${id}-control-heading`} className="mb-2 text-base font-semibold text-foreground">Your controls</h2>
        {analyticsAvailable ? <p>You have {analyticsAllowed ? 'allowed' : 'not allowed'} optional Cloudflare Web Analytics in this browser. When allowed, its beacon measures page views and load performance. <a href="https://developers.cloudflare.com/web-analytics/about/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">Cloudflare describes its Web Analytics</a> as cookie-free and says it does not use visitors’ personal data or log query strings. You can change or withdraw your choice from Settings; withdrawal reloads the page to stop the beacon.</p> : <p>Optional analytics is not configured for this site or app. CRITERIA’s application code does not load advertising scripts.</p>}
        <p className="mt-2">You can change your theme in Settings and sign out to remove session tokens. {native ? 'Your device’s app-data controls can remove saved preferences.' : 'Clearing this site’s data in your browser removes saved preferences.'}</p>
        <p className="mt-2">For questions about your data, or to request access, correction, or deletion, contact <a href="mailto:criteriaappportugal@gmail.com" className="font-semibold text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a>.</p>
      </section>
    </div>
  )
}

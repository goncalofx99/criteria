import { Link } from 'react-router-dom'
import { PrivacyInformation } from '@/components/privacy/PrivacyInformation'
import { LegalPageLayout, LegalSection } from '@/components/privacy/LegalPageLayout'
import { SiteFooter } from '@/components/SiteFooter'

function ContactLink() {
  return <a href="mailto:criteriaappportugal@gmail.com" className="font-semibold text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a>
}

export default function PrivacyPage() {
  return <>
    <LegalPageLayout current="privacy" eyebrow="Your information" title="Privacy Policy" introduction="What CRITERIA collects, why it is needed, who can see it, and how to ask us about it. This covers the website and the mobile app.">
      <LegalSection id="privacy-contact" title="Who is responsible">
        <p>Goncalo Félix is responsible for personal data processed by CRITERIA. For privacy questions or requests, write to <ContactLink />.</p>
      </LegalSection>

      <LegalSection id="privacy-data" title="Information we use">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Account details:</strong> your email address, name, optional profile photo, selected buyer or seller role, and the time you confirmed you are at least 18. For password accounts, we store a password hash, not the plain password. If you choose Google sign-in, we receive your Google account identifier, verified email address, name, and any profile photo Google makes available.</li>
          <li><strong className="text-foreground">Posts and location:</strong> property listings and buyer requests include the information, photos, preferences, prices, area labels and coordinates you supply. CRITERIA stores the coordinates used for matching. Other eligible members see an approximate area and rounded map position, but free-text descriptions and photos may still reveal a location you enter.</li>
          <li><strong className="text-foreground">Conversations:</strong> messages and the posts they relate to are stored so participants can read them in the app.</li>
          <li><strong className="text-foreground">Security and support:</strong> authentication sessions and one-time account links are used to secure your account. Our API temporarily counts requests by IP address to limit abuse. We also receive information you send when you contact us.</li>
          <li><strong className="text-foreground">Optional website analytics:</strong> if Cloudflare Web Analytics is configured and you allow it, its browser beacon measures initial page views, paths, referring sites, device/browser information, and load performance. Automatic tracking of in-app route changes is disabled, and the beacon does not load on single-use authentication or account-confirmation links. It does not run in the mobile app. Cloudflare says its Web Analytics does not log query strings.</li>
        </ul>
      </LegalSection>

      <LegalSection id="privacy-purpose" title="Why we use it">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead className="bg-accent text-foreground"><tr><th scope="col" className="px-4 py-3 font-semibold">Purpose</th><th scope="col" className="px-4 py-3 font-semibold">Basis</th></tr></thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3">Create and protect accounts; remember your sign-in; process account changes</td><td className="px-4 py-3">Provide the service you request</td></tr>
              <tr><td className="px-4 py-3">Publish posts, find possible matches, show maps, and deliver messages</td><td className="px-4 py-3">Provide the service you request</td></tr>
              <tr><td className="px-4 py-3">Limit abuse, investigate faults, and keep the service secure</td><td className="px-4 py-3">Our legitimate interest in operating a safe and reliable service</td></tr>
              <tr><td className="px-4 py-3">Respond to privacy requests and meet applicable legal duties</td><td className="px-4 py-3">Legal obligation where applicable</td></tr>
              <tr><td className="px-4 py-3">Optional Cloudflare website analytics, if configured and allowed</td><td className="px-4 py-3">Your opt-in choice; you can withdraw it from Settings</td></tr>
            </tbody>
          </table>
        </div>
        <p>The current app has no in-app advertising feature. No automated decision in the app decides whether you can buy or rent a property: matching shows possible overlaps for people to assess.</p>
      </LegalSection>

      <LegalSection id="privacy-visibility" title="Who can see what you post">
        <p>Signed-in members can browse property listings. Buyer requests are visible to signed-in members with the seller or both role. Your name and photo can appear with your posts. The email address on your account is private to you. Only conversation participants can read their messages in the app.</p>
        <p>Other members may save or share information they see before you remove it. Do not put a precise street address, phone number, or other sensitive information in public post text or photos unless you intend to share it.</p>
      </LegalSection>

      <LegalSection id="privacy-providers" title="Services involved">
        <p>We use infrastructure and service providers to run the app: website and API hosting, a PostgreSQL database (currently Neon), image storage (Cloudflare R2), account email delivery (Resend, when configured), and Google if you choose Google sign-in. When you open a map, your browser requests tiles from the configured provider; the default is OpenStreetMap. When you press Find for an address, your browser sends the text to OpenStreetMap Nominatim. Those map requests include ordinary request information, such as your IP address.</p>
        <p>Images from older posts or Google profile photos may still load from their original image host. The app serves its interface fonts itself. If you opt in to optional browser analytics after it is configured, Cloudflare Web Analytics receives page-view and performance measurements. Provider processing locations and any international transfer safeguards depend on the live deployment and provider arrangements; ask us at <ContactLink /> for the current details.</p>
      </LegalSection>

      <LegalSection id="privacy-storage" title="Device storage and cookies">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-7"><PrivacyInformation /></div>
        <p>On the website, the notice explains necessary storage. If Cloudflare Web Analytics is configured, it also offers a separate optional choice. The beacon loads only after you select “Allow analytics”; selecting “Essential only” keeps it off. You can change your choice from Settings at any time. The mobile app does not load this browser beacon or show the website notice. CRITERIA does not load advertising scripts.</p>
      </LegalSection>

      <LegalSection id="privacy-retention" title="How long information remains">
        <p>Your account, active and archived posts, and conversations stay in the service while your account exists. Deactivating a post hides it from discovery but does not delete its record. Password-reset and account-action links expire after 30 minutes; the server removes expired link records on its maintenance schedule. Sign-in access tokens expire after 15 minutes, and refresh sessions are issued with a 30-day expiry.</p>
        <p>Settings offers account deletion. After you confirm using the email link, the app deletes your account, posts, conversations, and related database records, and queues removal of your uploaded photos. Photo cleanup may finish later if storage is temporarily unavailable. Copies held in backups and provider logs may have separate retention periods; contact us for the current operational details.</p>
      </LegalSection>

      <LegalSection id="privacy-rights" title="Your choices and rights">
        <p>You can edit your name, profile photo, and role in the app. Settings lets you request an email change, update a password, sign out, change your theme, and request account deletion. You can ask us to access, correct, erase, restrict, or export your personal data, or object where processing relies on legitimate interests. These rights depend on applicable law and the circumstances of your request. Write to <ContactLink />; we may need to verify that the account is yours.</p>
        <p>You can also complain to the <a href="https://www.cnpd.pt/cidadaos/participacoes/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">Portuguese Data Protection Authority (CNPD)</a> or another competent supervisory authority.</p>
      </LegalSection>

      <LegalSection id="privacy-children" title="Age requirement">
        <p>CRITERIA requires people creating an account to confirm that they are at least 18. If you believe someone under 18 has created an account, contact us so we can review it.</p>
      </LegalSection>

      <LegalSection id="privacy-changes" title="Changes to this policy">
        <p>We may update this page as the service or its providers change. The date at the top shows the latest revision. Material changes will be brought to users’ attention where appropriate. For the rules for using the service, read our <Link to="/terms" className="font-semibold text-primary underline underline-offset-2">Terms of Use</Link>.</p>
      </LegalSection>
    </LegalPageLayout>
    <SiteFooter />
  </>
}

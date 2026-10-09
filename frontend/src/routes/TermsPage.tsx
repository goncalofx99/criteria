import { Link } from 'react-router-dom'
import { LegalPageLayout, LegalSection } from '@/components/privacy/LegalPageLayout'
import { SiteFooter } from '@/components/SiteFooter'

export default function TermsPage() {
  return <>
    <LegalPageLayout current="terms" eyebrow="Using CRITERIA" title="Terms of Use" introduction="These terms explain how to use CRITERIA responsibly and what the service currently does. Please read them before creating an account or posting.">
      <LegalSection id="terms-operator" title="The service and its operator">
        <p>CRITERIA is operated by Goncalo Félix. Questions about these terms, a post, or use of the service can be sent to <a href="mailto:criteriaappportugal@gmail.com" className="font-semibold text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a>.</p>
        <p>CRITERIA lets members publish property listings or buyer requests, discover possible matches, and exchange messages. A match is an indication that entered criteria overlap; it is not a valuation, verification, offer, or guarantee of a transaction. A property sale or tenancy is arranged outside the app by the people involved.</p>
      </LegalSection>

      <LegalSection id="terms-account" title="Who can use an account">
        <p>You must be at least 18 to create an account. Provide accurate account details, keep your sign-in credentials private, and tell us if you suspect unauthorized access. You choose a buyer, seller, or both role; the features available to you depend on that role. A role does not verify a professional qualification or ownership of a property.</p>
        <p>Google sign-in is optional. If you use it, Google’s terms also apply to your relationship with Google. You can change account details and request account deletion in Settings.</p>
      </LegalSection>

      <LegalSection id="terms-posts" title="Listings, requests, and messages">
        <p>You are responsible for the information you submit, including the right to use any photo you upload. Keep prices, property details, availability, and requirements accurate and up to date. Deactivate a post when it is no longer relevant. Do not post another person’s private information, misleading or unlawful material, spam, or content that infringes someone else’s rights.</p>
        <p>Other members may see your name, profile photo, listing or buyer request according to the app’s role-based access rules. Messages are visible to the participants in that conversation. Avoid putting sensitive information, including a precise home address, in post text or photos if you do not want others to see it.</p>
        <p>You keep your rights in content you submit. To operate the features you ask for, you allow CRITERIA to store, display, resize, and transmit that content within the service while it remains available. This permission ends when the content is removed, subject to copies already received by others and the retention described in the <Link to="/privacy" className="font-semibold text-primary underline underline-offset-2">Privacy Policy</Link>.</p>
      </LegalSection>

      <LegalSection id="terms-decisions" title="Use your own judgment">
        <p>Information in posts comes from members. CRITERIA does not verify every post, identity, property right, price, or legal document. Check important facts independently before sharing money, signing an agreement, or visiting a property. Report suspected fraud or an unsafe post to <a href="mailto:criteriaappportugal@gmail.com" className="font-semibold text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a> with the post link and a short explanation.</p>
        <p>Do not use CRITERIA to harass, discriminate unlawfully, impersonate someone, interfere with the service, or send unsolicited promotions to other members. We may take appropriate action when a post or use of the service violates these terms or applicable law, subject to any rights users have under applicable law.</p>
      </LegalSection>

      <LegalSection id="terms-availability" title="Availability and changes">
        <p>We work to keep CRITERIA available and accurate, but maps, email delivery, connectivity, and other services can fail. Posts may also become unavailable when an owner deactivates them. If a feature fails, you can retry or contact us.</p>
        <p>The current app does not take payments for a property transaction or include a checkout. If paid CRITERIA features are introduced, their price and applicable conditions must be presented before you choose to buy them. We may update the app and these terms; the date at the top shows the latest revision. Material changes will be brought to users’ attention where appropriate.</p>
      </LegalSection>

      <LegalSection id="terms-privacy" title="Privacy and external services">
        <p>The <Link to="/privacy" className="font-semibold text-primary underline underline-offset-2">Privacy Policy</Link> explains the personal information CRITERIA uses, who can see posts and messages, device storage, optional browser analytics, account deletion, and external map, email, and sign-in services. External sites and services have their own terms and privacy information.</p>
      </LegalSection>
    </LegalPageLayout>
    <SiteFooter />
  </>
}

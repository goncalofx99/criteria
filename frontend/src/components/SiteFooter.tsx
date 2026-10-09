import { Link } from 'react-router-dom'

/** Public-site footer. Every destination is live; no invented address or social account. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="mx-auto grid w-full max-w-[1400px] gap-9 px-6 py-10 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-12 md:px-10 md:py-12">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold tracking-[.16em] text-foreground" aria-label="CRITERIA home">
            <img src="/icon-192.png" alt="" width="36" height="36" className="h-9 w-9 rounded-lg object-cover" />
            CRITERIA
          </Link>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">A place for property listings and buyer requests to meet.</p>
          <p className="mt-3 text-xs text-muted-foreground">Operated by Goncalo Félix.</p>
        </div>
        <nav aria-label="Explore CRITERIA" className="flex flex-col items-start gap-1 text-sm">
          <span className="pb-1 font-semibold">Explore</span>
          <Link to="/#faq" className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground hover:underline">Frequently asked questions</Link>
          <Link to="/sign-up" className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground hover:underline">Create an account</Link>
          <Link to="/sign-in" className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground hover:underline">Sign in</Link>
        </nav>
        <nav aria-label="Information and contact" className="flex flex-col items-start gap-1 text-sm">
          <span className="pb-1 font-semibold">Information</span>
          <Link to="/privacy" className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground hover:underline">Privacy policy</Link>
          <Link to="/terms" className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground hover:underline">Terms and conditions</Link>
          <a href="mailto:criteriaappportugal@gmail.com" className="inline-flex min-h-10 items-center break-all text-muted-foreground hover:text-foreground hover:underline">criteriaappportugal@gmail.com</a>
        </nav>
      </div>
    </footer>
  )
}

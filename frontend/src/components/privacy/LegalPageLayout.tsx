import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface LegalPageLayoutProps {
  title: string
  eyebrow: string
  introduction: string
  current: 'privacy' | 'terms'
  children: ReactNode
}

export function LegalPageLayout({ title, eyebrow, introduction, current, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft size={17} aria-hidden="true" /> Back to CRITERIA
          </Link>
          <Link to="/" aria-label="CRITERIA home" className="text-xs font-semibold tracking-[.16em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">CRITERIA</Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
        <nav aria-label="Breadcrumb" className="mb-7 text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li><Link to="/" className="underline underline-offset-2 hover:text-primary">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-foreground">{current === 'privacy' ? 'Privacy' : 'Terms'}</li>
          </ol>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
          <main id="main-content" className="min-w-0 max-w-[760px]">
            <p className="editorial-kicker">{eyebrow}</p>
            <h1 className="editorial-title mt-3">{title}</h1>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-muted-foreground">{introduction}</p>
            <p className="mt-3 text-xs text-muted-foreground">Last updated 9 October 2026.</p>
            <div className="mt-9 space-y-10 text-sm leading-7 text-muted-foreground md:space-y-12">{children}</div>
          </main>

          <aside className="surface-panel p-5 lg:sticky lg:top-8" aria-label="Information and contact">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Legal information</p>
            <nav aria-label="Legal pages" className="mt-4 flex flex-col gap-1 text-sm font-medium">
              <Link to="/privacy" aria-current={current === 'privacy' ? 'page' : undefined} className={`min-h-10 rounded-lg px-3 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current === 'privacy' ? 'bg-accent text-foreground' : 'text-primary'}`}>Privacy Policy</Link>
              <Link to="/terms" aria-current={current === 'terms' ? 'page' : undefined} className={`min-h-10 rounded-lg px-3 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current === 'terms' ? 'bg-accent text-foreground' : 'text-primary'}`}>Terms of Use</Link>
            </nav>
            <div className="mt-5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Questions or concerns?</p>
              <a href="mailto:criteriaappportugal@gmail.com" className="mt-2 block break-all font-medium text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6 border-t border-border pt-7">
    <h2 id={`${id}-heading`} className="mb-3 text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
}

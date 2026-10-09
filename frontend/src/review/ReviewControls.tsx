import { useState } from 'react'
import { getReviewRole, getReviewScenario, leaveReviewMode, reviewMode, setReviewSettings, type ReviewRole, type ReviewScenario } from './mode'

const destinations = [
  ['Explore', '/feed'], ['Create', '/create'], ['Inbox', '/inbox'], ['Profile', '/profile'], ['Settings', '/settings'],
  ['Listing · other', '/listing/review-listing-lisbon'], ['Listing · own', '/listing/review-listing-own'],
  ['Listing · archived', '/listing/review-listing-archived'], ['Edit listing', '/listing/review-listing-own/edit'],
  ['Request · other', '/criteria/review-request-lisbon'], ['Request · own', '/criteria/review-request-own'],
  ['Edit request', '/criteria/review-request-own/edit'], ['Onboarding', '/onboarding'],
  ['Sign in', '/sign-in'], ['Sign up', '/sign-up'], ['Landing', '/'],
] as const

export function ReviewControls() {
  const [role, setRole] = useState<ReviewRole>(getReviewRole)
  const [scenario, setScenario] = useState<ReviewScenario>(getReviewScenario)
  if (!reviewMode) return null

  function apply(nextRole: ReviewRole, nextScenario: ReviewScenario) {
    setReviewSettings(nextRole, nextScenario)
    window.location.reload()
  }

  return (
    <details className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-[60] text-slate-900 md:bottom-4 md:right-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-full border border-amber-400 bg-amber-100 px-3 text-xs font-bold shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
        Review
      </summary>
      <div className="absolute bottom-12 right-0 max-h-[70dvh] w-[min(340px,calc(100vw-24px))] space-y-3 overflow-auto rounded-2xl border border-amber-300 bg-white p-4 text-sm shadow-2xl">
        <p className="font-bold">Review mode · {role} · {scenario}</p>
        <p className="text-xs text-slate-600">Local fixtures only. Changes reset when this page reloads.</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block font-semibold">Role</span>
            <select value={role} onChange={e => { const value = e.target.value as ReviewRole; setRole(value); apply(value, scenario) }} className="w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="buyer">Buyer</option><option value="seller">Seller</option><option value="both">Both</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold">Scenario</span>
            <select value={scenario} onChange={e => { const value = e.target.value as ReviewScenario; setScenario(value); apply(role, value) }} className="w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="normal">Populated</option><option value="empty">Empty</option><option value="error">API error</option>
              <option value="slow">Slow</option><option value="onboarding">Incomplete onboarding</option><option value="signed-out">Signed out</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Review destinations">
          {destinations.map(([label, href]) => <a key={label} href={href} className="rounded-lg border border-slate-300 px-2 py-1.5 font-medium hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">{label}</a>)}
        </div>
        <div className="flex gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-slate-300 px-3 py-2 font-medium">Reset fixtures</button>
          <button type="button" onClick={leaveReviewMode} className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white">Exit review</button>
        </div>
      </div>
    </details>
  )
}

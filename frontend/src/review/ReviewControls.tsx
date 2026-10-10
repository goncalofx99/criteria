import { useState } from 'react'
import { useLanguage } from '@/lib/language'
import { getReviewRole, getReviewScenario, leaveReviewMode, reviewMode, setReviewSettings, type ReviewRole, type ReviewScenario } from './mode'

const destinations = [
  ['Resultados', 'Results', '/feed'], ['Critérios', 'Criteria', '/requests'], ['Criar', 'Create', '/create'], ['Mensagens', 'Inbox', '/inbox'], ['Perfil', 'Profile', '/profile'], ['Definições', 'Settings', '/settings'],
  ['Imóvel · outro', 'Listing · other', '/listing/review-listing-lisbon'], ['Imóvel · próprio', 'Listing · own', '/listing/review-listing-own'],
  ['Imóvel · arquivado', 'Listing · archived', '/listing/review-listing-archived'], ['Editar imóvel', 'Edit listing', '/listing/review-listing-own/edit'],
  ['Critérios · outros', 'Criteria · other', '/criteria/review-request-lisbon'], ['Critérios · próprios', 'Criteria · own', '/criteria/review-request-own'],
  ['Editar critérios', 'Edit criteria', '/criteria/review-request-own/edit'], ['Integração', 'Onboarding', '/onboarding'],
  ['Iniciar sessão', 'Sign in', '/sign-in'], ['Criar conta', 'Sign up', '/sign-up'], ['Início', 'Home', '/'],
] as const

export function ReviewControls() {
  const { t } = useLanguage()
  const [role, setRole] = useState<ReviewRole>(getReviewRole)
  const [scenario, setScenario] = useState<ReviewScenario>(getReviewScenario)
  if (!reviewMode) return null

  const roleLabel = role === 'buyer' ? t('Comprador', 'Buyer') : role === 'seller' ? t('Vendedor', 'Seller') : t('Ambos', 'Both')
  const scenarioLabel = scenario === 'normal' ? t('Com conteúdo', 'Populated')
    : scenario === 'empty' ? t('Vazio', 'Empty')
      : scenario === 'error' ? t('Erro de API', 'API error')
        : scenario === 'slow' ? t('Lento', 'Slow')
          : scenario === 'onboarding' ? t('Integração incompleta', 'Incomplete onboarding')
            : t('Sessão terminada', 'Signed out')

  function apply(nextRole: ReviewRole, nextScenario: ReviewScenario) {
    setReviewSettings(nextRole, nextScenario)
    window.location.reload()
  }

  return (
    <details className="review-controls fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-[60] text-slate-900 md:bottom-4 md:right-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-full border border-amber-400 bg-amber-100 px-3 text-xs font-bold shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
        {t('Revisão', 'Review')}
      </summary>
      <div className="absolute bottom-12 right-0 max-h-[70dvh] w-[min(340px,calc(100vw-24px))] space-y-3 overflow-auto rounded-2xl border border-amber-300 bg-white p-4 text-sm shadow-2xl">
        <p className="font-bold">{t('Modo de revisão', 'Review mode')} · {roleLabel} · {scenarioLabel}</p>
        <p className="text-xs text-slate-600">{t('Dados locais de teste. As alterações são repostas ao atualizar a página.', 'Local fixtures only. Changes reset when this page reloads.')}</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block font-semibold">{t('Perfil', 'Role')}</span>
            <select value={role} onChange={e => { const value = e.target.value as ReviewRole; setRole(value); apply(value, scenario) }} className="w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="buyer">{t('Comprador', 'Buyer')}</option><option value="seller">{t('Vendedor', 'Seller')}</option><option value="both">{t('Ambos', 'Both')}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold">{t('Cenário', 'Scenario')}</span>
            <select value={scenario} onChange={e => { const value = e.target.value as ReviewScenario; setScenario(value); apply(role, value) }} className="w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="normal">{t('Com conteúdo', 'Populated')}</option><option value="empty">{t('Vazio', 'Empty')}</option><option value="error">{t('Erro de API', 'API error')}</option>
              <option value="slow">{t('Lento', 'Slow')}</option><option value="onboarding">{t('Integração incompleta', 'Incomplete onboarding')}</option><option value="signed-out">{t('Sessão terminada', 'Signed out')}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label={t('Páginas de revisão', 'Review destinations')}>
          {destinations.map(([labelPt, labelEn, href]) => <a key={href} href={href} className="rounded-lg border border-slate-300 px-2 py-1.5 font-medium hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">{t(labelPt, labelEn)}</a>)}
        </div>
        <div className="flex gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-slate-300 px-3 py-2 font-medium">{t('Repor dados de teste', 'Reset fixtures')}</button>
          <button type="button" onClick={leaveReviewMode} className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white">{t('Sair da revisão', 'Exit review')}</button>
        </div>
      </div>
    </details>
  )
}

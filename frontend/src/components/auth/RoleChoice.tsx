import { Building2, Check, LayoutGrid, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

export type AccountRole = 'buyer' | 'seller' | 'both'

export function RoleChoice({ value, onChange }: { value: AccountRole | null; onChange: (role: AccountRole) => void }) {
  const { t } = useLanguage()
  const roles = [
    { value: 'buyer' as const, icon: Search, title: t('Comprador', 'Buyer'), description: t('Procuro um imóvel.', 'I am looking for a property.') },
    { value: 'seller' as const, icon: Building2, title: t('Vendedor', 'Seller'), description: t('Tenho um imóvel para anunciar.', 'I have a property to list.') },
    { value: 'both' as const, icon: LayoutGrid, title: t('Ambos', 'Both'), description: t('Quero comprar e vender.', 'I am buying and selling.') },
  ]
  return (
    <div role="group" aria-label={t('Como vai utilizar a CRITERIA', 'How you will use CRITERIA')} className="divide-y divide-border border-y border-border">
      {roles.map(({ value: option, icon: Icon, title, description }) => {
        const selected = value === option
        return <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={selected}
          className={cn(
            'flex min-h-[76px] w-full items-center gap-4 px-2 py-3 text-left transition-colors duration-150 focus-visible:relative',
            selected ? 'bg-primary-100' : 'hover:bg-overlay',
          )}
        >
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded', selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary')}><Icon aria-hidden="true" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{description}</span></span>
          <span aria-hidden="true" className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong')}>
            {selected && <Check className="h-3.5 w-3.5" />}
          </span>
        </button>
      })}
    </div>
  )
}

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

export interface BuyerPostFilterValues {
  propertyType?: PropertyType
  budgetMin?: number
  budgetMax?: number
  bedroomsMin?: number
  bathroomsMin?: number
  radiusKmMax?: number
}

interface Props {
  filters: BuyerPostFilterValues
  onChange: (filters: BuyerPostFilterValues) => void
  onClear: () => void
}

export function CriteriaFilters({ filters, onChange, onClear }: Props) {
  const { t } = useLanguage()
  const set = <K extends keyof BuyerPostFilterValues>(key: K, value: BuyerPostFilterValues[K]) =>
    onChange({ ...filters, [key]: value })

  const setNum = (key: keyof BuyerPostFilterValues, raw: string) => {
    const n = raw === '' ? undefined : Number(raw)
    set(key, (n != null && Number.isFinite(n) && n >= 0) ? n : undefined)
  }
  const hasRooms = filters.propertyType !== 'land' && filters.propertyType !== 'commercial'
  const setPropertyType = (propertyType: BuyerPostFilterValues['propertyType']) => {
    onChange({
      ...filters,
      propertyType: filters.propertyType === propertyType ? undefined : propertyType,
      ...(propertyType === 'land' || propertyType === 'commercial' ? { bedroomsMin: undefined, bathroomsMin: undefined } : {}),
    })
  }

  return (
    <div className="space-y-5">
      {/* Property type */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">{t('Tipo de imóvel', 'Property type')}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Tipo de imóvel', 'Property type')}>
          {PROPERTY_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setPropertyType(t)}
              aria-pressed={filters.propertyType === t}
              className={cn(
                'min-h-11 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                filters.propertyType === t
                  ? 'bg-primary text-white'
                  : 'bg-accent text-foreground hover:bg-accent/80',
              )}
            >
              {PROPERTY_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Budget range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-budget-min" className="mb-1.5 text-sm font-medium text-foreground">{t('Orçamento mínimo (€)', 'Budget min (€)')}</Label>
          <Input
            id="filter-budget-min"
            type="number"
            min="0"
            placeholder={t('Sem mínimo', 'No min')}
            value={filters.budgetMin ?? ''}
            onChange={e => setNum('budgetMin', e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-budget-max" className="mb-1.5 text-sm font-medium text-foreground">{t('Orçamento máximo (€)', 'Budget max (€)')}</Label>
          <Input
            id="filter-budget-max"
            type="number"
            min="0"
            placeholder={t('Sem máximo', 'No max')}
            value={filters.budgetMax ?? ''}
            onChange={e => setNum('budgetMax', e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      {/* Bedrooms & Bathrooms */}
      {hasRooms && <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-criteria-bedrooms" className="mb-1.5 text-sm font-medium text-foreground">{t('Quartos, mínimo', 'Bedrooms min')}</Label>
          <Input
            id="filter-criteria-bedrooms"
            type="number"
            min="0"
            placeholder={t('Qualquer', 'Any')}
            value={filters.bedroomsMin ?? ''}
            onChange={e => setNum('bedroomsMin', e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-criteria-bathrooms" className="mb-1.5 text-sm font-medium text-foreground">{t('Casas de banho, mínimo', 'Bathrooms min')}</Label>
          <Input
            id="filter-criteria-bathrooms"
            type="number"
            min="0"
            placeholder={t('Qualquer', 'Any')}
            value={filters.bathroomsMin ?? ''}
            onChange={e => setNum('bathroomsMin', e.target.value)}
            className="h-11"
          />
        </div>
      </div>}

      {/* Max search radius */}
      <div>
        <Label htmlFor="filter-radius" className="mb-1.5 text-sm font-medium text-foreground">{t('Raio máximo de pesquisa (km)', 'Max search radius (km)')}</Label>
        <Input
          id="filter-radius"
          type="number"
          min="0"
          placeholder={t('Qualquer', 'Any')}
          value={filters.radiusKmMax ?? ''}
          onChange={e => setNum('radiusKmMax', e.target.value)}
          className="h-11"
        />
      </div>

      {/* Clear all */}
      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        {t('Limpar filtros', 'Clear all filters')}
      </Button>
    </div>
  )
}

/** Count the number of active filter fields */
export function countCriteriaFilters(f: BuyerPostFilterValues): number {
  let n = 0
  if (f.propertyType) n++
  if (f.budgetMin != null) n++
  if (f.budgetMax != null) n++
  if (f.bedroomsMin != null) n++
  if (f.bathroomsMin != null) n++
  if (f.radiusKmMax != null) n++
  return n
}

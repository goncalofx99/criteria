import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { PROPERTY_CONDITIONS, PROPERTY_CONDITION_LABEL, AMENITIES, amenitiesForPropertyType, type PropertyCondition } from '@/lib/amenities'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

export interface SellerPostFilterValues {
  propertyType?: PropertyType
  priceMin?: number
  priceMax?: number
  bedroomsMin?: number
  bathroomsMin?: number
  areaSqmMin?: number
  areaSqmMax?: number
  yearBuiltMin?: number
  condition?: PropertyCondition[]
  hasBalcony?: boolean
  hasCentralHeating?: boolean
  amenities?: string[]
}

interface Props {
  filters: SellerPostFilterValues
  onChange: (filters: SellerPostFilterValues) => void
  onClear: () => void
}

export function PropertyFilters({ filters, onChange, onClear }: Props) {
  const { t } = useLanguage()
  const set = <K extends keyof SellerPostFilterValues>(key: K, value: SellerPostFilterValues[K]) =>
    onChange({ ...filters, [key]: value })

  const setNum = (key: keyof SellerPostFilterValues, raw: string) => {
    const n = raw === '' ? undefined : Number(raw)
    set(key, (n != null && Number.isFinite(n) && n >= 0) ? n : undefined)
  }

  const toggleCondition = (c: PropertyCondition) => {
    const current = filters.condition ?? []
    const next = current.includes(c) ? current.filter(x => x !== c) : [...current, c]
    set('condition', next.length ? next : undefined)
  }

  const toggleAmenity = (key: string) => {
    const current = filters.amenities ?? []
    const next = current.includes(key) ? current.filter(x => x !== key) : [...current, key]
    set('amenities', next.length ? next : undefined)
  }
  const hasRooms = filters.propertyType !== 'land' && filters.propertyType !== 'commercial'
  const setPropertyType = (propertyType: SellerPostFilterValues['propertyType']) => {
    const nextType = filters.propertyType === propertyType ? undefined : propertyType
    const residential = nextType !== 'land' && nextType !== 'commercial'
    const availableAmenities = nextType ? amenitiesForPropertyType(nextType) : AMENITIES
    onChange({
      ...filters,
      propertyType: nextType,
      amenities: filters.amenities?.filter(key => availableAmenities.some(item => item.key === key)),
      ...(!residential ? {
        bedroomsMin: undefined,
        bathroomsMin: undefined,
        yearBuiltMin: undefined,
        condition: undefined,
        hasBalcony: undefined,
        hasCentralHeating: undefined,
      } : {}),
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

      {/* Price range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-price-min" className="mb-1.5 text-sm font-medium text-foreground">{t('Preço mínimo (€)', 'Price min (€)')}</Label>
          <Input
            id="filter-price-min"
            type="number"
            min="0"
            placeholder={t('Sem mínimo', 'No min')}
            value={filters.priceMin ?? ''}
            onChange={e => setNum('priceMin', e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-price-max" className="mb-1.5 text-sm font-medium text-foreground">{t('Preço máximo (€)', 'Price max (€)')}</Label>
          <Input
            id="filter-price-max"
            type="number"
            min="0"
            placeholder={t('Sem máximo', 'No max')}
            value={filters.priceMax ?? ''}
            onChange={e => setNum('priceMax', e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      {/* Bedrooms & Bathrooms */}
      {hasRooms && <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-bedrooms" className="mb-1.5 text-sm font-medium text-foreground">{t('Quartos, mínimo', 'Bedrooms min')}</Label>
          <Input
            id="filter-bedrooms"
            type="number"
            min="0"
            placeholder={t('Qualquer', 'Any')}
            value={filters.bedroomsMin ?? ''}
            onChange={e => setNum('bedroomsMin', e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-bathrooms" className="mb-1.5 text-sm font-medium text-foreground">{t('Casas de banho, mínimo', 'Bathrooms min')}</Label>
          <Input
            id="filter-bathrooms"
            type="number"
            min="0"
            placeholder={t('Qualquer', 'Any')}
            value={filters.bathroomsMin ?? ''}
            onChange={e => setNum('bathroomsMin', e.target.value)}
            className="h-11"
          />
        </div>
      </div>}

      {/* Area range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-area-min" className="mb-1.5 text-sm font-medium text-foreground">{t('Área mínima (m²)', 'Area min (m²)')}</Label>
          <Input
            id="filter-area-min"
            type="number"
            min="0"
            placeholder={t('Sem mínimo', 'No min')}
            value={filters.areaSqmMin ?? ''}
            onChange={e => setNum('areaSqmMin', e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-area-max" className="mb-1.5 text-sm font-medium text-foreground">{t('Área máxima (m²)', 'Area max (m²)')}</Label>
          <Input
            id="filter-area-max"
            type="number"
            min="0"
            placeholder={t('Sem máximo', 'No max')}
            value={filters.areaSqmMax ?? ''}
            onChange={e => setNum('areaSqmMax', e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      {/* Year built min */}
      {hasRooms && <div>
        <Label htmlFor="filter-year-built" className="mb-1.5 text-sm font-medium text-foreground">{t('Ano de construção (mín.)', 'Year built (min)')}</Label>
        <Input
          id="filter-year-built"
          type="number"
          min="0"
          placeholder={t('Qualquer', 'Any')}
          value={filters.yearBuiltMin ?? ''}
          onChange={e => setNum('yearBuiltMin', e.target.value)}
          className="h-11"
        />
      </div>}

      {/* Condition */}
      {hasRooms && <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">{t('Estado', 'Condition')}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Estado', 'Condition')}>
          {PROPERTY_CONDITIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCondition(c)}
              aria-pressed={filters.condition?.includes(c) ?? false}
              className={cn(
                'min-h-11 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                filters.condition?.includes(c)
                  ? 'bg-primary text-white'
                  : 'bg-accent text-foreground hover:bg-accent/80',
              )}
            >
              {PROPERTY_CONDITION_LABEL[c]}
            </button>
          ))}
        </div>
      </div>}

      {/* Toggles: Balcony & Central heating */}
      {hasRooms && <div className="flex gap-3">
        <button
          type="button"
          onClick={() => set('hasBalcony', filters.hasBalcony === true ? undefined : true)}
          aria-pressed={filters.hasBalcony === true}
          className={cn(
            'min-h-11 flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
            filters.hasBalcony
              ? 'bg-primary text-white'
              : 'bg-accent text-foreground hover:bg-accent/80',
          )}
        >
          {t('Varanda', 'Balcony')}
        </button>
        <button
          type="button"
          onClick={() => set('hasCentralHeating', filters.hasCentralHeating === true ? undefined : true)}
          aria-pressed={filters.hasCentralHeating === true}
          className={cn(
            'min-h-11 flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
            filters.hasCentralHeating
              ? 'bg-primary text-white'
              : 'bg-accent text-foreground hover:bg-accent/80',
          )}
        >
          {t('Aquecimento central', 'Central heating')}
        </button>
      </div>}

      {/* Amenities */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">{t('Comodidades essenciais', 'Must-have amenities')}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Comodidades essenciais', 'Must-have amenities')}>
          {(filters.propertyType ? amenitiesForPropertyType(filters.propertyType) : AMENITIES).map(a => (
            <button
              key={a.key}
              type="button"
              onClick={() => toggleAmenity(a.key)}
              aria-pressed={filters.amenities?.includes(a.key) ?? false}
              className={cn(
                'min-h-11 rounded px-2.5 py-1 text-sm font-medium transition-colors',
                filters.amenities?.includes(a.key)
                  ? 'bg-primary text-white'
                  : 'bg-accent text-foreground hover:bg-accent/80',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        {t('Limpar filtros', 'Clear all filters')}
      </Button>
    </div>
  )
}

/** Count the number of active filter fields */
export function countPropertyFilters(f: SellerPostFilterValues): number {
  let n = 0
  if (f.propertyType) n++
  if (f.priceMin != null) n++
  if (f.priceMax != null) n++
  if (f.bedroomsMin != null) n++
  if (f.bathroomsMin != null) n++
  if (f.areaSqmMin != null) n++
  if (f.areaSqmMax != null) n++
  if (f.yearBuiltMin != null) n++
  if (f.condition?.length) n++
  if (f.hasBalcony != null) n++
  if (f.hasCentralHeating != null) n++
  if (f.amenities?.length) n++
  return n
}

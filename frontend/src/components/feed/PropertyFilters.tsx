import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { PROPERTY_CONDITIONS, PROPERTY_CONDITION_LABEL, AMENITIES, type PropertyCondition } from '@/lib/amenities'
import { cn } from '@/lib/utils'

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
  const set = <K extends keyof SellerPostFilterValues>(key: K, value: SellerPostFilterValues[K]) =>
    onChange({ ...filters, [key]: value })

  const setNum = (key: keyof SellerPostFilterValues, raw: string) => {
    const n = raw === '' ? undefined : Number(raw)
    set(key, (n != null && !isNaN(n)) ? n : undefined)
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

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      {/* Property type */}
      <div>
        <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Property type</Label>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('propertyType', filters.propertyType === t ? undefined : t)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
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
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Price min</Label>
          <Input
            type="number"
            placeholder="No min"
            value={filters.priceMin ?? ''}
            onChange={e => setNum('priceMin', e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Price max</Label>
          <Input
            type="number"
            placeholder="No max"
            value={filters.priceMax ?? ''}
            onChange={e => setNum('priceMax', e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {/* Bedrooms & Bathrooms */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Bedrooms min</Label>
          <Input
            type="number"
            placeholder="Any"
            value={filters.bedroomsMin ?? ''}
            onChange={e => setNum('bedroomsMin', e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Bathrooms min</Label>
          <Input
            type="number"
            placeholder="Any"
            value={filters.bathroomsMin ?? ''}
            onChange={e => setNum('bathroomsMin', e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {/* Area range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Area min (m²)</Label>
          <Input
            type="number"
            placeholder="No min"
            value={filters.areaSqmMin ?? ''}
            onChange={e => setNum('areaSqmMin', e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Area max (m²)</Label>
          <Input
            type="number"
            placeholder="No max"
            value={filters.areaSqmMax ?? ''}
            onChange={e => setNum('areaSqmMax', e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {/* Year built min */}
      <div>
        <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Year built (min)</Label>
        <Input
          type="number"
          placeholder="Any"
          value={filters.yearBuiltMin ?? ''}
          onChange={e => setNum('yearBuiltMin', e.target.value)}
          className="h-10"
        />
      </div>

      {/* Condition */}
      <div>
        <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Condition</Label>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_CONDITIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCondition(c)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filters.condition?.includes(c)
                  ? 'bg-primary text-white'
                  : 'bg-accent text-foreground hover:bg-accent/80',
              )}
            >
              {PROPERTY_CONDITION_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles: Balcony & Central heating */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => set('hasBalcony', filters.hasBalcony === true ? undefined : true)}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
            filters.hasBalcony
              ? 'bg-primary text-white'
              : 'bg-accent text-foreground hover:bg-accent/80',
          )}
        >
          Balcony
        </button>
        <button
          type="button"
          onClick={() => set('hasCentralHeating', filters.hasCentralHeating === true ? undefined : true)}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
            filters.hasCentralHeating
              ? 'bg-primary text-white'
              : 'bg-accent text-foreground hover:bg-accent/80',
          )}
        >
          Central heating
        </button>
      </div>

      {/* Amenities */}
      <div>
        <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Must-have amenities</Label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES.map(a => (
            <button
              key={a.key}
              type="button"
              onClick={() => toggleAmenity(a.key)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
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
        Clear all filters
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

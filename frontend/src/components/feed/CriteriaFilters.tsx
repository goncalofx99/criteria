import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { cn } from '@/lib/utils'

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
  const set = <K extends keyof BuyerPostFilterValues>(key: K, value: BuyerPostFilterValues[K]) =>
    onChange({ ...filters, [key]: value })

  const setNum = (key: keyof BuyerPostFilterValues, raw: string) => {
    const n = raw === '' ? undefined : Number(raw)
    set(key, (n != null && !isNaN(n)) ? n : undefined)
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

      {/* Budget range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Budget min</Label>
          <Input
            type="number"
            placeholder="No min"
            value={filters.budgetMin ?? ''}
            onChange={e => setNum('budgetMin', e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Budget max</Label>
          <Input
            type="number"
            placeholder="No max"
            value={filters.budgetMax ?? ''}
            onChange={e => setNum('budgetMax', e.target.value)}
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

      {/* Max search radius */}
      <div>
        <Label className="mb-1.5 text-xs font-medium text-muted-foreground">Max search radius (km)</Label>
        <Input
          type="number"
          placeholder="Any"
          value={filters.radiusKmMax ?? ''}
          onChange={e => setNum('radiusKmMax', e.target.value)}
          className="h-10"
        />
      </div>

      {/* Clear all */}
      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        Clear all filters
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

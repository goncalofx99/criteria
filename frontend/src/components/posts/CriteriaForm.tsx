import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LOCATION_PRESETS, type LocationPreset } from '@/lib/locations'
import { type PropertyType } from '@/lib/propertyType'
import {
  AMENITIES,
  PROPERTY_CONDITIONS,
  PROPERTY_CONDITION_LABEL,
  type PropertyCondition,
} from '@/lib/amenities'
import {
  Field,
  Section,
  PropertyTypePicker,
  LocationPicker,
  CountPicker,
} from './PropertyForm'
import { AddressAutocomplete } from '@/components/map/AddressAutocomplete'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import type { GeocodeResult } from '@/lib/geocoding'
import { cn } from '@/lib/utils'

export interface CriteriaFormValues {
  title: string
  description: string | null
  locationText: string
  lat: number
  lng: number
  radiusKm: number
  propertyType: PropertyType
  priceMin: number
  priceMax: number
  bedroomsMin: number
  bathroomsMin: number
  areaSqmMin: number | null
  yearBuiltMin: number | null
  conditions: PropertyCondition[] | null
  floorMin: number | null
  floorMax: number | null
  requiresBalcony: boolean | null
  requiresCentralHeating: boolean | null
  requiredAmenities: string[]
}

interface CriteriaFormProps {
  initial?: Partial<CriteriaFormValues>
  submitLabel: string
  intro?: React.ReactNode
  onSubmit: (values: CriteriaFormValues) => Promise<void>
}

function findPreset(label: string | undefined): LocationPreset | null {
  if (!label) return null
  return LOCATION_PRESETS.find(p => p.label === label) ?? null
}

const CURRENT_YEAR = new Date().getFullYear()

export function CriteriaForm({ initial, submitLabel, intro, onSubmit }: CriteriaFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<PropertyType>(initial?.propertyType ?? 'apartment')
  const [location, setLocation] = useState<LocationPreset | null>(
    findPreset(initial?.locationText) ??
    (initial?.locationText && initial?.lat != null && initial?.lng != null
      ? { label: initial.locationText, lat: initial.lat, lng: initial.lng }
      : null),
  )
  const [radiusKm, setRadiusKm] = useState(String(initial?.radiusKm ?? 15))
  const [priceMin, setPriceMin] = useState(initial?.priceMin != null ? String(initial.priceMin) : '')
  const [priceMax, setPriceMax] = useState(initial?.priceMax != null ? String(initial.priceMax) : '')
  const [bedroomsMin, setBedroomsMin] = useState(String(initial?.bedroomsMin ?? 2))
  const [bathroomsMin, setBathroomsMin] = useState(String(initial?.bathroomsMin ?? 1))
  const [areaSqmMin, setAreaSqmMin] = useState(initial?.areaSqmMin ? String(initial.areaSqmMin) : '')
  const [yearBuiltMin, setYearBuiltMin] = useState(
    initial?.yearBuiltMin ? String(initial.yearBuiltMin) : '',
  )
  const [conditions, setConditions] = useState<PropertyCondition[]>(initial?.conditions ?? [])
  const [floorMin, setFloorMin] = useState(initial?.floorMin != null ? String(initial.floorMin) : '')
  const [floorMax, setFloorMax] = useState(initial?.floorMax != null ? String(initial.floorMax) : '')
  const [requiresBalcony, setRequiresBalcony] = useState<boolean | null>(
    initial?.requiresBalcony ?? null,
  )
  const [requiresCentralHeating, setRequiresCentralHeating] = useState<boolean | null>(
    initial?.requiresCentralHeating ?? null,
  )
  const [requiredAmenities, setRequiredAmenities] = useState<string[]>(
    initial?.requiredAmenities ?? [],
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const min = priceMin ? Number(priceMin) : NaN
  const max = priceMax ? Number(priceMax) : NaN
  const radius = Number(radiusKm)
  const areaNum = areaSqmMin ? Number(areaSqmMin) : null
  const yearMin = yearBuiltMin ? Number(yearBuiltMin) : null
  const fMin = floorMin ? Number(floorMin) : null
  const fMax = floorMax ? Number(floorMax) : null

  const floorRangeOk =
    fMin == null || fMax == null || fMin <= fMax

  const canSubmit =
    title.trim().length > 0 &&
    location !== null &&
    !Number.isNaN(radius) && radius > 0 &&
    !Number.isNaN(min) && min >= 0 &&
    !Number.isNaN(max) && max > 0 &&
    min < max &&
    floorRangeOk

  function toggleAmenity(key: string) {
    setRequiredAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  function toggleCondition(c: PropertyCondition) {
    setConditions(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !location) return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        locationText: location.label,
        lat: location.lat,
        lng: location.lng,
        radiusKm: radius,
        propertyType: type,
        priceMin: min,
        priceMax: max,
        bedroomsMin: parseInt(bedroomsMin, 10),
        bathroomsMin: parseInt(bathroomsMin, 10),
        areaSqmMin: areaNum && areaNum > 0 ? areaNum : null,
        yearBuiltMin: yearMin && yearMin >= 1500 ? yearMin : null,
        conditions: conditions.length > 0 ? conditions : null,
        floorMin: fMin,
        floorMax: fMax,
        requiresBalcony,
        requiresCentralHeating,
        requiredAmenities,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {intro}

      <Section title="Basics">
        <Field label="Title" required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Family home in Cascais"
            maxLength={200}
          />
        </Field>

        <Field label="Property type">
          <PropertyTypePicker value={type} onChange={setType} />
        </Field>

        <Field label="Preferred location" required>
          <div className="space-y-3">
            <LocationPicker value={location} onChange={setLocation} />
            <AddressAutocomplete
              value={location?.label ?? ''}
              onPick={(r: GeocodeResult) => setLocation({ label: r.label, lat: r.lat, lng: r.lng })}
              placeholder="Or type an address (e.g. Cascais)"
            />
            {location && Number(radiusKm) > 0 && (
              <LazyPostsMap
                criteria={[{
                  id: 'preview',
                  lat: location.lat,
                  lng: location.lng,
                  radiusKm: Math.max(1, Number(radiusKm) || 1),
                }]}
                interactive
                height="clamp(200px, 30vh, 360px)"
              />
            )}
          </div>
        </Field>

        <Field label="Search radius (km)">
          <Input
            type="number"
            inputMode="numeric"
            value={radiusKm}
            onChange={e => setRadiusKm(e.target.value)}
            min={1}
            max={500}
          />
        </Field>

        <Field label="Budget (€)" required>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              inputMode="numeric"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              placeholder="Min"
              min={0}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              inputMode="numeric"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              placeholder="Max"
              min={1}
            />
          </div>
          {priceMin && priceMax && min >= max && (
            <p className="mt-1 text-xs text-destructive">Min must be less than max.</p>
          )}
        </Field>
      </Section>

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min bedrooms">
            <CountPicker options={['0', '1', '2', '3', '4', '5']} value={bedroomsMin} onChange={setBedroomsMin} />
          </Field>
          <Field label="Min bathrooms">
            <CountPicker options={['1', '2', '3', '4']} value={bathroomsMin} onChange={setBathroomsMin} />
          </Field>
        </div>

        <Field label="Min area (m²)">
          <Input
            type="number"
            inputMode="numeric"
            value={areaSqmMin}
            onChange={e => setAreaSqmMin(e.target.value)}
            placeholder="e.g. 90"
            min={1}
          />
        </Field>
      </Section>

      <Section title="Optional preferences" subtitle="Leave blank if you don't mind">
        <Field label="Built no earlier than">
          <Input
            type="number"
            inputMode="numeric"
            value={yearBuiltMin}
            onChange={e => setYearBuiltMin(e.target.value)}
            placeholder={String(CURRENT_YEAR - 30)}
            min={1500}
            max={CURRENT_YEAR + 5}
          />
        </Field>

        <Field label="Acceptable conditions">
          <div className="flex flex-wrap gap-2">
            {PROPERTY_CONDITIONS.map(c => {
              const active = conditions.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  className={cn(
                    'h-9 rounded-full px-3.5 text-sm transition-all',
                    active
                      ? 'bg-primary text-white font-semibold'
                      : 'border border-border bg-surface text-foreground/70',
                  )}
                >
                  {PROPERTY_CONDITION_LABEL[c]}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Floor min">
            <Input
              type="number"
              inputMode="numeric"
              value={floorMin}
              onChange={e => setFloorMin(e.target.value)}
              placeholder="e.g. 1"
            />
          </Field>
          <Field label="Floor max">
            <Input
              type="number"
              inputMode="numeric"
              value={floorMax}
              onChange={e => setFloorMax(e.target.value)}
              placeholder="e.g. 4"
            />
          </Field>
        </div>
        {!floorRangeOk && (
          <p className="text-xs text-destructive">Floor min must be ≤ floor max.</p>
        )}

        <Field label="Balcony">
          <RequirementPicker value={requiresBalcony} onChange={setRequiresBalcony} />
        </Field>
        <Field label="Central heating">
          <RequirementPicker value={requiresCentralHeating} onChange={setRequiresCentralHeating} />
        </Field>

        <Field label="Required amenities" >
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => {
              const active = requiredAmenities.includes(a.key)
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleAmenity(a.key)}
                  className={cn(
                    'h-9 rounded-full px-3.5 text-sm transition-all',
                    active
                      ? 'bg-primary text-white font-semibold'
                      : 'border border-border bg-surface text-foreground/70',
                  )}
                >
                  {a.label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      <Section title="Notes">
        <Textarea
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Anything else sellers should know? Schools, parking, timeline, deal-breakers..."
          maxLength={2000}
        />
      </Section>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="rounded-xl mt-2"
        disabled={!canSubmit || submitting}
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
      </Button>
    </form>
  )
}

function RequirementPicker({
  value, onChange,
}: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-2">
      {([
        { v: null, label: "Don't mind" },
        { v: true, label: 'Must have' },
      ] as const).map(opt => {
        const active = value === opt.v
        return (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              'h-10 flex-1 rounded-md text-sm transition-all border-[1.5px]',
              active
                ? 'border-primary bg-primary-100 text-primary font-semibold'
                : 'border-border bg-surface text-foreground/70',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

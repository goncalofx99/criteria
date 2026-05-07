import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LOCATION_PRESETS, type LocationPreset } from '@/lib/locations'
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import {
  AMENITIES,
  PROPERTY_CONDITIONS,
  PROPERTY_CONDITION_LABEL,
  type PropertyCondition,
} from '@/lib/amenities'
import { cn } from '@/lib/utils'

export interface PropertyFormValues {
  title: string
  description: string | null
  locationText: string
  lat: number
  lng: number
  propertyType: PropertyType
  price: number
  bedrooms: number
  bathrooms: number
  areaSqm: number
  yearBuilt: number
  condition: PropertyCondition
  floor: number | null
  totalFloors: number | null
  hasBalcony: boolean
  hasCentralHeating: boolean
  amenities: string[]
}

interface PropertyFormProps {
  initial?: Partial<PropertyFormValues>
  submitLabel: string
  onSubmit: (values: PropertyFormValues) => Promise<void>
}

function findPreset(label: string | undefined): LocationPreset | null {
  if (!label) return null
  return LOCATION_PRESETS.find(p => p.label === label) ?? null
}

const CURRENT_YEAR = new Date().getFullYear()

export function PropertyForm({ initial, submitLabel, onSubmit }: PropertyFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<PropertyType>(initial?.propertyType ?? 'apartment')
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : '')
  const [location, setLocation] = useState<LocationPreset | null>(
    findPreset(initial?.locationText) ??
    (initial?.locationText && initial?.lat != null && initial?.lng != null
      ? { label: initial.locationText, lat: initial.lat, lng: initial.lng }
      : null),
  )
  const [bedrooms, setBedrooms] = useState(String(initial?.bedrooms ?? 3))
  const [bathrooms, setBathrooms] = useState(String(initial?.bathrooms ?? 2))
  const [areaSqm, setAreaSqm] = useState(initial?.areaSqm ? String(initial.areaSqm) : '')
  const [yearBuilt, setYearBuilt] = useState(initial?.yearBuilt ? String(initial.yearBuilt) : '')
  const [condition, setCondition] = useState<PropertyCondition>(initial?.condition ?? 'good')
  const [floor, setFloor] = useState(initial?.floor != null ? String(initial.floor) : '')
  const [totalFloors, setTotalFloors] = useState(
    initial?.totalFloors != null ? String(initial.totalFloors) : '',
  )
  const [hasBalcony, setHasBalcony] = useState<boolean | null>(initial?.hasBalcony ?? null)
  const [hasCentralHeating, setHasCentralHeating] = useState<boolean | null>(
    initial?.hasCentralHeating ?? null,
  )
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? [])
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const priceNum = Number(price)
  const areaNum = Number(areaSqm)
  const yearNum = Number(yearBuilt)
  const floorNum = floor === '' ? null : Number(floor)
  const totalFloorsNum = totalFloors === '' ? null : Number(totalFloors)
  const isApartment = type === 'apartment'

  const canSubmit =
    title.trim().length > 0 &&
    location !== null &&
    !Number.isNaN(priceNum) && priceNum > 0 &&
    !Number.isNaN(Number(bedrooms)) &&
    !Number.isNaN(Number(bathrooms)) &&
    !Number.isNaN(areaNum) && areaNum > 0 &&
    !Number.isNaN(yearNum) && yearNum >= 1500 && yearNum <= CURRENT_YEAR + 5 &&
    hasBalcony !== null &&
    hasCentralHeating !== null &&
    (!isApartment || (floorNum != null && !Number.isNaN(floorNum)))

  function toggleAmenity(key: string) {
    setAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !location || hasBalcony === null || hasCentralHeating === null) return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        locationText: location.label,
        lat: location.lat,
        lng: location.lng,
        propertyType: type,
        price: priceNum,
        bedrooms: parseInt(bedrooms, 10),
        bathrooms: parseInt(bathrooms, 10),
        areaSqm: areaNum,
        yearBuilt: yearNum,
        condition,
        floor: floorNum,
        totalFloors: totalFloorsNum && totalFloorsNum > 0 ? totalFloorsNum : null,
        hasBalcony,
        hasCentralHeating,
        amenities,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <Section title="Basics">
        <Field label="Property title" required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Quinta da Boa Vista"
            maxLength={200}
          />
        </Field>

        <Field label="Property type" required>
          <PropertyTypePicker value={type} onChange={setType} />
        </Field>

        <Field label="Asking price (€)" required>
          <Input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="350000"
            min={1}
          />
        </Field>

        <Field label="Location" required>
          <LocationPicker value={location} onChange={setLocation} />
        </Field>
      </Section>

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bedrooms" required>
            <CountPicker options={['0', '1', '2', '3', '4', '5']} value={bedrooms} onChange={setBedrooms} />
          </Field>
          <Field label="Bathrooms" required>
            <CountPicker options={['1', '2', '3', '4']} value={bathrooms} onChange={setBathrooms} />
          </Field>
        </div>

        <Field label="Area (m²)" required>
          <Input
            type="number"
            inputMode="numeric"
            value={areaSqm}
            onChange={e => setAreaSqm(e.target.value)}
            placeholder="e.g. 120"
            min={1}
          />
        </Field>

        {isApartment && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Floor" required>
              <Input
                type="number"
                inputMode="numeric"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="0 = ground"
              />
            </Field>
            <Field label="Total floors">
              <Input
                type="number"
                inputMode="numeric"
                value={totalFloors}
                onChange={e => setTotalFloors(e.target.value)}
                placeholder="e.g. 5"
                min={1}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Building">
        <Field label="Year built" required>
          <Input
            type="number"
            inputMode="numeric"
            value={yearBuilt}
            onChange={e => setYearBuilt(e.target.value)}
            placeholder={String(CURRENT_YEAR - 20)}
            min={1500}
            max={CURRENT_YEAR + 5}
          />
        </Field>

        <Field label="Condition" required>
          <ConditionPicker value={condition} onChange={setCondition} />
        </Field>
      </Section>

      <Section title="Required features">
        <Field label="Balcony" required>
          <YesNoPicker value={hasBalcony} onChange={setHasBalcony} />
        </Field>
        <Field label="Central heating" required>
          <YesNoPicker value={hasCentralHeating} onChange={setHasCentralHeating} />
        </Field>
      </Section>

      <Section title="Other amenities" subtitle="Tap any that apply">
        <AmenityGrid value={amenities} onToggle={toggleAmenity} />
      </Section>

      <Section title="Description">
        <Textarea
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What makes this property special?"
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

// ─── Shared form pieces (also used by CriteriaForm) ─────────────────────────

export function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}

export function Section({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-elevation-1 space-y-4">
      <header>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

export function PropertyTypePicker({
  value, onChange,
}: { value: PropertyType; onChange: (t: PropertyType) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROPERTY_TYPES.map(t => {
        const active = value === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              'h-9 rounded-full px-4 text-sm transition-all',
              active
                ? 'bg-primary text-white font-semibold'
                : 'border border-border bg-surface text-foreground/70',
            )}
          >
            {PROPERTY_TYPE_LABEL[t]}
          </button>
        )
      })}
    </div>
  )
}

export function LocationPicker({
  value, onChange,
}: { value: LocationPreset | null; onChange: (l: LocationPreset) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LOCATION_PRESETS.map(p => {
        const active = value?.label === p.label
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'h-9 rounded-full px-3.5 text-sm transition-all',
              active
                ? 'bg-primary text-white font-semibold'
                : 'border border-border bg-surface text-foreground/70',
            )}
          >
            {p.label}
          </button>
        )
      })}
      {value && !LOCATION_PRESETS.some(p => p.label === value.label) && (
        <span className="rounded-full px-3.5 h-9 inline-flex items-center text-sm bg-primary text-white font-semibold">
          {value.label}
        </span>
      )}
    </div>
  )
}

export function CountPicker({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'h-10 w-10 rounded-md text-sm transition-all border-[1.5px]',
              active
                ? 'border-primary bg-primary-100 text-primary font-semibold'
                : 'border-border bg-surface text-foreground/70',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function ConditionPicker({
  value, onChange,
}: { value: PropertyCondition; onChange: (c: PropertyCondition) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROPERTY_CONDITIONS.map(c => {
        const active = value === c
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
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
  )
}

export function YesNoPicker({
  value, onChange,
}: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {([
        { v: true,  label: 'Yes' },
        { v: false, label: 'No'  },
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

export function AmenityGrid({
  value, onToggle,
}: { value: string[]; onToggle: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {AMENITIES.map(a => {
        const active = value.includes(a.key)
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onToggle(a.key)}
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
  )
}

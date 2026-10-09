import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LOCATION_PRESETS, type LocationPreset } from '@/lib/locations'
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import {
  amenitiesForPropertyType,
  PROPERTY_CONDITIONS,
  PROPERTY_CONDITION_LABEL,
  type PropertyCondition,
} from '@/lib/amenities'
import { AddressAutocomplete } from '@/components/map/AddressAutocomplete'
import { LazyPostsMap } from '@/components/map/LazyPostsMap'
import type { GeocodeResult } from '@/lib/geocoding'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/upload'

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
  areaSqm: number | null
  yearBuilt: number | null
  condition: PropertyCondition
  floor: number | null
  totalFloors: number | null
  hasBalcony: boolean
  hasCentralHeating: boolean
  amenities: string[]
  images: string[]
}

interface PropertyFormProps {
  initial?: Partial<PropertyFormValues>
  submitLabel: string
  uploadOwnerId: string
  onSubmit: (values: PropertyFormValues) => Promise<void>
}

function findPreset(label: string | undefined): LocationPreset | null {
  if (!label) return null
  return LOCATION_PRESETS.find(p => p.label === label) ?? null
}

const CURRENT_YEAR = new Date().getFullYear()

interface PendingImage { file: File; preview: string }

export function PropertyForm({ initial, submitLabel, uploadOwnerId, onSubmit }: PropertyFormProps) {
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
  const [savedImages, setSavedImages] = useState<string[]>(initial?.images ?? [])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const previewsRef = useRef<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const priceNum = price === '' ? NaN : Number(price)
  const areaNum = areaSqm === '' ? null : Number(areaSqm)
  const yearNum = yearBuilt === '' ? null : Number(yearBuilt)
  const floorNum = floor === '' ? null : Number(floor)
  const totalFloorsNum = totalFloors === '' ? null : Number(totalFloors)
  const isApartment = type === 'apartment'
  const isResidential = type === 'apartment' || type === 'house'

  useEffect(() => () => {
    previewsRef.current.forEach(URL.revokeObjectURL)
  }, [])

  const canSubmit =
    title.trim().length > 0 &&
    location !== null &&
    !Number.isNaN(priceNum) && priceNum > 0 &&
    (!isResidential || (Number.isInteger(Number(bedrooms)) && Number(bedrooms) >= 0 && Number.isInteger(Number(bathrooms)) && Number(bathrooms) >= 1)) &&
    (areaNum !== null && Number.isFinite(areaNum) && areaNum > 0) &&
    (yearNum === null || (Number.isInteger(yearNum) && yearNum >= 1500 && yearNum <= CURRENT_YEAR + 5)) &&
    (!isResidential || (yearNum !== null && hasBalcony !== null && hasCentralHeating !== null)) &&
    (!isApartment || (
      floorNum !== null && Number.isInteger(floorNum) && floorNum >= -5 && floorNum <= 200 &&
      (totalFloorsNum === null || (Number.isInteger(totalFloorsNum) && totalFloorsNum >= 1 && totalFloorsNum <= 200))
    ))

  function addImages(files: FileList | null) {
    if (!files) return
    const slots = 12 - savedImages.length - pendingImages.length
    const selected = Array.from(files).slice(0, Math.max(0, slots))
    if (files.length > slots) setError('You can add up to 12 photos.')
    const valid = selected.filter(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
        setError('Photos must be JPEG, PNG or WebP and under 10 MB each.')
        return false
      }
      return true
    })
    setPendingImages(prev => [...prev, ...valid.map(file => {
      const preview = URL.createObjectURL(file)
      previewsRef.current.push(preview)
      return { file, preview }
    })])
  }

  function removePendingImage(preview: string) {
    URL.revokeObjectURL(preview)
    previewsRef.current = previewsRef.current.filter(url => url !== preview)
    setPendingImages(prev => prev.filter(item => item.preview !== preview))
  }

  function toggleAmenity(key: string) {
    setAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !location) return
    setError(null)
    setSubmitting(true)
    try {
      const uploaded: string[] = []
      for (const item of pendingImages) {
        uploaded.push(await uploadFile(item.file, `posts/${uploadOwnerId}`))
      }
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        locationText: location.label,
        lat: location.lat,
        lng: location.lng,
        propertyType: type,
        price: priceNum,
        bedrooms: isResidential ? parseInt(bedrooms, 10) : 0,
        bathrooms: isResidential ? parseInt(bathrooms, 10) : 0,
        areaSqm: areaNum,
        yearBuilt: isResidential ? yearNum : null,
        condition,
        floor: isApartment ? floorNum : null,
        totalFloors: isApartment && totalFloorsNum && totalFloorsNum > 0 ? totalFloorsNum : null,
        hasBalcony: isResidential ? (hasBalcony ?? false) : false,
        hasCentralHeating: isResidential ? (hasCentralHeating ?? false) : false,
        amenities: amenities.filter(key => amenitiesForPropertyType(type).some(item => item.key === key)),
        images: [...savedImages, ...uploaded],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
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
          <div className="space-y-3">
            <LocationPicker value={location} onChange={setLocation} />
            <AddressAutocomplete
              value={location?.label ?? ''}
              onPick={(r: GeocodeResult) => setLocation({ label: r.label, lat: r.lat, lng: r.lng })}
              onEdit={() => setLocation(null)}
              placeholder="Or type an address (e.g. Rua Augusta 23, Lisboa)"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">Other members see an approximate area. Keep the street address out of the title and description.</p>
            {location && (
              <LazyPostsMap
                pin={{ lat: location.lat, lng: location.lng, draggable: true }}
                onPinDrag={(lat, lng) => setLocation({ ...location, lat, lng })}
                interactive
                height="clamp(200px, 30vh, 360px)"
              />
            )}
          </div>
        </Field>
      </Section>

      <Section title={isResidential ? 'Rooms and area' : 'Area'}>
        {isResidential && <div className="grid grid-cols-2 gap-4">
          <Field label="Bedrooms" required>
            <CountPicker options={['0', '1', '2', '3', '4', '5']} value={bedrooms} onChange={setBedrooms} />
          </Field>
          <Field label="Bathrooms" required>
            <CountPicker options={['1', '2', '3', '4']} value={bathrooms} onChange={setBathrooms} />
          </Field>
        </div>}

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
                min={-5}
                max={200}
                step={1}
              />
              {floor !== '' && (floorNum === null || !Number.isInteger(floorNum) || floorNum < -5 || floorNum > 200) && (
                <p className="mt-1 text-xs text-destructive">Enter a whole floor from −5 to 200.</p>
              )}
            </Field>
            <Field label="Total floors">
              <Input
                type="number"
                inputMode="numeric"
                value={totalFloors}
                onChange={e => setTotalFloors(e.target.value)}
                placeholder="e.g. 5"
                min={1}
                max={200}
                step={1}
              />
              {totalFloors !== '' && (totalFloorsNum === null || !Number.isInteger(totalFloorsNum) || totalFloorsNum < 1 || totalFloorsNum > 200) && (
                <p className="mt-1 text-xs text-destructive">Enter a whole number from 1 to 200.</p>
              )}
            </Field>
          </div>
        )}
      </Section>

      {isResidential && <Section title="Building">
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
      </Section>}

      {isResidential && <Section title="Features">
        <Field label="Balcony" required>
          <YesNoPicker value={hasBalcony} onChange={setHasBalcony} />
        </Field>
        <Field label="Central heating" required>
          <YesNoPicker value={hasCentralHeating} onChange={setHasCentralHeating} />
        </Field>
      </Section>}

      <Section title="Other amenities" subtitle="Select the features your property has">
        <AmenityGrid value={amenities} propertyType={type} onToggle={toggleAmenity} />
      </Section>

      <Section title="Photos" subtitle="Show what makes your property stand out. Up to 12 photos, 10 MB each.">
        {(savedImages.length > 0 || pendingImages.length > 0) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {savedImages.map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-accent">
                <img src={url} alt={`Saved property photo ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label={`Remove saved photo ${index + 1}`} onClick={() => setSavedImages(prev => prev.filter((_, i) => i !== index))} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-foreground shadow-card"><X size={17} /></button>
              </div>
            ))}
            {pendingImages.map((item, index) => (
              <div key={item.preview} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-accent">
                <img src={item.preview} alt={`New property photo ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label={`Remove new photo ${index + 1}`} onClick={() => removePendingImage(item.preview)} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-foreground shadow-card"><X size={17} /></button>
              </div>
            ))}
          </div>
        )}
        <label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-accent/40 px-4 text-sm font-medium text-primary hover:border-primary focus-within:ring-2 focus-within:ring-primary" aria-label="Add property photos">
          <ImagePlus size={18} /> Add photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={event => { addImages(event.target.files); event.target.value = '' }} />
        </label>
      </Section>

      <Section title="Description">
        <Field label="About this property">
          <Textarea
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What makes this property special?"
            maxLength={2000}
          />
        </Field>
      </Section>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
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
  const id = useId()
  const directControl = isValidElement(children) && (children.type === Input || children.type === Textarea)
  const content = directControl
    ? cloneElement(children as React.ReactElement<{ id?: string; 'aria-labelledby'?: string }>, {
        id,
        'aria-labelledby': `${id}-label`,
      })
    : children
  return (
    <div className="space-y-1.5">
      <Label id={`${id}-label`} htmlFor={directControl ? id : undefined} required={required}>{label}</Label>
      {directControl ? content : <div role="group" aria-labelledby={`${id}-label`}>{content}</div>}
    </div>
  )
}

export function Section({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="form-section space-y-5 p-5 md:p-7">
      <header>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
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
            aria-pressed={active}
            className={cn(
              'min-h-11 rounded-full px-4 text-sm transition-all',
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
            aria-pressed={active}
            className={cn(
              'min-h-11 rounded-full px-3.5 text-sm transition-all',
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
            aria-pressed={active}
            className={cn(
              'h-11 w-11 rounded-md text-sm transition-all border-[1.5px]',
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
            aria-pressed={active}
            className={cn(
              'min-h-11 rounded-full px-3.5 text-sm transition-all',
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
            aria-pressed={active}
            className={cn(
              'min-h-11 flex-1 rounded-md text-sm transition-all border-[1.5px]',
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
  value, propertyType, onToggle,
}: { value: string[]; propertyType: PropertyType; onToggle: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {amenitiesForPropertyType(propertyType).map(a => {
        const active = value.includes(a.key)
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onToggle(a.key)}
            aria-pressed={active}
            className={cn(
              'min-h-11 rounded-full px-3.5 text-sm transition-all',
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

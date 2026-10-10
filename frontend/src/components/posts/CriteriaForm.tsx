import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LOCATION_PRESETS, type LocationPreset } from '@/lib/locations'
import { type PropertyType } from '@/lib/propertyType'
import {
  amenitiesForPropertyType,
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
import { localizedError, useLanguage } from '@/lib/language'

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
  const { t, language } = useLanguage()
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
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [submitting, setSubmitting] = useState(false)

  const min = priceMin ? Number(priceMin) : NaN
  const max = priceMax ? Number(priceMax) : NaN
  const radius = Number(radiusKm)
  const areaNum = areaSqmMin ? Number(areaSqmMin) : null
  const yearMin = yearBuiltMin ? Number(yearBuiltMin) : null
  const fMin = floorMin ? Number(floorMin) : null
  const fMax = floorMax ? Number(floorMax) : null
  const isResidential = type === 'apartment' || type === 'house'
  const isApartment = type === 'apartment'

  const floorRangeOk =
    fMin == null || fMax == null || fMin <= fMax
  const floorValuesOk = [fMin, fMax].every(value => value === null || (
    Number.isInteger(value) && value >= -5 && value <= 200
  ))

  const canSubmit =
    title.trim().length > 0 &&
    location !== null &&
    Number.isFinite(radius) && radius >= 1 && radius <= 500 &&
    Number.isFinite(min) && min >= 0 &&
    Number.isFinite(max) && max > 0 &&
    min < max &&
    (areaNum === null || (Number.isFinite(areaNum) && areaNum > 0)) &&
    (!isResidential || yearMin === null || (Number.isInteger(yearMin) && yearMin >= 1500 && yearMin <= CURRENT_YEAR + 5)) &&
    (!isResidential || (Number.isInteger(Number(bedroomsMin)) && Number.isInteger(Number(bathroomsMin)))) &&
    (!isApartment || (floorRangeOk && floorValuesOk))

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
    if (!canSubmit || !location) {
      const issues = [
        !title.trim() && t('título', 'title'),
        !location && t('localização pretendida', 'preferred location'),
        (!Number.isFinite(radius) || radius < 1 || radius > 500) && t('raio de pesquisa', 'search radius'),
        (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max <= 0 || min >= max) && t('intervalo de orçamento', 'budget range'),
        areaNum !== null && (!Number.isFinite(areaNum) || areaNum <= 0) && t('área mínima', 'minimum area'),
        isResidential && yearMin !== null && (!Number.isInteger(yearMin) || yearMin < 1500 || yearMin > CURRENT_YEAR + 5) && t('ano de construção', 'year built'),
        isApartment && (!floorRangeOk || !floorValuesOk) && t('intervalo de andares', 'floor range'),
      ].filter(Boolean)
      setError(t(`Verifique ${issues.join(', ') || 'os campos assinalados'} antes de continuar.`, `Please check ${issues.join(', ') || 'the highlighted fields'} before continuing.`))
      requestAnimationFrame(() => errorRef.current?.focus())
      return
    }
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
        bedroomsMin: isResidential ? parseInt(bedroomsMin, 10) : 0,
        bathroomsMin: isResidential ? parseInt(bathroomsMin, 10) : 0,
        areaSqmMin: areaNum && areaNum > 0 ? areaNum : null,
        yearBuiltMin: isResidential ? yearMin : null,
        conditions: isResidential && conditions.length > 0 ? conditions : null,
        floorMin: isApartment ? fMin : null,
        floorMax: isApartment ? fMax : null,
        requiresBalcony: isResidential ? requiresBalcony : null,
        requiresCentralHeating: isResidential ? requiresCentralHeating : null,
        requiredAmenities: requiredAmenities.filter(key => amenitiesForPropertyType(type).some(item => item.key === key)),
      })
    } catch (err) {
      setError(localizedError(err, language, 'Não foi possível publicar os critérios. Tente novamente.', 'Something went wrong'))
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
      {intro && <div className="mb-7">{intro}</div>}
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="mb-5 rounded bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <Section title={t('Dados básicos', 'Basics')}>
        <Field label={t('Título', 'Title')} required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('ex.: Moradia familiar em Cascais', 'e.g. Family home in Cascais')}
            maxLength={200}
          />
        </Field>

        <Field label={t('Tipo de imóvel', 'Property type')} required>
          <PropertyTypePicker value={type} onChange={setType} />
        </Field>

        <Field label={t('Localização pretendida', 'Preferred location')} required>
          <div className="space-y-3">
            <LocationPicker value={location} onChange={setLocation} />
            <AddressAutocomplete
              value={location?.label ?? ''}
              onPick={(r: GeocodeResult) => setLocation({ label: r.label, lat: r.lat, lng: r.lng })}
              onEdit={() => setLocation(null)}
              placeholder={t('Ou escreva uma localização (ex.: Cascais)', 'Or type an address (e.g. Cascais)')}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">{t('Os vendedores elegíveis veem uma área aproximada. Não inclua moradas privadas no título nem na descrição.', 'Eligible sellers see an approximate area. Keep any private address out of the title and description.')}</p>
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

        <Field label={t('Raio de pesquisa (km)', 'Search radius (km)')} required>
          <Input
            type="number"
            inputMode="numeric"
            value={radiusKm}
            onChange={e => setRadiusKm(e.target.value)}
            min={1}
            max={500}
          />
        </Field>

        <Field label={t('Orçamento (€)', 'Budget (€)')} required>
          <div className="flex items-center gap-3">
            <Input
              aria-label={t('Orçamento mínimo em euros', 'Minimum budget in euros')}
              type="number"
              inputMode="numeric"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              placeholder={t('Mín.', 'Min')}
              min={0}
              required
            />
            <span className="text-muted-foreground">–</span>
            <Input
              aria-label={t('Orçamento máximo em euros', 'Maximum budget in euros')}
              type="number"
              inputMode="numeric"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              placeholder={t('Máx.', 'Max')}
              min={1}
              required
            />
          </div>
          {priceMin && priceMax && min >= max && (
            <p className="mt-1 text-xs text-destructive">{t('O mínimo deve ser inferior ao máximo.', 'Min must be less than max.')}</p>
          )}
        </Field>
      </Section>

      <Section title={isResidential ? t('Divisões e área', 'Rooms and area') : t('Área', 'Area')}>
        {isResidential && <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <Field label={t('Quartos, mínimo', 'Min bedrooms')}>
            <CountPicker options={['0', '1', '2', '3', '4', '5']} value={bedroomsMin} onChange={setBedroomsMin} />
          </Field>
          <Field label={t('Casas de banho, mínimo', 'Min bathrooms')}>
            <CountPicker options={['1', '2', '3', '4']} value={bathroomsMin} onChange={setBathroomsMin} />
          </Field>
        </div>}

        <Field label={t('Área mínima (m²)', 'Min area (m²)')}>
          <Input
            type="number"
            inputMode="numeric"
            value={areaSqmMin}
            onChange={e => setAreaSqmMin(e.target.value)}
            placeholder={t('ex.: 90', 'e.g. 90')}
            min={1}
          />
        </Field>
      </Section>

      {isResidential && <Section title={t('Preferências opcionais', 'Optional preferences')} subtitle={t('Deixe em branco se não tiver preferência', "Leave blank if you don't mind")}>
        <Field label={t('Construído a partir de', 'Built no earlier than')}>
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

        <Field label={t('Estados aceitáveis', 'Acceptable conditions')}>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_CONDITIONS.map(c => {
              const active = conditions.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  aria-pressed={active}
                  className={cn(
                    'min-h-11 rounded px-3.5 text-sm transition-colors',
                    active
                      ? 'bg-primary text-white font-semibold'
                      : 'border border-border bg-surface text-foreground hover:border-primary-400',
                  )}
                >
                  {PROPERTY_CONDITION_LABEL[c]}
                </button>
              )
            })}
          </div>
        </Field>

        {isApartment && <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <Field label={t('Andar mínimo', 'Floor min')}>
            <Input
              type="number"
              inputMode="numeric"
              value={floorMin}
              onChange={e => setFloorMin(e.target.value)}
              placeholder={t('ex.: 1', 'e.g. 1')}
              min={-5}
              max={200}
              step={1}
            />
          </Field>
          <Field label={t('Andar máximo', 'Floor max')}>
            <Input
              type="number"
              inputMode="numeric"
              value={floorMax}
              onChange={e => setFloorMax(e.target.value)}
              placeholder={t('ex.: 4', 'e.g. 4')}
              min={-5}
              max={200}
              step={1}
            />
          </Field>
        </div>}
        {isApartment && !floorRangeOk && (
          <p className="text-xs text-destructive">{t('O andar mínimo deve ser igual ou inferior ao máximo.', 'Floor min must be ≤ floor max.')}</p>
        )}
        {isApartment && !floorValuesOk && (
          <p className="text-xs text-destructive">{t('Os andares devem ser números inteiros entre −5 e 200.', 'Floors must be whole numbers from −5 to 200.')}</p>
        )}

        <Field label={t('Varanda', 'Balcony')}>
          <RequirementPicker value={requiresBalcony} onChange={setRequiresBalcony} />
        </Field>
        <Field label={t('Aquecimento central', 'Central heating')}>
          <RequirementPicker value={requiresCentralHeating} onChange={setRequiresCentralHeating} />
        </Field>

      </Section>}

      <Section title={t('Comodidades essenciais', 'Required amenities')} subtitle={t('Selecione apenas o que é indispensável', 'Select only your deal-breakers')}>
        <div className="flex flex-wrap gap-2">
          {amenitiesForPropertyType(type).map(a => {
            const active = requiredAmenities.includes(a.key)
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAmenity(a.key)}
                aria-pressed={active}
                className={cn(
                  'min-h-11 rounded px-3.5 text-sm transition-colors',
                  active
                    ? 'bg-primary text-white font-semibold'
                    : 'border border-border bg-surface text-foreground hover:border-primary-400',
                )}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={t('Notas', 'Notes')}>
        <Field label={t('Há mais alguma coisa que os vendedores devam saber?', 'Anything else sellers should know?')}>
          <Textarea
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('Escolas, estacionamento, prazo, necessidades…', 'Schools, parking, timeline, deal-breakers…')}
            maxLength={2000}
          />
        </Field>
      </Section>

      <Button
        type="submit"
        size="lg"
        className="mt-7 min-h-12 w-full sm:w-auto sm:min-w-48"
        disabled={submitting}
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
      </Button>
    </form>
  )
}

function RequirementPicker({
  value, onChange,
}: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex gap-2">
      {([
        { v: null, label: t('Indiferente', "Don't mind") },
        { v: true, label: t('Indispensável', 'Must have') },
      ] as const).map(opt => {
        const active = value === opt.v
        return (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
          aria-pressed={active}
            className={cn(
              'min-h-11 flex-1 rounded border text-sm transition-colors',
              active
                ? 'border-primary bg-primary-100 text-primary font-semibold'
                : 'border-border bg-surface text-foreground hover:border-primary-400',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

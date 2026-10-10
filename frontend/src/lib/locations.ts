import portugalAreas from '@/lib/portugalAdministrativeAreas.json'
import type { Language } from '@/lib/language'

export interface LocationPreset {
  label: string
  lat: number
  lng: number
}

export const LOCATION_PRESETS: LocationPreset[] = [
  { label: 'Lisboa, Portugal',   lat: 38.7223, lng: -9.1393 },
  { label: 'Porto, Portugal',    lat: 41.1579, lng: -8.6291 },
  { label: 'Cascais, Portugal',  lat: 38.6968, lng: -9.4215 },
  { label: 'Sintra, Portugal',   lat: 38.7980, lng: -9.3878 },
  { label: 'Braga, Portugal',    lat: 41.5454, lng: -8.4265 },
  { label: 'Coimbra, Portugal',  lat: 40.2033, lng: -8.4103 },
  { label: 'Faro, Portugal',     lat: 37.0194, lng: -7.9304 },
  { label: 'Funchal, Madeira',   lat: 32.6669, lng: -16.9241 },
]

/** Never render an arbitrary stored geocoder label on a public surface. */
const safeLocalities = new Map<string, string>()
const normalized = (value: string) => value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-PT')

const localityGroups = [
  { label: 'Lisboa, Portugal', aliases: ['lisboa', 'lisbon'] },
  { label: 'Porto, Portugal', aliases: ['porto'] },
  { label: 'Cascais, Portugal', aliases: ['cascais'] },
  { label: 'Sintra, Portugal', aliases: ['sintra'] },
  { label: 'Braga, Portugal', aliases: ['braga'] },
  { label: 'Coimbra, Portugal', aliases: ['coimbra'] },
  { label: 'Faro, Portugal', aliases: ['faro'] },
  { label: 'Aveiro, Portugal', aliases: ['aveiro'] },
  { label: 'Lagos, Portugal', aliases: ['lagos'] },
  { label: 'Évora, Portugal', aliases: ['évora', 'evora'] },
  { label: 'Funchal, Madeira', aliases: ['funchal'] },
] as const

for (const { label, aliases } of localityGroups) {
  for (const alias of aliases) safeLocalities.set(normalized(alias), label)
}
for (const municipality of Object.values(portugalAreas.municipalitiesByArea).flat()) {
  const key = normalized(municipality)
  if (!safeLocalities.has(key)) safeLocalities.set(key, `${municipality}, Portugal`)
}
for (const area of [...portugalAreas.districts, ...portugalAreas.autonomousRegions]) {
  const key = normalized(area)
  if (!safeLocalities.has(key)) safeLocalities.set(key, `${area}, Portugal`)
}

/** Localize only an approved locality; unknown address fragments are discarded. */
export function publicLocationLabel(value: string, language: Language): string {
  const parts = value.split(',').map(normalized).filter(Boolean)
  let label: string | undefined
  for (const part of parts) {
    label = safeLocalities.get(part)
    if (label) break
  }
  label ??= parts.includes('portugal') ? 'Portugal' : 'Zona aproximada'
  if (language === 'en') {
    if (label === 'Lisboa, Portugal') return 'Lisbon, Portugal'
    if (label === 'Açores, Portugal') return 'Azores, Portugal'
    if (label === 'Zona aproximada') return 'Approximate area'
  }
  return label
}

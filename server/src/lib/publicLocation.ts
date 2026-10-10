import portugalAreas from './portugalAdministrativeAreas.json' with { type: 'json' }

/** Public cards and maps show a neighbourhood scale, never stored precise coordinates. */
export function publicCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

export const PORTUGAL_AREAS = portugalAreas

export function normalizedPlaceName(value: string): string {
  return value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-PT')
}

// A geocoder label is arbitrary text. Only publish localities we explicitly know;
// slicing comma-delimited labels can leave a street or building name visible.
const localityGroups = [
  { label: 'Lisboa, Portugal', aliases: ['lisbon', 'lisboa'] },
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

const publicLocalities = new Map<string, string>()
const knownMunicipalities = new Map<string, string>()
const knownAreas = new Map<string, string>()

for (const { label, aliases } of localityGroups) {
  for (const alias of aliases) publicLocalities.set(normalizedPlaceName(alias), label)
}

for (const municipality of Object.values(PORTUGAL_AREAS.municipalitiesByArea).flat()) {
  const key = normalizedPlaceName(municipality)
  knownMunicipalities.set(key, municipality)
  if (!publicLocalities.has(key)) publicLocalities.set(key, `${municipality}, Portugal`)
}

for (const area of [...PORTUGAL_AREAS.districts, ...PORTUGAL_AREAS.autonomousRegions]) {
  const key = normalizedPlaceName(area)
  knownAreas.set(key, area)
  if (!publicLocalities.has(key)) publicLocalities.set(key, `${area}, Portugal`)
}

/** Only exact city names (or their public labels) can search stored geocoder text. */
export function publicLocalitySearchAliases(value: string): readonly string[] | undefined {
  const term = normalizedPlaceName(value)
  const existing = localityGroups.find(({ label, aliases }) =>
    normalizedPlaceName(label) === term || aliases.some((alias) =>
      normalizedPlaceName(alias) === term || normalizedPlaceName(`${alias}, Portugal`) === term)
  )
  if (existing) return existing.aliases
  const name = knownMunicipalities.get(term) ?? knownAreas.get(term)
  if (!name) return undefined
  const ascii = name.normalize('NFD').replace(/\p{M}/gu, '')
  return name === ascii ? [name] : [name, ascii]
}

/** Publish a known city or a country, never free-form address fragments. */
export function publicLocationText(value: string): string {
  const parts = value.split(',').map(normalizedPlaceName).filter(Boolean)
  for (const part of parts) {
    const locality = publicLocalities.get(part)
    if (locality) return locality
  }
  return parts.includes('portugal') ? 'Portugal' : 'Zona aproximada'
}

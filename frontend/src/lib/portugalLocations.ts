import administrativeAreas from './portugalAdministrativeAreas.json'

// Names are from GEO API PT's district/municipality index (accessed 2026-10-09).
// DGT's CAOP2025 is the official administrative boundary reference. Keep this
// static index in sync with the server copy when the administrative data changes.
// https://geoapi.pt/distritos/municipios
// https://www.dgterritorio.gov.pt/atividades/cartografia/cartografia-tematica/caop?language=pt

export type PortugalLocationSelection = {
  type: 'district' | 'municipality'
  name: string
  /** Mainland district, or autonomous region for island municipalities. */
  district?: string
}

export type PortugalLocationSuggestion = PortugalLocationSelection & {
  id: string
  detail: string
}

export const PORTUGAL_DISTRICTS = administrativeAreas.districts

export const PORTUGAL_MUNICIPALITIES: PortugalLocationSuggestion[] = Object.entries(administrativeAreas.municipalitiesByArea).flatMap(([area, names]) => {
  const region = (administrativeAreas.islandRegions as Record<string, string>)[area]
  const district = region ?? area
  return names.map((name, index) => ({
    id: `municipality-${area}-${index}`,
    type: 'municipality' as const,
    name,
    district,
    detail: region ? `Municipality · ${area}, ${region}` : `Municipality · ${area}`,
  }))
})

const districtSuggestions: PortugalLocationSuggestion[] = PORTUGAL_DISTRICTS.map(name => ({
  id: `district-${name}`,
  type: 'district',
  name,
  detail: 'District',
}))

const regionSuggestions: PortugalLocationSuggestion[] = administrativeAreas.autonomousRegions.map(name => ({
  id: `region-${name}`,
  type: 'district',
  name,
  detail: 'Autonomous region',
}))

const allSuggestions = [...districtSuggestions, ...regionSuggestions, ...PORTUGAL_MUNICIPALITIES]
const collator = new Intl.Collator('pt', { sensitivity: 'base' })

export function normalizePortugalLocation(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt').trim()
}

/** Search all 18 districts, 2 autonomous regions and 308 municipalities without a network request. */
export function searchPortugalLocations(query: string, limit = 20): PortugalLocationSuggestion[] {
  const normalized = normalizePortugalLocation(query)
  if (!normalized) return [...districtSuggestions, ...regionSuggestions].slice(0, limit)

  const searchable = normalized === 'lisbon' ? 'lisboa' : normalized
  return allSuggestions
    .filter(option => normalizePortugalLocation(option.name).includes(searchable))
    .sort((a, b) => {
      const aName = normalizePortugalLocation(a.name)
      const bName = normalizePortugalLocation(b.name)
      const score = (name: string) => name === searchable ? 0 : name.startsWith(searchable) ? 1 : name.split(/[\s-]+/).some(word => word.startsWith(searchable)) ? 2 : 3
      return score(aName) - score(bName) || (a.type === b.type ? 0 : a.type === 'district' ? -1 : 1) || collator.compare(a.name, b.name)
    })
    .slice(0, limit)
}

import { GraphQLError } from 'graphql'
import { and, gte, ilike, lte, or, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import { PORTUGAL_AREAS, normalizedPlaceName, publicLocalitySearchAliases } from './publicLocation.js'

export type MapBounds = { north: number; south: number; east: number; west: number }

export function searchPage(limit = 20, offset = 0) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(offset) || offset < 0) {
    throw new GraphQLError('Invalid search page', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  return { limit: Math.min(limit, 200), offset }
}

export function assertFilterRange(min: number | null | undefined, max: number | null | undefined, label: string) {
  if ((min != null && (!Number.isFinite(min) || min < 0)) ||
      (max != null && (!Number.isFinite(max) || max < 0)) ||
      (min != null && max != null && min > max)) {
    throw new GraphQLError(`Invalid ${label} range`, { extensions: { code: 'BAD_USER_INPUT' } })
  }
}

export function publicMapCoordinate(column: AnyColumn): SQL<number> {
  return sql<number>`ROUND(${column}::numeric, 2)::double precision`
}

export function boundsCondition(bounds: MapBounds | null | undefined, lat: AnyColumn | SQL<number>, lng: AnyColumn | SQL<number>): SQL | undefined {
  if (!bounds) return undefined
  const { north, south, east, west } = bounds
  if (
    ![north, south, east, west].every(Number.isFinite) ||
    north > 90 || south < -90 || north < south ||
    east > 180 || east < -180 || west > 180 || west < -180
  ) {
    throw new GraphQLError('Invalid map bounds', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  const latSql = sql<number>`${lat}`
  const lngSql = sql<number>`${lng}`
  const longitude = west <= east
    ? and(gte(lngSql, west), lte(lngSql, east))
    : or(gte(lngSql, west), lte(lngSql, east)) // viewport crosses the antimeridian
  return and(gte(latSql, south), lte(latSql, north), longitude)
}

export function textCondition(search: string | null | undefined, ...columns: AnyColumn[]): SQL | undefined {
  const term = search?.trim()
  if (!term) return undefined
  if (term.length > 120) {
    throw new GraphQLError('Search text is too long', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  // Escape LIKE metacharacters so the user searches for literal text.
  const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`
  return or(...columns.map((column) => ilike(column, pattern)), sql`false`)
}

/** Match only a known public locality segment, never arbitrary address text. */
export function publicLocalitySearchCondition(search: string | null | undefined, locationText: AnyColumn): SQL | undefined {
  const aliases = search ? publicLocalitySearchAliases(search) : undefined
  if (!aliases) return undefined
  return exactLocationSegments(aliases, locationText)
}

const municipalitiesByArea = PORTUGAL_AREAS.municipalitiesByArea as Record<string, string[]>
const islandRegions = PORTUGAL_AREAS.islandRegions as Record<string, string>
const administrativeRegions = [...PORTUGAL_AREAS.districts, ...PORTUGAL_AREAS.autonomousRegions]
const allMunicipalities = Object.values(municipalitiesByArea).flat()
const municipalityAreas = new Map<string, string[]>()

for (const [area, municipalities] of Object.entries(municipalitiesByArea)) {
  for (const municipality of municipalities) {
    const key = normalizedPlaceName(municipality)
    municipalityAreas.set(key, [...(municipalityAreas.get(key) ?? []), area])
  }
}

function regionForArea(area: string): string {
  return islandRegions[area] ?? area
}

function regionMarkers(region: string): string[] {
  return [region, ...Object.keys(islandRegions).filter((area) => islandRegions[area] === region)]
}

/** Match complete comma-delimited geocoder segments, never an arbitrary street substring. */
function exactLocationSegments(names: readonly string[], locationText: AnyColumn): SQL {
  const aliases = [...new Set(names.flatMap((name) => {
    const ascii = name.normalize('NFD').replace(/\p{M}/gu, '')
    return name === ascii ? [name] : [name, ascii]
  }))]
  const escaped = aliases.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return sql`${locationText} ~* ${`(^|,)[[:space:]]*(${escaped.join('|')})[[:space:]]*(,|$)`}`
}

/** Validated district/municipality search over public location names only. */
export function publicAdministrativeLocationCondition(
  district: string | null | undefined,
  municipality: string | null | undefined,
  locationText: AnyColumn,
): SQL | undefined {
  if (district == null && municipality == null) return undefined
  const region = district == null ? undefined : administrativeRegions.find((name) =>
    normalizedPlaceName(name) === normalizedPlaceName(district)
  )
  if (district != null && !region) {
    throw new GraphQLError('Unknown district or autonomous region', { extensions: { code: 'BAD_USER_INPUT' } })
  }

  const selectedMunicipality = municipality == null ? undefined : allMunicipalities.find((name) =>
    normalizedPlaceName(name) === normalizedPlaceName(municipality)
  )
  if (municipality != null && !selectedMunicipality) {
    throw new GraphQLError('Unknown municipality', { extensions: { code: 'BAD_USER_INPUT' } })
  }

  if (selectedMunicipality) {
    const areas = municipalityAreas.get(normalizedPlaceName(selectedMunicipality)) ?? []
    if (region && !areas.some((area) => regionForArea(area) === region)) {
      throw new GraphQLError('Municipality is outside the selected region', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    if (areas.length > 1 && !region) {
      throw new GraphQLError('Select a district or region for this municipality', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    const municipalityCondition = exactLocationSegments([selectedMunicipality], locationText)
    return areas.length > 1 && region
      ? and(municipalityCondition, exactLocationSegments(regionMarkers(region), locationText))!
      : municipalityCondition
  }

  if (!region) return undefined
  const includedAreas = Object.keys(municipalitiesByArea).filter((area) => regionForArea(area) === region)
  const allNames = includedAreas.flatMap((area) => municipalitiesByArea[area])
  const uniqueNames = allNames.filter((name) => (municipalityAreas.get(normalizedPlaceName(name))?.length ?? 0) === 1)
  const markerCondition = exactLocationSegments(regionMarkers(region), locationText)
  // Shared municipality names (Lagoa and Calheta) require the region marker;
  // otherwise a district search could include a listing from another region.
  return or(markerCondition, exactLocationSegments(uniqueNames, locationText))!
}

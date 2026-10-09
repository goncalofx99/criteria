import { GraphQLError } from 'graphql'
import { and, gte, ilike, lte, or, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import { publicLocalitySearchAliases } from './publicLocation.js'

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

/** Match only a public city segment, never arbitrary address text. */
export function publicLocalitySearchCondition(search: string | null | undefined, locationText: AnyColumn): SQL | undefined {
  const aliases = search ? publicLocalitySearchAliases(search) : undefined
  if (!aliases) return undefined
  return or(...aliases.map((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return sql`${locationText} ~* ${`(^|,)[[:space:]]*${escaped}[[:space:]]*(,|$)`}`
  }))
}

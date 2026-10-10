import { describe, expect, it } from 'vitest'
import { GraphQLError } from 'graphql'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sellerPosts } from '../db/schema.js'
import { boundsCondition, searchPage, textCondition } from './search.js'
import { PORTUGAL_AREAS, publicCoordinate, publicLocationText, publicLocalitySearchAliases } from './publicLocation.js'
import { sellerWhere } from '../schema/resolvers/sellerPost.js'
import { buyerWhere } from '../schema/resolvers/buyerPost.js'

const dialect = new PgDialect()

describe('search inputs', () => {
  it('covers Portugal’s 308 municipalities, mainland districts, and autonomous regions', () => {
    expect(Object.values(PORTUGAL_AREAS.municipalitiesByArea).flat()).toHaveLength(308)
    expect(PORTUGAL_AREAS.districts).toHaveLength(18)
    expect(PORTUGAL_AREAS.autonomousRegions).toEqual(['Açores', 'Madeira'])
  })

  it('caps page size and rejects negative offsets', () => {
    expect(searchPage(500, 20)).toEqual({ limit: 200, offset: 20 })
    expect(() => searchPage(20, -1)).toThrow(GraphQLError)
  })

  it('supports map bounds across the antimeridian', () => {
    const bounds = boundsCondition({ north: 40, south: -40, west: 170, east: -170 }, sellerPosts.lat, sellerPosts.lng)!
    const query = dialect.sqlToQuery(bounds)
    expect(query.sql).toContain(' or ')
    expect(query.params).toEqual([-40, 40, 170, -170])
  })

  it('rejects impossible map bounds', () => {
    expect(() => boundsCondition({ north: 0, south: 10, west: -10, east: 10 }, sellerPosts.lat, sellerPosts.lng)).toThrow(GraphQLError)
  })

  it('treats wildcard characters as literal search text', () => {
    const query = dialect.sqlToQuery(textCondition('50%_off', sellerPosts.title)!)
    expect(query.params[0]).toBe('%50\\%\\_off%')
  })

  it('does not use private address text for arbitrary property or buyer-request searches', () => {
    for (const where of [sellerWhere(undefined, 'Rua Augusta'), buyerWhere(undefined, 'Rua Augusta')]) {
      const query = dialect.sqlToQuery(where)
      expect(query.sql).not.toContain('location_text')
      expect(query.params).toContain('%Rua Augusta%')
    }
  })

  it('can search known public cities without matching an arbitrary address fragment', () => {
    for (const where of [sellerWhere(undefined, 'Lisbon'), buyerWhere(undefined, 'Lisbon')]) {
      const query = dialect.sqlToQuery(where)
      expect(query.sql).toContain('location_text')
      expect(query.params).toContain('(^|,)[[:space:]]*(lisbon|lisboa)[[:space:]]*(,|$)')
    }
  })

  it('searches all municipalities in a selected district without exposing street text', () => {
    const query = dialect.sqlToQuery(sellerWhere(undefined, undefined, undefined, { district: 'Braga' }))
    expect(query.params).toContain(true)
    expect(query.params.join(' ')).toContain('Guimarães')
    expect(query.params.join(' ')).toContain('Vila Nova de Famalicão')
    expect(query.params.some((param) => String(param).includes('Rua'))).toBe(false)
  })

  it('narrows a selected municipality and validates its parent district', () => {
    const query = dialect.sqlToQuery(sellerWhere(undefined, undefined, undefined, {
      district: 'Faro', municipality: 'Lagos',
    }))
    expect(query.params).toContain('(^|,)[[:space:]]*(Lagos)[[:space:]]*(,|$)')
    expect(query.params.some((param) => String(param).includes('Portimão'))).toBe(false)
    expect(() => sellerWhere(undefined, undefined, undefined, { district: 'Braga', municipality: 'Lagos' }))
      .toThrowError(expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } }))
    expect(() => sellerWhere(undefined, undefined, undefined, { district: 'Unknown district' }))
      .toThrowError(expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } }))
  })

  it('requires a region when a municipality name is shared', () => {
    expect(() => sellerWhere(undefined, undefined, undefined, { municipality: 'Lagoa' }))
      .toThrowError(expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } }))
    const query = dialect.sqlToQuery(sellerWhere(undefined, undefined, undefined, {
      district: 'Açores', municipality: 'Lagoa',
    }))
    expect(query.sql).toContain(' and ')
    expect(query.params).toContain('(^|,)[[:space:]]*(Lagoa)[[:space:]]*(,|$)')
    expect(query.params.join(' ')).toContain('Açores')
  })

  it('recognizes municipality names as free-text locality searches', () => {
    const query = dialect.sqlToQuery(sellerWhere(undefined, 'Guimarães'))
    expect(query.params).toContain('(^|,)[[:space:]]*(Guimarães|Guimaraes)[[:space:]]*(,|$)')
    expect(query.params).toContain('%Guimarães%')
  })
})

describe('public location', () => {
  it('returns a coarse location for non-owners', () => {
    expect(publicCoordinate(38.722321)).toBe(38.72)
    expect(publicLocationText('Rua Augusta 100, Lisboa, Portugal')).toBe('Lisboa, Portugal')
    expect(publicLocationText('Rua Augusta 100')).toBe('Zona aproximada')
    expect(publicLocationText('Apartment 2, Rua Augusta, Lisboa')).toBe('Lisboa, Portugal')
    expect(publicLocationText('Alameda das Linhas de Torres')).toBe('Zona aproximada')
    expect(publicLocationText('Apartment 2, Rua Augusta, Unknown City')).toBe('Zona aproximada')
    expect(publicLocationText('Apartment 2, Rua Augusta, Unknown City, Portugal')).toBe('Portugal')
    expect(publicLocationText('__proto__')).toBe('Zona aproximada')
    expect(publicLocationText('Rua de Santa Maria, Guimarães, Braga, Portugal')).toBe('Guimarães, Portugal')
    expect(publicLocalitySearchAliases('Lisbon, Portugal')).toContain('lisboa')
    expect(publicLocalitySearchAliases('Lisboa, Portugal')).toContain('lisbon')
  })
})

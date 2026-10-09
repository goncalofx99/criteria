import { describe, expect, it } from 'vitest'
import { GraphQLError } from 'graphql'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sellerPosts } from '../db/schema.js'
import { boundsCondition, searchPage, textCondition } from './search.js'
import { publicCoordinate, publicLocationText } from './publicLocation.js'
import { sellerWhere } from '../schema/resolvers/sellerPost.js'
import { buyerWhere } from '../schema/resolvers/buyerPost.js'

const dialect = new PgDialect()

describe('search inputs', () => {
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
      expect(query.params).toContain('(^|,)[[:space:]]*lisbon[[:space:]]*(,|$)')
      expect(query.params).toContain('(^|,)[[:space:]]*lisboa[[:space:]]*(,|$)')
    }
  })
})

describe('public location', () => {
  it('returns a coarse location for non-owners', () => {
    expect(publicCoordinate(38.722321)).toBe(38.72)
    expect(publicLocationText('Rua Augusta 100, Lisboa, Portugal')).toBe('Lisbon, Portugal')
    expect(publicLocationText('Rua Augusta 100')).toBe('Approximate area')
    expect(publicLocationText('Apartment 2, Rua Augusta, Lisboa')).toBe('Lisbon, Portugal')
    expect(publicLocationText('Alameda das Linhas de Torres')).toBe('Approximate area')
    expect(publicLocationText('Apartment 2, Rua Augusta, Unknown City')).toBe('Approximate area')
    expect(publicLocationText('Apartment 2, Rua Augusta, Unknown City, Portugal')).toBe('Portugal')
    expect(publicLocationText('__proto__')).toBe('Approximate area')
  })
})

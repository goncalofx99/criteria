import { expect, it } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { requiredAmenitiesCondition } from './matching.js'

const dialect = new PgDialect()

it('creates a PostgreSQL text array for required-amenity matching', () => {
  const query = dialect.sqlToQuery(requiredAmenitiesCondition(['pool', 'parking']))
  expect(query.sql).toContain('ARRAY[$1, $2]::text[] @>')
  expect(query.params).toEqual(['pool', 'parking'])
})

it('requires no amenities when the seller has none', () => {
  const query = dialect.sqlToQuery(requiredAmenitiesCondition([]))
  expect(query.sql).toContain('cardinality(')
  expect(query.params).toEqual([])
})

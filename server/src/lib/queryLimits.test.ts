import { describe, expect, it } from 'vitest'
import { buildSchema, parse, validate } from 'graphql'
import { queryLimitsRule } from './queryLimits.js'

const schema = buildSchema('type Query { node: Node } type Node { child: Node, value: String }')
const errors = (query: string) => validate(schema, parse(query), [queryLimitsRule])

describe('GraphQL operation limits', () => {
  it('accepts a normal nested selection', () => {
    expect(errors('{ node { child { value } } }')).toHaveLength(0)
  })

  it('rejects large alias fan-out and deep nesting', () => {
    const aliases = Array.from({ length: 11 }, (_, i) => `n${i}: node { value }`).join(' ')
    expect(errors(`{ ${aliases} }`)).toHaveLength(1)
    const deep = `{ node ${'{ child '.repeat(8)}value ${'}'.repeat(8)} }`
    expect(errors(deep)).toHaveLength(1)
  })

  it('counts the cost of a fragment every time it is spread', () => {
    const spread = Array.from({ length: 11 }, () => '...Part').join(' ')
    expect(errors(`{ ${spread} } fragment Part on Query { node { value } }`)).toHaveLength(1)
  })
})

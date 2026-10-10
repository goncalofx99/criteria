import { describe, expect, it } from 'vitest'
import { PORTUGAL_DISTRICTS, PORTUGAL_MUNICIPALITIES, searchPortugalLocations } from './portugalLocations'

describe('Portugal home search locations', () => {
  it('covers mainland districts and all 308 municipalities, including islands', () => {
    expect(PORTUGAL_DISTRICTS).toHaveLength(18)
    expect(PORTUGAL_MUNICIPALITIES).toHaveLength(308)
    expect(PORTUGAL_MUNICIPALITIES.filter(place => place.name === 'Calheta').map(place => place.district).sort()).toEqual(['Açores', 'Madeira'])
  })

  it('matches names without accents and keeps districts distinct from municipalities', () => {
    expect(searchPortugalLocations('sao joao da madeira').some(place => place.name === 'São João da Madeira')).toBe(true)
    expect(searchPortugalLocations('Lisboa').slice(0, 2).map(place => place.type)).toEqual(['district', 'municipality'])
  })
})

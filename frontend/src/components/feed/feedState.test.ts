import { describe, expect, it } from 'vitest'
import { readBounds, readBuyerFilters, readPage, readSellerFilters, readSort, writeBounds, writeBuyerFilters, writeSellerFilters } from './feedState'

describe('Explore URLs', () => {
  it('round trips property filters while retaining search and view', () => {
    const params = new URLSearchParams('q=Lisbon&view=map&page=3')
    writeSellerFilters(params, { propertyType: 'house', priceMin: 300000, condition: ['renovated', 'good'], hasBalcony: true })

    expect(params.get('q')).toBe('Lisbon')
    expect(params.get('view')).toBe('map')
    expect(params.has('page')).toBe(false)
    expect(readSellerFilters(params)).toMatchObject({ propertyType: 'house', priceMin: 300000, condition: ['renovated', 'good'], hasBalcony: true })
  })

  it('keeps the two result types independent', () => {
    const params = new URLSearchParams()
    writeSellerFilters(params, { propertyType: 'apartment', priceMax: 500000 })
    writeBuyerFilters(params, { propertyType: 'house', budgetMin: 350000 })
    expect(readSellerFilters(params).propertyType).toBe('apartment')
    expect(readBuyerFilters(params)).toMatchObject({ propertyType: 'house', budgetMin: 350000 })
  })

  it('ignores malformed or impossible bounds instead of sending them to GraphQL', () => {
    const params = new URLSearchParams('north=39&south=38&east=-10&west=-9')
    expect(readBounds(params)).toBeUndefined()
    writeBounds(params, { north: 39, south: 38, east: -8, west: -10 })
    expect(readBounds(params)).toEqual({ north: 39, south: 38, east: -8, west: -10 })
    writeBounds(params)
    expect(readBounds(params)).toBeUndefined()
  })

  it('falls back safely for invalid page and sort parameters', () => {
    const params = new URLSearchParams('page=-3&sort=price_desc')
    expect(readPage(params)).toBe(1)
    expect(readSort(params, 'properties')).toBe('price_desc')
    expect(readSort(params, 'criteria')).toBe('newest')
    params.set('p_price_min', '-1')
    expect(readSellerFilters(params).priceMin).toBeUndefined()
  })
})

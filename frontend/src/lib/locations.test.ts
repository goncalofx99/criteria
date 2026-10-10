import { describe, expect, it } from 'vitest'
import { publicLocationLabel } from './locations'

describe('publicLocationLabel', () => {
  it('uses Portuguese by default and translates safe locality labels for English', () => {
    expect(publicLocationLabel('Rua Augusta 100, Lisboa, Portugal', 'pt')).toBe('Lisboa, Portugal')
    expect(publicLocationLabel('Rua Augusta 100, Lisboa, Portugal', 'en')).toBe('Lisbon, Portugal')
    expect(publicLocationLabel('Lisbon, Portugal', 'pt')).toBe('Lisboa, Portugal')
    expect(publicLocationLabel('Açores, Portugal', 'en')).toBe('Azores, Portugal')
  })

  it('never exposes unrecognized address fragments', () => {
    expect(publicLocationLabel('Rua Augusta 100', 'pt')).toBe('Zona aproximada')
    expect(publicLocationLabel('Apartment 2, Rua Augusta, Unknown City', 'en')).toBe('Approximate area')
    expect(publicLocationLabel('Rua Augusta 100, Unknown City, Portugal', 'en')).toBe('Portugal')
    expect(publicLocationLabel('__proto__', 'pt')).toBe('Zona aproximada')
    expect(publicLocationLabel('Rua de Santa Maria, Guimarães, Braga', 'pt')).toBe('Guimarães, Portugal')
  })
})

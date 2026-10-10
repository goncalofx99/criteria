import { getLanguage } from '@/lib/language'

export type PropertyType = 'apartment' | 'house' | 'land' | 'commercial'

export const PROPERTY_TYPES: PropertyType[] = ['house', 'apartment', 'land', 'commercial']

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  get apartment() { return getLanguage() === 'pt' ? 'Apartamento' : 'Apartment' },
  get house() { return getLanguage() === 'pt' ? 'Moradia' : 'House' },
  get land() { return getLanguage() === 'pt' ? 'Terreno' : 'Land' },
  get commercial() { return getLanguage() === 'pt' ? 'Comercial' : 'Commercial' },
}

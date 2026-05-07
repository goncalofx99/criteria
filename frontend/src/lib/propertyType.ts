export type PropertyType = 'apartment' | 'house' | 'land' | 'commercial'

export const PROPERTY_TYPES: PropertyType[] = ['house', 'apartment', 'land', 'commercial']

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
}

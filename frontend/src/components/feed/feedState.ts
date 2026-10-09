import type { BuyerPostFilterValues } from './CriteriaFilters'
import type { SellerPostFilterValues } from './PropertyFilters'

export type ResultType = 'properties' | 'criteria'
export type ResultView = 'list' | 'map'
export type SellerSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'price_per_sqm_asc' | 'price_per_sqm_desc'
export type BuyerSort = 'newest' | 'oldest' | 'budget_asc' | 'budget_desc'
export interface MapBounds { north: number; south: number; east: number; west: number }

export const SELLER_SORTS: { value: SellerSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'area_desc', label: 'Area: largest first' },
  { value: 'area_asc', label: 'Area: smallest first' },
  { value: 'price_per_sqm_asc', label: 'Price/m²: low to high' },
  { value: 'price_per_sqm_desc', label: 'Price/m²: high to low' },
]

export const BUYER_SORTS: { value: BuyerSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'budget_asc', label: 'Budget: low to high' },
  { value: 'budget_desc', label: 'Budget: high to low' },
]

const PROPERTY_TYPES = ['apartment', 'house', 'land', 'commercial'] as const
const CONDITION_TYPES = ['new', 'renovated', 'good', 'needs_renovation'] as const

function finiteNumber(raw: string | null): number | undefined {
  if (raw == null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function positiveInt(raw: string | null): number | undefined {
  const n = finiteNumber(raw)
  return n !== undefined && Number.isInteger(n) ? n : undefined
}

function csv(raw: string | null): string[] | undefined {
  const values = raw?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  return values.length ? values : undefined
}

export function readSellerFilters(params: URLSearchParams): SellerPostFilterValues {
  const type = params.get('p_type')
  const condition = csv(params.get('p_condition'))?.filter((item): item is NonNullable<SellerPostFilterValues['condition']>[number] =>
    CONDITION_TYPES.includes(item as typeof CONDITION_TYPES[number]))
  return {
    propertyType: PROPERTY_TYPES.includes(type as typeof PROPERTY_TYPES[number]) ? type as SellerPostFilterValues['propertyType'] : undefined,
    priceMin: finiteNumber(params.get('p_price_min')),
    priceMax: finiteNumber(params.get('p_price_max')),
    bedroomsMin: positiveInt(params.get('p_bedrooms')),
    bathroomsMin: positiveInt(params.get('p_bathrooms')),
    areaSqmMin: finiteNumber(params.get('p_area_min')),
    areaSqmMax: finiteNumber(params.get('p_area_max')),
    yearBuiltMin: positiveInt(params.get('p_year')),
    condition: condition?.length ? condition : undefined,
    hasBalcony: params.get('p_balcony') === '1' ? true : undefined,
    hasCentralHeating: params.get('p_heating') === '1' ? true : undefined,
    amenities: csv(params.get('p_amenities')),
  }
}

export function readBuyerFilters(params: URLSearchParams): BuyerPostFilterValues {
  const type = params.get('c_type')
  return {
    propertyType: PROPERTY_TYPES.includes(type as typeof PROPERTY_TYPES[number]) ? type as BuyerPostFilterValues['propertyType'] : undefined,
    budgetMin: finiteNumber(params.get('c_budget_min')),
    budgetMax: finiteNumber(params.get('c_budget_max')),
    bedroomsMin: positiveInt(params.get('c_bedrooms')),
    bathroomsMin: positiveInt(params.get('c_bathrooms')),
    radiusKmMax: finiteNumber(params.get('c_radius')),
  }
}

const SELLER_FILTER_PARAMS: Record<keyof SellerPostFilterValues, string> = {
  propertyType: 'p_type', priceMin: 'p_price_min', priceMax: 'p_price_max', bedroomsMin: 'p_bedrooms',
  bathroomsMin: 'p_bathrooms', areaSqmMin: 'p_area_min', areaSqmMax: 'p_area_max', yearBuiltMin: 'p_year',
  condition: 'p_condition', hasBalcony: 'p_balcony', hasCentralHeating: 'p_heating', amenities: 'p_amenities',
}
const BUYER_FILTER_PARAMS: Record<keyof BuyerPostFilterValues, string> = {
  propertyType: 'c_type', budgetMin: 'c_budget_min', budgetMax: 'c_budget_max', bedroomsMin: 'c_bedrooms',
  bathroomsMin: 'c_bathrooms', radiusKmMax: 'c_radius',
}

function writeValues<T extends object>(params: URLSearchParams, values: T, names: Record<keyof T, string>): void {
  for (const [key, name] of Object.entries(names) as [string, string][]) {
    params.delete(name)
    const value = values[key as keyof T]
    if (Array.isArray(value) && value.length) params.set(name, value.join(','))
    else if (typeof value === 'boolean' && value) params.set(name, '1')
    else if (typeof value === 'number' || typeof value === 'string') params.set(name, String(value))
  }
  params.delete('page')
}

export function writeSellerFilters(params: URLSearchParams, values: SellerPostFilterValues): void {
  writeValues(params, values, SELLER_FILTER_PARAMS)
}

export function writeBuyerFilters(params: URLSearchParams, values: BuyerPostFilterValues): void {
  writeValues(params, values, BUYER_FILTER_PARAMS)
}

export function readBounds(params: URLSearchParams): MapBounds | undefined {
  const north = Number(params.get('north'))
  const south = Number(params.get('south'))
  const east = Number(params.get('east'))
  const west = Number(params.get('west'))
  if ([north, south, east, west].some(v => !Number.isFinite(v))) return undefined
  if (!params.has('north') || !params.has('south') || !params.has('east') || !params.has('west')) return undefined
  if (north <= south || north > 90 || north < -90 || south > 90 || south < -90 || east > 180 || east < -180 || west > 180 || west < -180 || east <= west) return undefined
  return { north, south, east, west }
}

export function writeBounds(params: URLSearchParams, bounds?: MapBounds): void {
  for (const key of ['north', 'south', 'east', 'west']) params.delete(key)
  if (bounds) {
    for (const [key, value] of Object.entries(bounds)) params.set(key, value.toFixed(4))
  }
  params.delete('page')
}

export function readPage(params: URLSearchParams): number {
  const value = positiveInt(params.get('page'))
  return value && value > 0 ? Math.min(value, 10000) : 1
}

export function readSort(params: URLSearchParams, type: ResultType): SellerSort | BuyerSort {
  const value = params.get('sort')
  const options = type === 'properties' ? SELLER_SORTS : BUYER_SORTS
  return options.some(option => option.value === value) ? value as SellerSort | BuyerSort : 'newest'
}

export function cleanFilters<T extends object>(filters: T): T | undefined {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0))
  return entries.length ? Object.fromEntries(entries) as T : undefined
}

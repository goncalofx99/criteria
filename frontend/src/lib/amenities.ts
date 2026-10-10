import { getLanguage } from '@/lib/language'

export type PropertyCondition = 'new' | 'renovated' | 'good' | 'needs_renovation'

export const PROPERTY_CONDITIONS: PropertyCondition[] = [
  'new',
  'renovated',
  'good',
  'needs_renovation',
]

export const PROPERTY_CONDITION_LABEL: Record<PropertyCondition, string> = {
  get new() { return getLanguage() === 'pt' ? 'Construção nova' : 'New build' },
  get renovated() { return getLanguage() === 'pt' ? 'Renovado' : 'Renovated' },
  get good() { return getLanguage() === 'pt' ? 'Bom estado' : 'Good condition' },
  get needs_renovation() { return getLanguage() === 'pt' ? 'A precisar de obras' : 'Needs renovation' },
}

/**
 * Optional amenities — surfaced as multi-select chips on listings and as
 * "must-have" filters on criteria.
 */
export interface AmenityOption {
  key: string
  label: string
}

const AMENITY_NAMES: Record<string, [string, string]> = {
  elevator: ['Elevador', 'Elevator'],
  parking: ['Estacionamento', 'Parking'],
  garage: ['Garagem', 'Garage'],
  air_conditioning: ['Ar condicionado', 'A/C'],
  garden: ['Jardim', 'Garden'],
  pool: ['Piscina', 'Pool'],
  jacuzzi: ['Jacuzzi', 'Jacuzzi'],
  sauna: ['Sauna', 'Sauna'],
  barbecue: ['Churrasqueira', 'Barbecue'],
  fireplace: ['Lareira', 'Fireplace'],
  storage: ['Arrecadação', 'Storage room'],
  gym: ['Ginásio', 'Gym'],
  doorman: ['Porteiro', 'Doorman'],
  furnished: ['Mobilado', 'Furnished'],
  pets_allowed: ['Animais permitidos', 'Pets allowed'],
  sea_view: ['Vista mar', 'Sea view'],
  mountain_view: ['Vista montanha', 'Mountain view'],
  solar_panels: ['Painéis solares', 'Solar panels'],
  ev_charger: ['Carregador elétrico', 'EV charger'],
}

export const AMENITIES: AmenityOption[] = Object.keys(AMENITY_NAMES).map(key => ({
  key,
  get label() { return AMENITY_NAMES[key]![getLanguage() === 'pt' ? 0 : 1] },
}))

export const AMENITY_LABEL: Record<string, string> = Object.defineProperties(
  {} as Record<string, string>,
  Object.fromEntries(AMENITIES.map(a => [a.key, { enumerable: true, get: () => a.label }])),
)

/** Hide residential-only features when posting land or commercial space. */
export function amenitiesForPropertyType(type: 'apartment' | 'house' | 'land' | 'commercial'): AmenityOption[] {
  if (type === 'land') {
    return AMENITIES.filter(item => ['parking', 'garden', 'sea_view', 'mountain_view', 'solar_panels'].includes(item.key))
  }
  if (type === 'commercial') {
    return AMENITIES.filter(item => ['elevator', 'parking', 'garage', 'air_conditioning', 'storage', 'doorman', 'furnished', 'solar_panels', 'ev_charger'].includes(item.key))
  }
  return AMENITIES
}

export function formatFloor(floor: number | null | undefined): string {
  if (floor == null) return '—'
  if (getLanguage() === 'pt') {
    if (floor === 0) return 'Rés do chão'
    if (floor < 0) return `${Math.abs(floor)}.ª cave`
    return `${floor}.º andar`
  }
  if (floor === 0) return 'Ground floor'
  if (floor < 0) return `Basement ${Math.abs(floor)}`
  const suffix =
    floor % 100 >= 11 && floor % 100 <= 13
      ? 'th'
      : floor % 10 === 1
        ? 'st'
        : floor % 10 === 2
          ? 'nd'
          : floor % 10 === 3
            ? 'rd'
            : 'th'
  return `${floor}${suffix} floor`
}

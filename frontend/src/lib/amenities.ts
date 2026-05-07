export type PropertyCondition = 'new' | 'renovated' | 'good' | 'needs_renovation'

export const PROPERTY_CONDITIONS: PropertyCondition[] = [
  'new',
  'renovated',
  'good',
  'needs_renovation',
]

export const PROPERTY_CONDITION_LABEL: Record<PropertyCondition, string> = {
  new: 'New build',
  renovated: 'Renovated',
  good: 'Good condition',
  needs_renovation: 'Needs renovation',
}

/**
 * Optional amenities — surfaced as multi-select chips on listings and as
 * "must-have" filters on criteria.
 */
export interface AmenityOption {
  key: string
  label: string
}

export const AMENITIES: AmenityOption[] = [
  { key: 'elevator',         label: 'Elevator' },
  { key: 'parking',          label: 'Parking' },
  { key: 'garage',           label: 'Garage' },
  { key: 'air_conditioning', label: 'A/C' },
  { key: 'garden',           label: 'Garden' },
  { key: 'pool',             label: 'Pool' },
  { key: 'jacuzzi',          label: 'Jacuzzi' },
  { key: 'sauna',            label: 'Sauna' },
  { key: 'barbecue',         label: 'Barbecue' },
  { key: 'fireplace',        label: 'Fireplace' },
  { key: 'storage',          label: 'Storage room' },
  { key: 'gym',              label: 'Gym' },
  { key: 'doorman',          label: 'Doorman' },
  { key: 'furnished',        label: 'Furnished' },
  { key: 'pets_allowed',     label: 'Pets allowed' },
  { key: 'sea_view',         label: 'Sea view' },
  { key: 'mountain_view',    label: 'Mountain view' },
  { key: 'solar_panels',     label: 'Solar panels' },
  { key: 'ev_charger',       label: 'EV charger' },
]

export const AMENITY_LABEL: Record<string, string> = Object.fromEntries(
  AMENITIES.map(a => [a.key, a.label]),
)

export function formatFloor(floor: number | null | undefined): string {
  if (floor == null) return '—'
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

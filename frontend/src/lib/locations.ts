export interface LocationPreset {
  label: string
  lat: number
  lng: number
}

export const LOCATION_PRESETS: LocationPreset[] = [
  { label: 'Lisbon, Portugal',   lat: 38.7223, lng: -9.1393 },
  { label: 'Porto, Portugal',    lat: 41.1579, lng: -8.6291 },
  { label: 'Cascais, Portugal',  lat: 38.6968, lng: -9.4215 },
  { label: 'Sintra, Portugal',   lat: 38.7980, lng: -9.3878 },
  { label: 'Braga, Portugal',    lat: 41.5454, lng: -8.4265 },
  { label: 'Coimbra, Portugal',  lat: 40.2033, lng: -8.4103 },
  { label: 'Faro, Portugal',     lat: 37.0194, lng: -7.9304 },
  { label: 'Funchal, Madeira',   lat: 32.6669, lng: -16.9241 },
]

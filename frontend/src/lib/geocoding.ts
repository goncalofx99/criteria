/**
 * Address geocoding via Nominatim (OpenStreetMap).
 *
 * Public endpoint, no API key. Usage policy:
 *   - Browsers identify the site through Referer and their own User-Agent.
 *   - Lookups are explicit user actions; public Nominatim forbids client-side
 *     autocomplete. Callers abort superseded requests.
 *   - Cache identical queries within the current page session. A shared
 *     proxy or permitted provider is needed for an aggregate app-wide limit.
 *
 * Scoped to Portugal (`countrycodes=pt`) since the product launches there.
 */
import { reviewMode } from '@/review/mode'

export interface GeocodeResult {
  label: string  // human-readable address (Nominatim's display_name)
  lat: number
  lng: number
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const cache = new Map<string, GeocodeResult[]>()

interface NominatimItem {
  lat: string
  lon: string
  display_name: string
}

export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  if (reviewMode) {
    const places: GeocodeResult[] = [
      { label: 'Lisboa, Portugal', lat: 38.722, lng: -9.139 },
      { label: 'Porto, Portugal', lat: 41.149, lng: -8.611 },
      { label: 'Braga, Portugal', lat: 41.550, lng: -8.423 },
      { label: 'Coimbra, Portugal', lat: 40.208, lng: -8.426 },
      { label: 'Aveiro, Portugal', lat: 40.640, lng: -8.654 },
      { label: 'Lagos, Faro, Portugal', lat: 37.103, lng: -8.675 },
    ]
    return places.filter(place => place.label.toLocaleLowerCase().includes(q.toLocaleLowerCase()))
  }

  const cached = cache.get(q.toLowerCase())
  if (cached) return cached

  const url = new URL(ENDPOINT)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('countrycodes', 'pt')
  url.searchParams.set('q', q)

  const res = await fetch(url.toString(), {
    method: 'GET',
    // Browsers set their own User-Agent and send the site's Referer/origin to
    // identify CRITERIA. Avoid custom headers that cause a CORS preflight.
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!res.ok) {
    throw new Error(`Geocoder HTTP ${res.status}`)
  }

  const json = (await res.json()) as NominatimItem[]
  const out = json.map(item => ({
    label: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }))

  cache.set(q.toLowerCase(), out)
  return out
}

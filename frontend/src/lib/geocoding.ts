/**
 * Address geocoding via Nominatim (OpenStreetMap).
 *
 * Free, no API key. Usage policy:
 *   - Mandatory User-Agent identifying the app + a contact.
 *   - ≤ 1 req/s per client; we debounce + abort in-flight requests in callers.
 *   - Be a good citizen: cache locally so repeated keystrokes don't re-hit it.
 *
 * Scoped to Portugal (`countrycodes=pt`) since the product launches there.
 */

export interface GeocodeResult {
  label: string  // human-readable address (Nominatim's display_name)
  lat: number
  lng: number
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'CRITERIA/1.0 (https://criteria-newn.onrender.com)'
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
    headers: {
      // Browsers strip User-Agent on fetch — Nominatim accepts a Referer/origin
      // as identification when UA is missing. We still send Accept.
      Accept: 'application/json',
      'X-Application': USER_AGENT,
    },
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

import { useEffect, useMemo, useState } from 'react'
import { AttributionControl, Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import type { MapBounds } from '@/components/feed/feedState'
import { formatCompactPrice } from '@/lib/format'

const PRIMARY = '#344e41'
const BUYER_GREEN = '#5a8060'
const LISBON: [number, number] = [38.7223, -9.1393]
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL?.trim() || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const EMPTY_PROPERTIES: PropertyMarker[] = []
const EMPTY_CRITERIA: CriteriaMarker[] = []

interface PropertyMarker {
  id: string
  lat: number
  lng: number
  price?: number
  title?: string
}

interface CriteriaMarker {
  id: string
  lat: number
  lng: number
  radiusKm: number
  priceMax?: number
  title?: string
}

export interface PostsMapProps {
  properties?: PropertyMarker[]
  criteria?: CriteriaMarker[]
  pin?: { lat: number; lng: number; draggable?: boolean }
  approximate?: { lat: number; lng: number; radiusM?: number }
  onPinDrag?: (lat: number, lng: number) => void
  interactive?: boolean
  height?: number | string
  selectedId?: string | null
  onSelectPost?: (id: string) => void
  onBoundsChange?: (bounds: MapBounds) => void
  bounds?: MapBounds
}

function markerIcon(kind: 'property' | 'criteria' | 'pin', amount?: number, selected = false): L.DivIcon {
  const color = kind === 'criteria' ? BUYER_GREEN : PRIMARY
  const label = amount !== undefined && Number.isFinite(amount) ? formatCompactPrice(amount) : (kind === 'criteria' ? 'Buyer' : 'Home')
  // Label comes only from a formatted number or fixed copy, never from user-provided HTML.
  const html = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:60px;max-width:110px;min-height:34px;padding:5px 9px;border:2px solid ${selected ? color : '#fff'};border-radius:999px;background:${selected ? color : '#fff'};color:${selected ? '#fff' : color};box-shadow:0 3px 14px rgba(26,46,34,.25);font:700 12px/1 Inter,system-ui,sans-serif;white-space:nowrap">${label}</span>`
  return L.divIcon({ className: 'criteria-marker', html, iconSize: [68, 36], iconAnchor: [34, 18] })
}

function FitBounds({ properties, criteria, pin, approximate, bounds }: Required<Pick<PostsMapProps, 'properties' | 'criteria'>> & Pick<PostsMapProps, 'pin' | 'approximate' | 'bounds'>) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [30, 30], maxZoom: 15 })
      return
    }
    const points: [number, number][] = []
    properties.forEach(item => points.push([item.lat, item.lng]))
    criteria.forEach(item => points.push([item.lat, item.lng]))
    if (pin) points.push([pin.lat, pin.lng])
    if (approximate) points.push([approximate.lat, approximate.lng])
    if (points.length === 0) map.setView(LISBON, 6)
    else if (points.length === 1) map.setView(points[0]!, 13)
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 })
  }, [map, properties, criteria, pin, approximate, bounds?.north, bounds?.south, bounds?.east, bounds?.west])
  return null
}

function MapViewport({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const map = useMapEvents({ moveend: report })
  function report() {
    const next = map.getBounds()
    onBoundsChange({ north: next.getNorth(), south: next.getSouth(), east: next.getEast(), west: next.getWest() })
  }
  useEffect(() => { report() }, [map, onBoundsChange])
  return null
}

export default function PostsMap({
  properties = EMPTY_PROPERTIES,
  criteria = EMPTY_CRITERIA,
  pin,
  approximate,
  onPinDrag,
  interactive = true,
  height = 320,
  selectedId,
  onSelectPost,
  onBoundsChange,
  bounds,
}: PostsMapProps) {
  const navigate = useNavigate()
  const [tileErrors, setTileErrors] = useState(0)
  const selectedPropertyIcon = useMemo(() => markerIcon('property', undefined, true), [])

  const openPost = (kind: 'property' | 'criteria', id: string) => {
    if (!interactive) return
    if (onSelectPost) onSelectPost(id)
    else navigate(kind === 'property' ? `/listing/${id}` : `/criteria/${id}`)
  }

  return (
    <div role="region" aria-label={pin || approximate ? 'Location map' : 'Results map'} className="relative z-0 overflow-hidden rounded-2xl border border-primary-200 bg-overlay shadow-sm" style={{ height, width: '100%' }}>
      <MapContainer
        center={LISBON}
        zoom={6}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={false}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        attributionControl={false}
        keyboard={interactive}
      >
        <AttributionControl position="topright" prefix={false} />
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          eventHandlers={{ tileerror: () => setTileErrors(count => count + 1) }}
        />
        <FitBounds properties={properties} criteria={criteria} pin={pin} approximate={approximate} bounds={bounds} />
        {onBoundsChange && <MapViewport onBoundsChange={onBoundsChange} />}

        {properties.map(item => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={item.price !== undefined ? markerIcon('property', item.price, selectedId === item.id) : selectedPropertyIcon}
            title={item.title ?? 'Property'}
            keyboard={interactive}
            zIndexOffset={selectedId === item.id ? 1000 : 0}
            eventHandlers={{ click: () => openPost('property', item.id) }}
          />
        ))}

        {criteria.map(item => (
          <Circle
            key={`circle-${item.id}`}
            center={[item.lat, item.lng]}
            radius={Math.max(item.radiusKm, 1) * 1000}
            pathOptions={{ color: BUYER_GREEN, fillColor: BUYER_GREEN, fillOpacity: 0.08, weight: 1.5 }}
            eventHandlers={{ click: () => openPost('criteria', item.id) }}
          />
        ))}

        {criteria.map(item => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={markerIcon('criteria', item.priceMax, selectedId === item.id)}
            title={item.title ?? 'Buyer request'}
            keyboard={interactive}
            zIndexOffset={selectedId === item.id ? 1000 : 0}
            eventHandlers={{ click: () => openPost('criteria', item.id) }}
          />
        ))}

        {approximate && (
          <Circle center={[approximate.lat, approximate.lng]} radius={approximate.radiusM ?? 1000} pathOptions={{ color: PRIMARY, fillColor: PRIMARY, fillOpacity: 0.1, weight: 1.5, dashArray: '6 4' }} />
        )}
        {pin && (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={markerIcon('pin')}
            draggable={Boolean(pin.draggable)}
            keyboard={interactive || Boolean(pin.draggable)}
            eventHandlers={pin.draggable && onPinDrag ? { dragend: event => {
              const position = (event.target as L.Marker).getLatLng()
              onPinDrag(position.lat, position.lng)
            } } : undefined}
          />
        )}
      </MapContainer>
      {tileErrors > 3 && <div className="absolute bottom-2 left-2 right-2 z-[500] rounded-lg bg-surface/95 p-2 text-center text-xs text-foreground shadow-sm">Map tiles are unavailable. Switch to list view to browse results.</div>}
    </div>
  )
}

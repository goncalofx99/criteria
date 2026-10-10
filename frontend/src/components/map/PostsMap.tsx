import { useEffect, useMemo, useState } from 'react'
import { AttributionControl, Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import type { MapBounds } from '@/components/feed/feedState'
import { formatCompactPrice } from '@/lib/format'
import { getLanguage, useLanguage } from '@/lib/language'
import '../../map-theme.css'

const PRIMARY = '#344e41'
const BUYER_GREEN = '#5a8060'
const LISBON: [number, number] = [38.7223, -9.1393]
const CUSTOM_TILE_URL = import.meta.env.VITE_MAP_TILE_URL?.trim()
const TILE_URL = CUSTOM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const USE_OSM_TILES = !CUSTOM_TILE_URL || /^https?:\/\/([abc]\.)?tile\.openstreetmap\.org\//i.test(CUSTOM_TILE_URL)
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const EMPTY_PROPERTIES: PropertyMarker[] = []
const EMPTY_CRITERIA: CriteriaMarker[] = []

function isMainlandPortugal(point: { lat: number; lng: number }): boolean {
  return point.lat >= 36.5 && point.lat <= 42.4 && point.lng >= -10 && point.lng <= -6
}

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

interface PropertyCluster {
  id: string
  properties: PropertyMarker[]
  lat: number
  lng: number
  x: number
  y: number
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
  if (kind === 'pin') {
    const html = '<span aria-hidden="true" class="criteria-map__location-pin"><span class="criteria-map__location-dot"></span></span>'
    return L.divIcon({ className: 'criteria-marker', html, iconSize: [44, 52], iconAnchor: [22, 48] })
  }
  const label = amount !== undefined && Number.isFinite(amount) ? formatCompactPrice(amount) : (kind === 'criteria' ? (getLanguage() === 'pt' ? 'Comprador' : 'Buyer') : (getLanguage() === 'pt' ? 'Casa' : 'Home'))
  // Label comes only from a formatted number or fixed copy, never from user-provided HTML.
  const html = `<span aria-hidden="true" class="criteria-map__price-pin criteria-map__price-pin--${kind}${selected ? ' is-selected' : ''}"><span class="criteria-map__price-dot"></span><span>${label}</span></span>`
  return L.divIcon({ className: 'criteria-marker', html, iconSize: [116, 52], iconAnchor: [58, 48] })
}

function clusterIcon(count: number, selected = false): L.DivIcon {
  const html = `<span aria-hidden="true" class="criteria-map__cluster${selected ? ' is-selected' : ''}">${count}</span>`
  return L.divIcon({ className: 'criteria-marker', html, iconSize: [52, 52], iconAnchor: [26, 26] })
}

/** Group price pins that would overlap at national and regional zoom levels. */
function clusterProperties(properties: PropertyMarker[], map: L.Map, zoom: number): PropertyCluster[] {
  const radius = zoom <= 8 ? 72 : zoom <= 11 ? 56 : 0
  const clusters: PropertyCluster[] = []
  for (const property of properties) {
    const point = map.project([property.lat, property.lng], zoom)
    let closest: PropertyCluster | undefined
    let closestDistance = radius * radius
    if (radius > 0) {
      for (const cluster of clusters) {
        const distance = (point.x - cluster.x) ** 2 + (point.y - cluster.y) ** 2
        if (distance <= closestDistance) {
          closest = cluster
          closestDistance = distance
        }
      }
    }
    if (closest) {
      const count = closest.properties.length
      closest.properties.push(property)
      closest.x = (closest.x * count + point.x) / (count + 1)
      closest.y = (closest.y * count + point.y) / (count + 1)
      closest.lat = (closest.lat * count + property.lat) / (count + 1)
      closest.lng = (closest.lng * count + property.lng) / (count + 1)
    } else {
      clusters.push({ id: property.id, properties: [property], lat: property.lat, lng: property.lng, x: point.x, y: point.y })
    }
  }
  return clusters
}

function PropertyMarkers({ properties, selectedId, interactive, onOpen }: {
  properties: PropertyMarker[]
  selectedId?: string | null
  interactive: boolean
  onOpen: (id: string) => void
}) {
  const { t } = useLanguage()
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const clusters = useMemo(() => clusterProperties(properties, map, zoom), [properties, map, zoom])

  return <>
    {clusters.map(cluster => {
      if (cluster.properties.length > 1) {
        const selected = cluster.properties.some(item => item.id === selectedId)
        return <Marker
          key={`cluster-${cluster.id}`}
          position={[cluster.lat, cluster.lng]}
          icon={clusterIcon(cluster.properties.length, selected)}
          title={t(`${cluster.properties.length} imóveis próximos. Ative para ampliar.`, `${cluster.properties.length} properties nearby. Activate to zoom in.`)}
          interactive={interactive}
          keyboard={interactive}
          zIndexOffset={selected ? 1000 : 0}
          eventHandlers={{ click: () => {
            if (!interactive) return
            map.fitBounds(L.latLngBounds(cluster.properties.map(item => [item.lat, item.lng])), { padding: [48, 48], maxZoom: 14 })
          } }}
        />
      }
      const property = cluster.properties[0]
      return <Marker
        key={property.id}
        position={[property.lat, property.lng]}
        icon={markerIcon('property', property.price, selectedId === property.id)}
        title={property.title ? `${property.title}. ${property.price == null ? t('Ver imóvel', 'View property') : formatCompactPrice(property.price)}` : t('Ver imóvel', 'View property')}
        interactive={interactive}
        keyboard={interactive}
        zIndexOffset={selectedId === property.id ? 1000 : 0}
        eventHandlers={{ click: () => onOpen(property.id) }}
      />
    })}
  </>
}

function FitBounds({ properties, criteria, pin, approximate, bounds, focusMainland }: Required<Pick<PostsMapProps, 'properties' | 'criteria'>> & Pick<PostsMapProps, 'pin' | 'approximate' | 'bounds'> & { focusMainland: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [30, 30], maxZoom: 15 })
      return
    }
    const points: [number, number][] = []
    properties.forEach(item => { if (!focusMainland || isMainlandPortugal(item)) points.push([item.lat, item.lng]) })
    criteria.forEach(item => { if (!focusMainland || isMainlandPortugal(item)) points.push([item.lat, item.lng]) })
    if (pin) points.push([pin.lat, pin.lng])
    if (approximate) points.push([approximate.lat, approximate.lng])
    if (points.length === 0) map.setView(LISBON, 6)
    else if (points.length === 1) map.setView(points[0]!, 13)
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 })
  }, [map, properties, criteria, pin, approximate, focusMainland, bounds?.north, bounds?.south, bounds?.east, bounds?.west])
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

function PanMode({ enabled }: { enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (enabled) map.dragging.enable()
    else map.dragging.disable()
  }, [enabled, map])
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
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [tileErrors, setTileErrors] = useState(0)
  const [coarsePointer] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false)
  const [touchPanEnabled, setTouchPanEnabled] = useState(false)
  const [showAllAreas, setShowAllAreas] = useState(false)
  const needsPanChoice = interactive && Boolean(onBoundsChange) && coarsePointer
  const pointCount = properties.length + criteria.length
  const mainlandCount = properties.filter(isMainlandPortugal).length + criteria.filter(isMainlandPortugal).length
  const hasRegionalFocus = Boolean(onBoundsChange) && !bounds && pointCount >= 5 && mainlandCount >= Math.ceil(pointCount * .7) && mainlandCount < pointCount
  const openPost = (kind: 'property' | 'criteria', id: string) => {
    if (!interactive) return
    if (onSelectPost) onSelectPost(id)
    else navigate(kind === 'property' ? `/listing/${id}` : `/criteria/${id}`)
  }

  return (
    <div role="region" aria-label={pin || approximate ? t('Mapa da localização', 'Location map') : t('Mapa de resultados', 'Results map')} className={`criteria-map relative z-0 overflow-hidden ${USE_OSM_TILES ? 'criteria-map--osm-tiles' : ''} ${needsPanChoice && !touchPanEnabled ? 'criteria-map--scrollable' : ''}`} style={{ height, width: '100%' }}>
      <MapContainer
        center={LISBON}
        zoom={6}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={false}
        dragging={interactive && (!needsPanChoice || touchPanEnabled)}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        attributionControl={false}
        keyboard={interactive}
      >
        {needsPanChoice && <PanMode enabled={touchPanEnabled} />}
        <AttributionControl position="topright" prefix={false} />
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          eventHandlers={{ tileerror: () => setTileErrors(count => count + 1) }}
        />
        <FitBounds properties={properties} criteria={criteria} pin={pin} approximate={approximate} bounds={bounds} focusMainland={hasRegionalFocus && !showAllAreas} />
        {onBoundsChange && <MapViewport onBoundsChange={onBoundsChange} />}

        <PropertyMarkers properties={properties} selectedId={selectedId} interactive={interactive} onOpen={id => openPost('property', id)} />

        {criteria.map(item => (
          <Circle
            key={`circle-${item.id}`}
            center={[item.lat, item.lng]}
            radius={Math.max(item.radiusKm, 1) * 1000}
            pathOptions={{ color: BUYER_GREEN, fillColor: BUYER_GREEN, fillOpacity: 0.1, weight: 2, className: 'criteria-map__buyer-area' }}
            interactive={interactive}
            eventHandlers={{ click: () => openPost('criteria', item.id) }}
          />
        ))}

        {criteria.map(item => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={markerIcon('criteria', item.priceMax, selectedId === item.id)}
            title={item.title ?? t('Critérios', 'Criteria')}
            interactive={interactive}
            keyboard={interactive}
            zIndexOffset={selectedId === item.id ? 1000 : 0}
            eventHandlers={{ click: () => openPost('criteria', item.id) }}
          />
        ))}

        {approximate && (
          <Circle center={[approximate.lat, approximate.lng]} radius={approximate.radiusM ?? 1000} interactive={false} pathOptions={{ color: PRIMARY, fillColor: PRIMARY, fillOpacity: 0.1, weight: 2, dashArray: '6 5', className: 'criteria-map__approximate-area' }} />
        )}
        {pin && (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={markerIcon('pin')}
            draggable={Boolean(pin.draggable)}
            interactive={interactive || Boolean(pin.draggable)}
            keyboard={interactive || Boolean(pin.draggable)}
            eventHandlers={pin.draggable && onPinDrag ? { dragend: event => {
              const position = (event.target as L.Marker).getLatLng()
              onPinDrag(position.lat, position.lng)
            } } : undefined}
          />
        )}
      </MapContainer>
      {(needsPanChoice || hasRegionalFocus) && <div className="absolute bottom-3 left-3 z-[500] flex flex-col items-start gap-2">
        {hasRegionalFocus && <button
          type="button"
          onClick={() => setShowAllAreas(current => !current)}
          aria-pressed={showAllAreas}
          className="criteria-map__region-button min-h-11 px-4 text-sm font-semibold"
        >
          {showAllAreas ? t('Focar no continente', 'Focus mainland') : t('Mostrar todo o Portugal', 'Show all Portugal')}
        </button>}
        {needsPanChoice && <button
          type="button"
          onClick={() => setTouchPanEnabled(enabled => !enabled)}
          aria-pressed={touchPanEnabled}
          className="criteria-map__pan-button min-h-11 px-4 text-sm font-semibold"
        >
          {touchPanEnabled ? t('Deslocar página', 'Scroll page') : t('Mover mapa', 'Move map')}
        </button>}
      </div>}
      {tileErrors > 3 && <div role="status" className="criteria-map__tile-error absolute bottom-2 left-2 right-2 z-[500] p-3 text-center text-xs">{t('O mapa está indisponível. Mude para a lista para ver os resultados.', 'Map tiles are unavailable. Switch to list view to browse results.')}</div>}
    </div>
  )
}

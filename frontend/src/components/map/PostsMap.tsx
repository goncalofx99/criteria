import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

const PRIMARY = "#344e41";
const CRITERIA_GREEN = "#5a8060";
const LISBON: [number, number] = [38.7223, -9.1393];

// ─── divIcons ────────────────────────────────────────────────────────────────
// We avoid the default Leaflet marker because Vite mangles its image URLs.
// divIcons render arbitrary HTML/SVG, no image assets needed.

const propertyIcon = L.divIcon({
  className: "criteria-marker",
  html: `<div style="
    width:38px;height:38px;background:${PRIMARY};
    border-radius:19px 19px 19px 4px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(52,78,65,0.35);border:2.5px solid white;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

const criteriaIcon = L.divIcon({
  className: "criteria-marker",
  html: `<div style="
    width:38px;height:38px;background:${CRITERIA_GREEN};
    border-radius:19px 19px 19px 4px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(90,128,96,0.35);border:2.5px solid white;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface PropertyMarker {
  id: string;
  lat: number;
  lng: number;
}

interface CriteriaMarker {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface PostsMapProps {
  properties?: PropertyMarker[];
  criteria?: CriteriaMarker[];
  /** Single pin shown in form preview / detail mini-map. Not navigable. */
  pin?: { lat: number; lng: number; draggable?: boolean };
  /** Approximate area circle (privacy mode for non-owners). Mutually exclusive with `pin`. */
  approximate?: { lat: number; lng: number; radiusM?: number };
  /** Fired when the draggable preview pin is moved. */
  onPinDrag?: (lat: number, lng: number) => void;
  /** Disable user interaction (used in detail mini-map). */
  interactive?: boolean;
  /** Tailwind-friendly explicit height. Defaults to 320px. */
  height?: number | string;
}

// ─── Internal: fit map to whichever points exist ─────────────────────────────

function FitBounds({
  properties = [],
  criteria = [],
  pin,
  approximate,
}: Pick<PostsMapProps, "properties" | "criteria" | "pin" | "approximate">) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    properties.forEach((p) => points.push([p.lat, p.lng]));
    criteria.forEach((c) => points.push([c.lat, c.lng]));
    if (pin) points.push([pin.lat, pin.lng]);
    if (approximate) points.push([approximate.lat, approximate.lng]);

    if (points.length === 0) {
      map.setView(LISBON, 6);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0]!, 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), {
      padding: [40, 40],
      maxZoom: 13,
    });
  }, [map, properties, criteria, pin, approximate]);
  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PostsMap({
  properties = [],
  criteria = [],
  pin,
  approximate,
  onPinDrag,
  interactive = true,
  height = 320,
}: PostsMapProps) {
  const navigate = useNavigate();

  return (
    <div
      className="overflow-hidden rounded-2xl border border-primary-200 shadow-sm z-0"
      style={{ height, width: "100%" }}
    >
      <MapContainer
        center={LISBON}
        zoom={6}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds
          properties={properties}
          criteria={criteria}
          pin={pin}
          approximate={approximate}
        />

        {properties.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={propertyIcon}
            eventHandlers={{
              click: () => interactive && navigate(`/listing/${p.id}`),
            }}
          />
        ))}

        {criteria.map((c) => (
          <Circle
            key={`circle-${c.id}`}
            center={[c.lat, c.lng]}
            radius={Math.max(c.radiusKm, 1) * 1000}
            pathOptions={{
              color: CRITERIA_GREEN,
              fillColor: CRITERIA_GREEN,
              fillOpacity: 0.12,
              weight: 1.5,
            }}
            eventHandlers={{
              click: () => interactive && navigate(`/criteria/${c.id}`),
            }}
          />
        ))}

        {criteria.map((c) => (
          <Marker
            key={`pin-${c.id}`}
            position={[c.lat, c.lng]}
            icon={criteriaIcon}
            eventHandlers={{
              click: () => interactive && navigate(`/criteria/${c.id}`),
            }}
          />
        ))}

        {approximate && (
          <Circle
            center={[approximate.lat, approximate.lng]}
            radius={approximate.radiusM ?? 500}
            pathOptions={{
              color: PRIMARY,
              fillColor: PRIMARY,
              fillOpacity: 0.1,
              weight: 1.5,
              dashArray: "6 4",
            }}
          />
        )}

        {pin && (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={propertyIcon}
            draggable={!!pin.draggable}
            eventHandlers={
              pin.draggable && onPinDrag
                ? {
                    dragend: (e) => {
                      const { lat, lng } = (e.target as L.Marker).getLatLng();
                      onPinDrag(lat, lng);
                    },
                  }
                : undefined
            }
          />
        )}
      </MapContainer>
    </div>
  );
}

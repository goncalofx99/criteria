import { Link } from "react-router-dom";
import { ArrowUpRight, BedDouble, Bath, Maximize2, MapPin } from "lucide-react";
import { formatPrice, initialsOf, avatarColorFor, timeAgo } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, type PropertyType } from "@/lib/propertyType";
import {
  PROPERTY_CONDITION_LABEL,
  type PropertyCondition,
} from "@/lib/amenities";

export interface PropertyCardData {
  id: string;
  title: string;
  locationText: string;
  lat: number;
  lng: number;
  propertyType: PropertyType;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number | null;
  yearBuilt: number | null;
  condition: PropertyCondition;
  floor: number | null;
  totalFloors: number | null;
  hasBalcony: boolean;
  hasCentralHeating: boolean;
  amenities: string[];
  images: string[];
  createdAt: string;
  seller: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const cover = property.images[0];
  const initials = initialsOf(property.seller.fullName);
  const avatarBg = avatarColorFor(property.seller.id);

  return (
    <Link
      to={`/listing/${property.id}`}
      className="listing-card group block h-full w-full active:scale-[0.99]"
    >
      {/* Image / placeholder */}
      <div className="relative aspect-[4/3] overflow-hidden bg-overlay z-0">
        {cover ? (
          <img
            src={cover}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <StaticMapImage lat={property.lat} lng={property.lng} alt={property.title} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/45 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm">
          {PROPERTY_TYPE_LABEL[property.propertyType]}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-primary-900/65 px-2.5 py-1.5 text-[11px] text-white backdrop-blur-sm">
          {timeAgo(property.createdAt)}
        </span>
        <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
          <ArrowUpRight size={18} />
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="editorial-kicker">For sale · {PROPERTY_TYPE_LABEL[property.propertyType]}</p>
        <p className="mt-2 text-[26px] font-semibold tracking-[-.045em] text-primary-900">
          {formatPrice(property.price)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold text-foreground">
          {property.title}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin size={13} className="text-muted-foreground/70" />
          {property.locationText}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-border/70 py-3 text-[13px] font-medium text-foreground/75">
          <span className="flex items-center gap-1.5">
            <BedDouble size={14} className="text-muted-foreground/70" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1.5">
            <Bath size={14} className="text-muted-foreground/70" />
            {property.bathrooms} bath
          </span>
          {property.areaSqm != null && (
            <span className="flex items-center gap-1.5">
              <Maximize2 size={14} className="text-muted-foreground/70" />
              {property.areaSqm.toLocaleString()} m²
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="quiet-chip">
            {PROPERTY_CONDITION_LABEL[property.condition]}
          </span>
          {property.yearBuilt != null && (
            <span className="quiet-chip">
              Built {property.yearBuilt}
            </span>
          )}
          {property.hasBalcony && (
            <span className="quiet-chip">
              Balcony
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
          <span className="text-[13px] text-muted-foreground">
            Listed by {property.seller.fullName ?? "Anonymous"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Static map thumbnail ────────────────────────────────────────────────────
// Uses OpenStreetMap tiles to render a lightweight static map image.
// Computes the exact pixel position of the lat/lng and offsets a 3x3 tile grid
// so the location is always centred in the container.

const TILE_SIZE = 256

function StaticMapImage({ lat, lng, alt }: { lat: number; lng: number; alt: string }) {
  const zoom = 15
  const n = Math.pow(2, zoom)

  // Fractional tile coordinates (not floored)
  const xFrac = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const yFrac = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n

  // Integer tile indices for the tile containing the point
  const tileX = Math.floor(xFrac)
  const tileY = Math.floor(yFrac)

  // Pixel offset of the point within its tile (0-255)
  const pixelOffsetX = (xFrac - tileX) * TILE_SIZE
  const pixelOffsetY = (yFrac - tileY) * TILE_SIZE

  // We render a 3x3 grid starting at (tileX-1, tileY-1).
  // The point sits in the centre tile (index 1,1) at (pixelOffsetX, pixelOffsetY).
  // Shift the grid so that pixel lands at the centre of the container (50%, 50%).
  // Centre of tile(1,1) in the grid = (1*256 + pixelOffsetX, 1*256 + pixelOffsetY)
  const shiftX = TILE_SIZE + pixelOffsetX
  const shiftY = TILE_SIZE + pixelOffsetY

  const tileUrl = (x: number, y: number) =>
    `https://a.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png`

  const tiles: { x: number; y: number }[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({ x: tileX + dx, y: tileY + dy })
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-accent">
      <div
        style={{
          position: 'absolute',
          left: `calc(50% - ${shiftX}px)`,
          top: `calc(50% - ${shiftY}px)`,
          width: TILE_SIZE * 3,
          height: TILE_SIZE * 3,
          display: 'grid',
          gridTemplateColumns: `repeat(3, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(3, ${TILE_SIZE}px)`,
          gap: 0,
          lineHeight: 0,
          fontSize: 0,
        }}
      >
        {tiles.map((t) => (
          <img
            key={`${t.x}-${t.y}`}
            src={tileUrl(t.x, t.y)}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            draggable={false}
            style={{ display: 'block', width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}
      </div>
      {/* Pin overlay — always dead centre */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg">
          <MapPin size={16} className="text-white" />
        </div>
      </div>
      <span className="sr-only">Map showing location of {alt}</span>
    </div>
  )
}

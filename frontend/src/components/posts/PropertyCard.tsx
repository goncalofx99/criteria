import { Link } from 'react-router-dom'
import { BedDouble, Bath, Maximize2, MapPin } from 'lucide-react'
import { formatPrice, initialsOf, avatarColorFor, timeAgo } from '@/lib/format'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { PROPERTY_CONDITION_LABEL, type PropertyCondition } from '@/lib/amenities'

export interface PropertyCardData {
  id: string
  title: string
  locationText: string
  propertyType: PropertyType
  price: number
  bedrooms: number
  bathrooms: number
  areaSqm: number | null
  yearBuilt: number | null
  condition: PropertyCondition
  floor: number | null
  totalFloors: number | null
  hasBalcony: boolean
  hasCentralHeating: boolean
  amenities: string[]
  images: string[]
  createdAt: string
  seller: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const cover = property.images[0]
  const initials = initialsOf(property.seller.fullName)
  const avatarBg = avatarColorFor(property.seller.id)

  return (
    <Link
      to={`/listing/${property.id}`}
      className="block w-full bg-surface rounded-xl overflow-hidden shadow-elevation-1 transition-transform active:scale-[0.99]"
    >
      {/* Image / placeholder */}
      <div className="relative h-44 overflow-hidden bg-overlay">
        {cover ? (
          <img src={cover} alt={property.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No photo
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
          {PROPERTY_TYPE_LABEL[property.propertyType]}
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm">
          {timeAgo(property.createdAt)}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-2xl font-semibold tracking-tight text-primary">
          {formatPrice(property.price)}
        </p>
        <p className="mt-0.5 text-base font-medium text-foreground">{property.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin size={13} className="text-muted-foreground/70" />
          {property.locationText}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-foreground/70">
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

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
            {PROPERTY_CONDITION_LABEL[property.condition]}
          </span>
          {property.yearBuilt != null && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
              Built {property.yearBuilt}
            </span>
          )}
          {property.hasBalcony && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
              Balcony
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
          <span className="text-[13px] text-muted-foreground">
            Listed by {property.seller.fullName ?? 'Anonymous'}
          </span>
        </div>
      </div>
    </Link>
  )
}

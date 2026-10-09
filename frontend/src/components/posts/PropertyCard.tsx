import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Bath, BedDouble, Building2, MapPin, Maximize2 } from 'lucide-react'
import { avatarColorFor, formatPrice, initialsOf, timeAgo } from '@/lib/format'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { PROPERTY_CONDITION_LABEL, type PropertyCondition } from '@/lib/amenities'

export interface PropertyCardData {
  id: string
  title: string
  locationText: string
  lat: number
  lng: number
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
  isActive: boolean
  createdAt: string
  seller: { id: string; fullName: string | null; avatarUrl: string | null }
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const location = useLocation()
  const cover = property.images[0]
  const residential = property.propertyType === 'apartment' || property.propertyType === 'house'

  return (
    <Link
      to={`/listing/${property.id}`}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className="listing-card group flex h-full w-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary-100">
        {cover ? (
          <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
        ) : (
          <div className="listing-photo-placeholder flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Building2 size={44} strokeWidth={1.25} aria-hidden="true" />
            <span className="text-xs font-medium tracking-wide">Photo coming soon</span>
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
          {PROPERTY_TYPE_LABEL[property.propertyType]}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-primary-900/85 px-3 py-1.5 text-xs font-semibold text-white">
          {property.isActive ? 'For sale' : 'Archived'}
        </span>
        <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-primary shadow-sm" aria-hidden="true">
          <ArrowUpRight size={18} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-muted-foreground">{timeAgo(property.createdAt)}</p>
        <p className="mt-2 text-[26px] font-semibold tracking-[-.035em] text-foreground">{formatPrice(property.price)}</p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-foreground">{property.title}</h3>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{property.locationText}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-y border-border/70 py-3 text-sm text-foreground/80">
          {residential && <span className="flex items-center gap-1.5"><BedDouble size={16} aria-hidden="true" />{property.bedrooms} bed</span>}
          {residential && <span className="flex items-center gap-1.5"><Bath size={16} aria-hidden="true" />{property.bathrooms} bath</span>}
          {property.areaSqm != null && <span className="flex items-center gap-1.5"><Maximize2 size={16} aria-hidden="true" />{property.areaSqm.toLocaleString('pt-PT')} m²</span>}
          {!residential && property.areaSqm == null && <span>Area not specified</span>}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: avatarColorFor(property.seller.id) }} aria-hidden="true">
            {initialsOf(property.seller.fullName)}
          </div>
          <span className="min-w-0 truncate text-sm text-muted-foreground">{property.seller.fullName ?? 'Seller'}</span>
          {residential && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{PROPERTY_CONDITION_LABEL[property.condition]}</span>}
        </div>
      </div>
    </Link>
  )
}

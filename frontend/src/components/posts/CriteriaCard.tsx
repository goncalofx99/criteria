import { Link } from 'react-router-dom'
import { BedDouble, Bath, Maximize2, MapPin } from 'lucide-react'
import { formatPriceRange, initialsOf, avatarColorFor, timeAgo } from '@/lib/format'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'

export interface CriteriaCardData {
  id: string
  title: string
  locationText: string
  lat: number
  lng: number
  radiusKm: number
  propertyType: PropertyType
  priceMin: number
  priceMax: number
  bedroomsMin: number
  bathroomsMin: number
  areaSqmMin: number | null
  yearBuiltMin: number | null
  conditions: string[] | null
  floorMin: number | null
  floorMax: number | null
  requiresBalcony: boolean | null
  requiresCentralHeating: boolean | null
  requiredAmenities: string[]
  createdAt: string
  buyer: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export function CriteriaCard({ criteria }: { criteria: CriteriaCardData }) {
  const initials = initialsOf(criteria.buyer.fullName)
  const avatarBg = avatarColorFor(criteria.buyer.id)

  return (
    <Link
      to={`/criteria/${criteria.id}`}
      className="block w-full bg-surface rounded-xl overflow-hidden shadow-elevation-1 transition-transform active:scale-[0.99]"
    >
      <div className="h-[3px] bg-primary" />

      <div className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {criteria.buyer.fullName ?? 'Anonymous buyer'}
            </p>
            <p className="text-xs text-muted-foreground">
              Active buyer · {timeAgo(criteria.createdAt)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-primary">
            SEEKING
          </span>
        </div>

        {/* Budget */}
        <div className="mb-3">
          <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground">
            Budget
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {formatPriceRange(criteria.priceMin, criteria.priceMax)}
          </p>
        </div>

        {/* Title */}
        {criteria.title && (
          <p className="mb-3 text-sm text-foreground/80">{criteria.title}</p>
        )}

        {/* Location + radius */}
        <div className="mb-3 flex items-center gap-1.5 text-sm text-foreground/70">
          <MapPin size={13} className="text-muted-foreground/70" />
          {criteria.locationText}
          <span className="text-muted-foreground/70">· {criteria.radiusKm}km radius</span>
        </div>

        {/* Type chip */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground/70">
            {PROPERTY_TYPE_LABEL[criteria.propertyType]}
          </span>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 text-[13px] text-foreground/70">
          <span className="flex items-center gap-1.5">
            <BedDouble size={14} className="text-muted-foreground/70" />
            {criteria.bedroomsMin}+ bed
          </span>
          <span className="flex items-center gap-1.5">
            <Bath size={14} className="text-muted-foreground/70" />
            {criteria.bathroomsMin}+ bath
          </span>
          {criteria.areaSqmMin != null && (
            <span className="flex items-center gap-1.5">
              <Maximize2 size={14} className="text-muted-foreground/70" />
              {criteria.areaSqmMin.toLocaleString()}+ m²
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

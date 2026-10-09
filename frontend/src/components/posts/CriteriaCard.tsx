import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, BedDouble, Bath, Maximize2, MapPin, Search } from 'lucide-react'
import { formatPriceRange, timeAgo } from '@/lib/format'
import { MemberAvatar } from '@/components/ui/member-avatar'
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
  isActive: boolean
  createdAt: string
  buyer: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export function CriteriaCard({ criteria }: { criteria: CriteriaCardData }) {
  const location = useLocation()
  const residential = criteria.propertyType === 'apartment' || criteria.propertyType === 'house'

  return (
    <Link
      to={`/criteria/${criteria.id}`}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className="criteria-card group block h-full w-full active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative flex h-24 items-center justify-between overflow-hidden bg-primary-900 px-5 text-white">
        <div className="absolute -right-5 -top-16 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute right-3 -top-9 h-32 w-32 rounded-full border border-white/15" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><Search size={18} /></span>
          <span className="text-xs font-semibold uppercase tracking-[.17em]">Buyer request</span>
        </div>
        <ArrowUpRight size={20} className="relative transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <MemberAvatar member={criteria.buyer} className="h-11 w-11 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {criteria.buyer.fullName ?? 'Anonymous buyer'}
            </p>
            <p className="text-xs text-muted-foreground">
              {criteria.isActive ? 'Buyer request' : 'Archived request'} · {timeAgo(criteria.createdAt)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {criteria.isActive ? 'Looking now' : 'Archived'}
          </span>
        </div>

        {/* Budget */}
        <div className="mb-3">
          <p className="editorial-kicker">Budget</p>
          <p className="mt-1 text-[25px] font-semibold tracking-[-.045em] text-foreground">
            {formatPriceRange(criteria.priceMin, criteria.priceMax)}
          </p>
        </div>

        {/* Title */}
        {criteria.title && (
          <p className="mb-3 line-clamp-2 text-[15px] font-semibold text-foreground">{criteria.title}</p>
        )}

        {/* Location + radius */}
        <div className="mb-3 flex items-center gap-1.5 text-sm text-foreground/70">
          <MapPin size={13} className="text-muted-foreground/70" />
          {criteria.locationText}
          <span className="text-muted-foreground/70">· {criteria.radiusKm}km radius</span>
        </div>

        {/* Type chip */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="quiet-chip">
            {PROPERTY_TYPE_LABEL[criteria.propertyType]}
          </span>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/80 pt-3 text-[13px] font-medium text-foreground/75">
          {residential && <span className="flex items-center gap-1.5">
            <BedDouble size={14} className="text-muted-foreground/70" />
            {criteria.bedroomsMin}+ bed
          </span>}
          {residential && <span className="flex items-center gap-1.5">
            <Bath size={14} className="text-muted-foreground/70" />
            {criteria.bathroomsMin}+ bath
          </span>}
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

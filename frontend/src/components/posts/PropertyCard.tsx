import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bath, BedDouble, Building2, MapPin, Maximize2 } from 'lucide-react'
import { formatPrice, timeAgo } from '@/lib/format'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import type { PropertyCondition } from '@/lib/amenities'
import { useLanguage, languageTag } from '@/lib/language'
import { publicLocationLabel } from '@/lib/locations'

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
  const { t, language } = useLanguage()
  const location = useLocation()
  const cover = property.images[0]
  const [coverFailed, setCoverFailed] = useState(false)
  useEffect(() => setCoverFailed(false), [cover])
  const residential = property.propertyType === 'apartment' || property.propertyType === 'house'

  return (
    <Link
      to={`/listing/${property.id}`}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className="listing-card group flex h-full w-full flex-col active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-accent sm:aspect-[4/3]">
        {cover && !coverFailed ? (
          <img src={cover} alt={t(`Fotografia de ${property.title}`, `Photo of ${property.title}`)} loading="lazy" decoding="async" onError={() => setCoverFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        ) : (
          <div className="listing-photo-placeholder flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Building2 size={38} strokeWidth={1.25} aria-hidden="true" />
            <span className="text-sm font-medium">{t('Ainda sem fotografia', 'No photo yet')}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="price-display text-[27px] font-semibold leading-tight tracking-[-.025em] tabular-nums text-foreground">{formatPrice(property.price)}</p>
          <span className="text-xs font-medium text-muted-foreground">{PROPERTY_TYPE_LABEL[property.propertyType]}{property.isActive ? '' : t(' (arquivado)', ' (archived)')}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug tracking-[-.012em] text-foreground">{property.title}</h3>
        <p className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-muted-foreground">
          <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{publicLocationLabel(property.locationText, language)}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-[13px] font-medium text-foreground">
          {residential && <span className="flex items-center gap-1.5"><BedDouble size={16} aria-hidden="true" />{property.bedrooms} {t(property.bedrooms === 1 ? 'quarto' : 'quartos', 'bed')}</span>}
          {residential && <span className="flex items-center gap-1.5"><Bath size={16} aria-hidden="true" />{property.bathrooms} {t(property.bathrooms === 1 ? 'casa de banho' : 'casas de banho', 'bath')}</span>}
          {property.areaSqm != null && <span className="flex items-center gap-1.5"><Maximize2 size={16} aria-hidden="true" />{property.areaSqm.toLocaleString(languageTag(language))} m²</span>}
          {!residential && property.areaSqm == null && <span>{t('Área não indicada', 'Area not specified')}</span>}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted-foreground">
          <MemberAvatar member={property.seller} className="h-7 w-7" />
          <span className="min-w-0 truncate">{property.seller.fullName ?? t('Vendedor', 'Seller')}</span>
          <span className="ml-auto shrink-0">{timeAgo(property.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}

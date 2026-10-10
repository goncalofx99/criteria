import { Link, useLocation } from 'react-router-dom'
import { BedDouble, Bath, Maximize2, MapPin } from 'lucide-react'
import { formatPriceRange, timeAgo } from '@/lib/format'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/lib/propertyType'
import { useLanguage, languageTag } from '@/lib/language'
import { publicLocationLabel } from '@/lib/locations'

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
  const { t, language } = useLanguage()
  const location = useLocation()
  const residential = criteria.propertyType === 'apartment' || criteria.propertyType === 'house'

  return (
    <Link
      to={`/criteria/${criteria.id}`}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className="criteria-card group flex h-full w-full flex-col active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100"
    >
      <div className="bg-accent px-4 pb-5 pt-4 sm:px-5 sm:pt-5">
        <p className="price-display text-[clamp(1.35rem,6vw,1.6875rem)] font-semibold leading-tight tracking-[-.025em] tabular-nums text-foreground">
          {formatPriceRange(criteria.priceMin, criteria.priceMax)}
        </p>
        <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug tracking-[-.012em] text-foreground">
          {criteria.title || t(`${PROPERTY_TYPE_LABEL[criteria.propertyType]} em ${publicLocationLabel(criteria.locationText, language)}`, `${PROPERTY_TYPE_LABEL[criteria.propertyType]} in ${publicLocationLabel(criteria.locationText, language)}`)}
        </h3>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <p className="flex min-w-0 items-start gap-1.5 text-sm leading-snug text-muted-foreground">
          <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{publicLocationLabel(criteria.locationText, language)} ({t(`raio de ${criteria.radiusKm} km`, `${criteria.radiusKm} km radius`)})</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-primary">
          <span>{t(`Critérios para ${PROPERTY_TYPE_LABEL[criteria.propertyType].toLowerCase()}`, `${PROPERTY_TYPE_LABEL[criteria.propertyType]} criteria`)}</span>
          {!criteria.isActive && <span className="text-muted-foreground">{t('Arquivado', 'Archived')}</span>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[13px] font-medium text-foreground">
          {residential && <span className="flex items-center gap-1.5">
            <BedDouble size={16} aria-hidden="true" />
            {criteria.bedroomsMin}+ {t(criteria.bedroomsMin === 1 ? 'quarto' : 'quartos', 'bed')}
          </span>}
          {residential && <span className="flex items-center gap-1.5">
            <Bath size={16} aria-hidden="true" />
            {criteria.bathroomsMin}+ {t(criteria.bathroomsMin === 1 ? 'casa de banho' : 'casas de banho', 'bath')}
          </span>}
          {criteria.areaSqmMin != null && (
            <span className="flex items-center gap-1.5">
              <Maximize2 size={16} aria-hidden="true" />
              {criteria.areaSqmMin.toLocaleString(languageTag(language))}+ m²
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted-foreground">
          <MemberAvatar member={criteria.buyer} className="h-7 w-7" />
          <span className="min-w-0 truncate">{criteria.buyer.fullName ?? t('Comprador', 'Buyer')}</span>
          <span className="ml-auto shrink-0">{timeAgo(criteria.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}

import { getLanguage, languageTag } from '@/lib/language'

/** Full amounts are used in details and forms so the price is never rounded. */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat(languageTag(getLanguage()), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

/** Compact amounts are reserved for dense map markers. */
export function formatCompactPrice(price: number): string {
  const locale = languageTag(getLanguage())
  if (price >= 1_000_000) {
    return `€${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(price / 1_000_000)}M`
  }
  if (price >= 1_000) return `€${Math.round(price / 1_000)}k`
  return `€${Math.round(price)}`
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} – ${formatPrice(max)}`
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function avatarColorFor(id: string): string {
  const palette = [
    '#344e41', '#4a6741', '#2d5a47', '#3d5c4a', '#395243',
    '#5c4033', '#7a5c3f', '#3d4a3e', '#2a4858', '#3d3d5c',
  ]
  if (!id) return palette[0]!
  return palette[id.charCodeAt(id.length - 1) % palette.length]!
}

export function timeAgo(iso: string | number | Date): string {
  // Drizzle may return timestamps as numeric strings (milliseconds) — detect and coerce.
  const date = typeof iso === 'string' && /^\d+$/.test(iso)
    ? new Date(Number(iso))
    : new Date(iso)
  const ms = Date.now() - date.getTime()
  if (isNaN(ms)) return ''
  const pt = getLanguage() === 'pt'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days <= 0) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    if (hours <= 0) return pt ? 'agora mesmo' : 'just now'
    return pt ? `há ${hours} h` : `${hours}h ago`
  }
  if (days === 1) return pt ? 'há 1 dia' : '1d ago'
  if (days < 30) return pt ? `há ${days} dias` : `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return pt ? `há ${months} ${months === 1 ? 'mês' : 'meses'}` : `${months}mo ago`
  const years = Math.floor(months / 12)
  return pt ? `há ${years} ${years === 1 ? 'ano' : 'anos'}` : `${years}y ago`
}

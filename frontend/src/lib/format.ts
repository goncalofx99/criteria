export function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`
  }
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`
  }
  return `$${price.toFixed(0)}`
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
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days <= 0) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    if (hours <= 0) return 'just now'
    return `${hours}h ago`
  }
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

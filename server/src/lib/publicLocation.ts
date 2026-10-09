/** Public cards and maps show a neighbourhood scale, never stored precise coordinates. */
export function publicCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

// A geocoder label is arbitrary text. Only publish localities we explicitly know;
// slicing comma-delimited labels can leave a street or building name visible.
const localityGroups = [
  { label: 'Lisbon, Portugal', aliases: ['lisbon', 'lisboa'] },
  { label: 'Porto, Portugal', aliases: ['porto'] },
  { label: 'Cascais, Portugal', aliases: ['cascais'] },
  { label: 'Sintra, Portugal', aliases: ['sintra'] },
  { label: 'Braga, Portugal', aliases: ['braga'] },
  { label: 'Coimbra, Portugal', aliases: ['coimbra'] },
  { label: 'Faro, Portugal', aliases: ['faro'] },
  { label: 'Aveiro, Portugal', aliases: ['aveiro'] },
  { label: 'Lagos, Portugal', aliases: ['lagos'] },
  { label: 'Évora, Portugal', aliases: ['évora', 'evora'] },
  { label: 'Funchal, Madeira', aliases: ['funchal'] },
] as const

const publicLocalities = new Map<string, string>(localityGroups.flatMap(({ label, aliases }) =>
  aliases.map((alias) => [alias, label] as const)
))

/** Only exact city names (or their public labels) can search stored geocoder text. */
export function publicLocalitySearchAliases(value: string): readonly string[] | undefined {
  const term = value.trim().toLocaleLowerCase('pt-PT')
  return localityGroups.find(({ label, aliases }) =>
    label.toLocaleLowerCase('pt-PT') === term || aliases.some((alias) => alias === term)
  )?.aliases
}

/** Publish a known city or a country, never free-form address fragments. */
export function publicLocationText(value: string): string {
  const parts = value.split(',').map((part) => part.trim().toLocaleLowerCase('pt-PT')).filter(Boolean)
  for (const part of parts) {
    const locality = publicLocalities.get(part)
    if (locality) return locality
  }
  return parts.includes('portugal') ? 'Portugal' : 'Approximate area'
}

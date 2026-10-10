import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowRight, MapPin, Search } from 'lucide-react'
import { searchPortugalLocations, type PortugalLocationSelection, type PortugalLocationSuggestion } from '@/lib/portugalLocations'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'

interface HomeSearchProps {
  onSearch: (query: string, selection?: PortugalLocationSelection) => void
  mode?: 'properties' | 'requests'
  initialValue?: string
  className?: string
}

export function HomeSearch({ onSearch, mode = 'properties', initialValue = '', className }: HomeSearchProps) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(initialValue)
  const [selection, setSelection] = useState<PortugalLocationSelection>()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const suggestions = useMemo(() => searchPortugalLocations(draft), [draft])
  const id = useId()
  const listId = `${id}-locations`
  const inputId = `${id}-query`
  const rootRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [])

  useEffect(() => {
    if (open && activeIndex >= 0) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const choose = (option: PortugalLocationSuggestion) => {
    const chosen: PortugalLocationSelection = { type: option.type, name: option.name }
    if (option.district) chosen.district = option.district
    setDraft(option.name)
    setSelection(chosen)
    inputRef.current?.focus({ preventScroll: true })
    setOpen(false)
    setActiveIndex(-1)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOpen(false)
    const query = draft.trim()
    onSearch(query, selection?.name === query ? selection : undefined)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (open) event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return
      event.preventDefault()
      setOpen(true)
      setActiveIndex(current => event.key === 'ArrowDown'
        ? (current + 1) % suggestions.length
        : (current <= 0 ? suggestions.length - 1 : current - 1))
      return
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault()
      choose(suggestions[activeIndex])
    }
  }

  return (
    <form ref={rootRef} role="search" onSubmit={submit} className={cn('relative min-w-0 scroll-mt-[calc(env(safe-area-inset-top)+1rem)]', className)}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-foreground">{t('Localização ou palavra-chave', 'Location or keyword')}</label>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        <div className="relative flex min-w-0 items-center rounded-sm border border-border-strong bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/35 lg:flex-1">
          <Search className="ml-3 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={open && suggestions.length > 0 ? listId : undefined}
            aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            aria-describedby={`${id}-help`}
            autoComplete="off"
            enterKeyHint="search"
            value={draft}
            onChange={event => {
              setDraft(event.target.value)
              setSelection(undefined)
              setActiveIndex(-1)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              if (window.matchMedia('(max-width: 639px)').matches) rootRef.current?.scrollIntoView({ block: 'start' })
            }}
            onKeyDown={onInputKeyDown}
            placeholder={t('Cidade, distrito ou palavra-chave', 'City, district or keyword')}
            className="h-[52px] min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 lg:h-14"
          />
        </div>
        <button type="submit" className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-sm bg-primary-900 px-5 text-sm font-semibold text-primary-foreground transition-[background-color,transform] hover:bg-primary-700 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 focus-visible:ring-offset-2 motion-reduce:transform-none lg:min-h-14 lg:w-auto lg:min-w-[176px]">
          {mode === 'requests' ? t('Pesquisar critérios', 'Search criteria') : t('Pesquisar imóveis', 'Search properties')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <div id={listId} role="listbox" aria-label={draft.trim() ? t('Localizações correspondentes', 'Matching locations') : t('Distritos e regiões de Portugal', 'Districts and regions in Portugal')} className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(42dvh,320px)] overflow-y-auto overscroll-contain rounded-sm border border-border bg-surface p-1.5 shadow-[0_20px_54px_-24px_rgba(28,55,42,.3)] lg:right-[184px] lg:max-h-[min(48dvh,360px)]">
          {!draft.trim() && <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">{t('Distritos e regiões · escreva para encontrar concelhos', 'Districts & regions · type to find municipalities')}</p>}
          {suggestions.map((option, index) => (
            <button
              key={option.id}
              ref={element => { optionRefs.current[index] = element }}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              onClick={() => choose(option)}
              className={cn('flex min-h-12 w-full items-center gap-3 border-b border-border/70 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', index === activeIndex && 'bg-accent')}
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{option.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{option.detail.startsWith('Municipality') ? option.detail.replace('Municipality', t('Concelho', 'Municipality')) : option.detail === 'District' ? t('Distrito', 'District') : t('Região autónoma', 'Autonomous region')}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && draft.trim() && suggestions.length === 0 && (
        <p role="status" className="absolute inset-x-0 top-full z-50 mt-2 rounded-sm border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-lg lg:right-[184px]">{t('Localização não listada. Prima', 'No listed location. Press')} {mode === 'requests' ? t('Pesquisar critérios', 'Search criteria') : t('Pesquisar imóveis', 'Search properties')} {t(`para pesquisar «${draft.trim()}» como palavra-chave.`, `to search “${draft.trim()}” as a keyword.`)}</p>
      )}
      <span id={`${id}-help`} className="sr-only">{t('Escolha um distrito ou concelho das sugestões, ou escreva uma palavra-chave.', 'Choose a district or municipality from the suggestions, or enter any keyword.')} {mode === 'requests' ? t('Para pesquisar critérios, precisa de uma conta de vendedor. Deixe o campo vazio para explorar todos os critérios.', 'Criteria searches need a seller account. Search with an empty field to browse all criteria.') : t('Deixe o campo vazio para explorar todos os imóveis.', 'Search with an empty field to browse all properties.')}</span>
    </form>
  )
}

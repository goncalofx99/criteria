import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Language = 'pt' | 'en'
export const LANGUAGE_STORAGE_KEY = 'criteria-language'

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'en' ? 'en' : 'pt'
}

function storedLanguage(): Language {
  try { return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)) }
  catch { return 'pt' }
}

let activeLanguage: Language = storedLanguage()

/** Allows non-React display formatters to follow the current preference. */
export function getLanguage(): Language { return activeLanguage }
export function languageTag(language: Language): string { return language === 'pt' ? 'pt-PT' : 'en-GB' }

/** Keep unexpected API errors in the chosen language without exposing untranslated server copy. */
export function localizedError(cause: unknown, language: Language, portugueseFallback: string, englishFallback: string): string {
  if (language === 'pt') return portugueseFallback
  return cause instanceof Error && cause.message ? cause.message : englishFallback
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (portuguese: string, english: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(storedLanguage)

  const setLanguage = useCallback((next: Language) => {
    activeLanguage = next
    setLanguageState(next)
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next) } catch { /* Storage can be unavailable. */ }
  }, [])

  useEffect(() => {
    activeLanguage = language
    document.documentElement.lang = languageTag(language)
  }, [language])

  const t = useCallback((portuguese: string, english: string) => language === 'pt' ? portuguese : english, [language])
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

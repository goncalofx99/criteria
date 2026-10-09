import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'criteria-theme'
const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference
}

let snapshot = {
  preference: typeof window === 'undefined' ? 'system' as ThemePreference : readPreference(),
  resolved: 'light' as ResolvedTheme,
}
snapshot = { ...snapshot, resolved: resolve(snapshot.preference) }

function applyTheme() {
  if (typeof document === 'undefined') return
  const dark = snapshot.resolved === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = snapshot.resolved
  document.documentElement.dataset.themePreference = snapshot.preference
  document.documentElement.style.colorScheme = snapshot.resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14241d' : '#344e41')
}

function update(preference: ThemePreference) {
  const resolved = resolve(preference)
  if (snapshot.preference === preference && snapshot.resolved === resolved) return
  snapshot = { preference, resolved }
  applyTheme()
  listeners.forEach(listener => listener())
}

if (typeof window !== 'undefined') {
  // The synchronous head script applies the first frame; this keeps it in sync
  // with OS changes, other tabs, and user changes made after React mounts.
  applyTheme()
  media?.addEventListener('change', () => update(snapshot.preference))
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) update(readPreference())
  })
}

export function setThemePreference(preference: ThemePreference) {
  try { window.localStorage.setItem(STORAGE_KEY, preference) } catch { /* private mode */ }
  update(preference)
}

export function useTheme() {
  const current = useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    () => snapshot,
    () => snapshot,
  )
  return { ...current, setPreference: setThemePreference }
}

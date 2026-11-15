/** Persistance locale FR/EN (alignée avec sensei.language une fois connecté). */

export const LOCALE_STORAGE_KEY = 'kage-locale'

export function readStoredLocale() {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'en' || raw === 'fr') return raw
  } catch {
    /* private mode / SSR */
  }
  return null
}

export function writeStoredLocale(locale) {
  const code = locale === 'en' ? 'en' : 'fr'
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code)
  } catch {
    /* ignore */
  }
  return code
}

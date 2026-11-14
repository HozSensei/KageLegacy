import { computed, readonly, ref } from 'vue'

/*
 * Deux thèmes : clair et sombre. Le choix explicite est mémorisé ; sans choix,
 * on suit `prefers-color-scheme` et ses changements en direct.
 * Le script en ligne de `index.html` applique la même règle avant le premier rendu :
 * garder la clé et les valeurs synchronisées avec lui.
 */
export const THEME_STORAGE_KEY = 'kage-legacy-theme'
export const THEMES = ['light', 'dark']

const THEME_COLORS = { light: '#f5f0e6', dark: '#14182b' }
const systemQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(stored) ? stored : null
  } catch {
    return null
  }
}

function systemTheme() {
  return systemQuery?.matches ? 'dark' : 'light'
}

const storedTheme = ref(readStoredTheme())
const theme = ref(storedTheme.value ?? systemTheme())

function applyTheme(value) {
  theme.value = value
  const root = document.documentElement
  root.setAttribute('data-theme', value)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[value])
}

function setTheme(value) {
  if (!THEMES.includes(value)) return
  storedTheme.value = value
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Stockage indisponible (navigation privée stricte) : le choix vaut pour la session.
  }
  applyTheme(value)
}

function toggleTheme() {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

let initialized = false

export function initTheme() {
  if (initialized) return
  initialized = true
  applyTheme(theme.value)
  systemQuery?.addEventListener?.('change', () => {
    if (!storedTheme.value) applyTheme(systemTheme())
  })
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY) return
    storedTheme.value = readStoredTheme()
    applyTheme(storedTheme.value ?? systemTheme())
  })
}

export function useTheme() {
  return {
    theme: readonly(theme),
    isDark: computed(() => theme.value === 'dark'),
    setTheme,
    toggleTheme,
  }
}

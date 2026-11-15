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
  switchWithoutTransitions(() => applyTheme(value))
}

/*
 * Sans cela, seuls les éléments dotés d'une transition de couleur fondent vers le nouveau
 * thème pendant que le reste bascule d'un coup : on fige les transitions le temps d'un rendu.
 */
function switchWithoutTransitions(apply) {
  const root = document.documentElement
  root.classList.add('theme-switching')
  apply()
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => root.classList.remove('theme-switching'))
  })
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

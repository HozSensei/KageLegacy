import { computed, readonly, ref } from 'vue'

/*
 * Trois thèmes : clair (`light`), sombre indigo (`dark`), sombre encre (`ink`).
 *
 * Persistance : choix explicite dans `localStorage` (clé `THEME_STORAGE_KEY`).
 * Sans choix mémorisé, on suit `prefers-color-scheme` :
 *   - système clair → `light`
 *   - système sombre → `dark` (indigo actuel — conserve le comportement historique ;
 *     `ink` n’est jamais choisi automatiquement)
 * Le script en ligne de `index.html` applique la même règle avant le premier rendu :
 * garder la clé et les valeurs synchronisées avec lui.
 */
export const THEME_STORAGE_KEY = 'kage-legacy-theme'
export const THEMES = ['light', 'dark', 'ink']

const THEME_COLORS = {
  light: '#f5f0e6',
  dark: '#14182b',
  ink: '#1a1614',
}

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

/** Préférence système → clair ou sombre indigo (jamais `ink`). */
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

/** Cycle Clair → Sombre indigo → Sombre encre → Clair. */
function toggleTheme() {
  const order = THEMES
  const next = order[(order.indexOf(theme.value) + 1) % order.length]
  setTheme(next)
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
    themes: THEMES,
    isDark: computed(() => theme.value === 'dark' || theme.value === 'ink'),
    setTheme,
    toggleTheme,
  }
}

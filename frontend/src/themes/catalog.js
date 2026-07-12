export const THEME_STORAGE_KEY = 'kage-legacy-theme'

export const DEFAULT_THEME_ID = 'forest'

/** @type {readonly { id: string, labelKey: string, preview: [string, string, string] }[]} */
export const THEME_OPTIONS = [
  {
    id: 'forest',
    labelKey: 'theme.forest',
    preview: ['#111614', '#c9a66b', '#8fad9a'],
  },
  {
    id: 'midnight',
    labelKey: 'theme.midnight',
    preview: ['#0c1018', '#8eb4d4', '#5a7a9e'],
  },
  {
    id: 'ember',
    labelKey: 'theme.ember',
    preview: ['#16100e', '#d49a5c', '#c97d5d'],
  },
  {
    id: 'mist',
    labelKey: 'theme.mist',
    preview: ['#12161a', '#9eb0bc', '#6d8ea0'],
  },
  {
    id: 'parchment',
    labelKey: 'theme.parchment',
    preview: ['#f3ece2', '#8b6914', '#6b7c5a'],
  },
]

const THEME_IDS = new Set(THEME_OPTIONS.map((theme) => theme.id))

export function isValidThemeId(id) {
  return THEME_IDS.has(id)
}

export function resolveThemeId(id) {
  return isValidThemeId(id) ? id : DEFAULT_THEME_ID
}

export function readStoredThemeId() {
  try {
    return resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_ID
  }
}

export function applyThemeToDocument(themeId) {
  const resolved = resolveThemeId(themeId)
  document.documentElement.dataset.theme = resolved
  return resolved
}

export function persistThemeId(themeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, resolveThemeId(themeId))
  } catch {
    /* ignore quota / private mode */
  }
}

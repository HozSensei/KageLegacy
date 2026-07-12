import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DEFAULT_THEME_ID,
  THEME_OPTIONS,
  applyThemeToDocument,
  persistThemeId,
  readStoredThemeId,
  resolveThemeId,
} from '../themes/catalog'

export function initTheme() {
  return applyThemeToDocument(readStoredThemeId())
}

export const useThemeStore = defineStore('theme', () => {
  const currentId = ref(initTheme())

  const options = computed(() => THEME_OPTIONS)

  const current = computed(() => THEME_OPTIONS.find((theme) => theme.id === currentId.value) ?? THEME_OPTIONS[0])

  function setTheme(themeId) {
    const resolved = resolveThemeId(themeId)
    if (resolved === currentId.value) return
    currentId.value = resolved
    applyThemeToDocument(resolved)
    persistThemeId(resolved)
  }

  return {
    currentId,
    current,
    options,
    setTheme,
    defaultId: DEFAULT_THEME_ID,
  }
})

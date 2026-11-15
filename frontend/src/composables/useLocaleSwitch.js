import { useI18n } from 'vue-i18n'
import { writeStoredLocale } from '../utils/localeStorage.js'

/**
 * Applique une locale UI immédiatement + persiste.
 * Pour un compte connecté, préférer auth.updateLanguage puis applyLocale.
 */
export function useLocaleSwitch() {
  const { locale } = useI18n()

  function applyLocale(lang) {
    const code = lang === 'en' ? 'en' : 'fr'
    locale.value = code
    writeStoredLocale(code)
    return code
  }

  return { locale, applyLocale }
}

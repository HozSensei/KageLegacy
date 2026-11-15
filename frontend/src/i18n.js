import { createI18n } from 'vue-i18n'
import fr from './locales/fr.json'
import en from './locales/en.json'
import { readStoredLocale } from './utils/localeStorage.js'

const initialLocale = readStoredLocale() || 'fr'

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: { fr, en },
})

export default i18n

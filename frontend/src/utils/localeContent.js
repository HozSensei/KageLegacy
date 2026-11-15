/**
 * Sélection de champs catalogue bilingues (nameFr/nameEn, descriptionFr/…).
 * Prefer EN when locale starts with "en", else FR, with cross-fallback.
 */

export function normalizeLocale(locale) {
  const code = String(locale || 'fr').toLowerCase().slice(0, 2)
  return code === 'en' ? 'en' : 'fr'
}

export function isEnglishLocale(locale) {
  return normalizeLocale(locale) === 'en'
}

/**
 * @param {object|null|undefined} item
 * @param {string} baseKey camelBase without Fr/En suffix (e.g. "name", "description", "label")
 * @param {string} locale
 * @param {string} [fallback='']
 */
export function localizedField(item, baseKey, locale, fallback = '') {
  if (!item) return fallback
  const enKey = `${baseKey}En`
  const frKey = `${baseKey}Fr`
  if (isEnglishLocale(locale)) {
    return item[enKey] || item[frKey] || item[baseKey] || fallback
  }
  return item[frKey] || item[enKey] || item[baseKey] || fallback
}

export function localizedName(item, locale, fallback = '') {
  return localizedField(item, 'name', locale, fallback)
}

export function localizedDescription(item, locale, fallback = '') {
  return localizedField(item, 'description', locale, fallback)
}

export function localizedLabel(item, locale, fallback = '') {
  return localizedField(item, 'label', locale, fallback)
}

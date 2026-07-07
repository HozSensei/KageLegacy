import { useI18n } from 'vue-i18n'

export function useFormatRyos() {
  const { t, locale } = useI18n()

  function formatRyos(amount) {
    const value = typeof amount === 'number' ? amount : Number(amount) || 0
    const formatted = value.toLocaleString(locale.value === 'en' ? 'en-US' : 'fr-FR')
    return t('common.ryosAmount', { amount: formatted })
  }

  return { formatRyos }
}

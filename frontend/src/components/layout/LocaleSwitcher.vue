<script setup>
import { useI18n } from 'vue-i18n'
import { useLocaleSwitch } from '../../composables/useLocaleSwitch.js'

defineOptions({ name: 'LocaleSwitcher' })

defineProps({
  /** Compact chip row for landing / auth headers */
  compact: { type: Boolean, default: true },
})

const emit = defineEmits(['change'])

const { t } = useI18n()
const { locale, applyLocale } = useLocaleSwitch()

function setLang(lang) {
  if (locale.value === lang) return
  applyLocale(lang)
  emit('change', lang)
}
</script>

<template>
  <div class="locale-switch" :class="{ 'locale-switch--compact': compact }" role="group" :aria-label="t('profile.language')">
    <button
      type="button"
      class="chip"
      data-testid="locale-switch-fr"
      :aria-pressed="locale === 'fr'"
      @click="setLang('fr')"
    >
      {{ t('locale.fr') }}
    </button>
    <button
      type="button"
      class="chip"
      data-testid="locale-switch-en"
      :aria-pressed="locale === 'en'"
      @click="setLang('en')"
    >
      {{ t('locale.en') }}
    </button>
  </div>
</template>

<style scoped>
.locale-switch {
  display: inline-flex;
  gap: 0.35rem;
}

.locale-switch--compact :deep(.chip) {
  min-width: 2.25rem;
  padding-inline: 0.55rem;
}
</style>

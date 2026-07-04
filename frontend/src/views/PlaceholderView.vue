<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  titleKey: { type: String, required: true },
})

const { t } = useI18n()
</script>

<template>
  <div class="page-shell">
    <p class="page-kicker">À venir</p>
    <h1 class="page-title mt-3">{{ t(titleKey) }}</h1>
    <p class="page-lead">{{ t('placeholders.comingSoon') }}</p>
    <div class="mt-16 max-w-md border-l-2 border-line pl-5 text-sm leading-7 text-ink-faint">
      Cette section sera disponible dans un prochain jalon de développement.
    </div>
  </div>
</template>

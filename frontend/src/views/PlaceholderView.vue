<script setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'PlaceholderView' })

defineProps({
  titleKey: { type: String, required: true },
})

const { t } = useI18n()
</script>

<template>
  <div class="page-shell">
    <p class="page-kicker">{{ t('placeholders.kicker') }}</p>
    <h1 class="page-title mt-3">{{ t(titleKey) }}</h1>
    <p class="page-lead">{{ t('placeholders.comingSoon') }}</p>
    <div class="mt-16 max-w-md border-l-2 border-line pl-5 text-sm leading-7 text-ink-faint">
      {{ t('placeholders.devMilestone') }}
    </div>
  </div>
</template>

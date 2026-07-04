<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  titleKey: { type: String, required: true },
})

const { t } = useI18n()
</script>

<template>
  <div class="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
    <h2 class="mb-2 text-xl font-semibold text-slate-200">{{ t(titleKey) }}</h2>
    <p class="text-slate-500">{{ t('placeholders.comingSoon') }}</p>
  </div>
</template>

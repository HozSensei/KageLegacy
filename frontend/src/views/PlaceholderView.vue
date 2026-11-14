<script setup>
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'PlaceholderView' })

defineProps({
  titleKey: { type: String, required: true },
})

const { t } = useI18n()
</script>

<template>
  <div class="page-shell" data-testid="placeholder-page">
    <p class="page-kicker">{{ t('placeholders.kicker') }}</p>
    <h1 class="page-title mt-3" data-testid="placeholder-title">{{ t(titleKey) }}</h1>
    <p class="page-lead mt-3">{{ t('placeholders.comingSoon') }}</p>
    <div class="panel panel--band mt-10 max-w-xl" data-tone="gold">
      <p class="leading-relaxed text-ink">{{ t('placeholders.devMilestone') }}</p>
      <p class="mt-3 text-sm text-ink-muted">{{ t('placeholders.alphaHint') }}</p>
    </div>
    <div class="mt-6 flex flex-wrap gap-3">
      <RouterLink to="/home" class="btn-primary">{{ t('placeholders.backHome') }}</RouterLink>
      <RouterLink to="/missions" class="btn-ghost">{{ t('nav.missions') }}</RouterLink>
      <RouterLink to="/talents" class="btn-ghost">{{ t('nav.talents') }}</RouterLink>
    </div>
  </div>
</template>

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
    <p class="page-lead">{{ t('placeholders.comingSoon') }}</p>
    <div class="mt-10 max-w-md border-l-2 border-line pl-5 text-sm leading-7 text-ink-faint">
      {{ t('placeholders.devMilestone') }}
    </div>
    <p class="mt-8 text-sm text-ink-muted">{{ t('placeholders.alphaHint') }}</p>
    <div class="mt-5 flex flex-wrap gap-3">
      <RouterLink to="/home" class="btn-primary text-xs">{{ t('placeholders.backHome') }}</RouterLink>
      <RouterLink to="/missions" class="btn-ghost text-xs">{{ t('nav.missions') }}</RouterLink>
      <RouterLink to="/talents" class="btn-ghost text-xs">{{ t('nav.talents') }}</RouterLink>
    </div>
  </div>
</template>

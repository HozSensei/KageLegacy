<script setup>
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import ReconnaissancePanel from '../components/missions/ReconnaissancePanel.vue'

defineOptions({ name: 'ReconnaissanceView' })

const { t } = useI18n()
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="reconnaissance-page">
    <header>
      <p class="page-lead">{{ t('recon.pageLead') }}</p>
    </header>

    <ReconnaissancePanel standalone />

    <p class="mt-10 text-xs text-ink-faint">
      {{ t('recon.afterHint') }}
      <RouterLink to="/espionnage" class="text-accent underline-offset-2 hover:underline">
        {{ t('recon.scoutLink') }}
      </RouterLink>
    </p>
  </div>
</template>

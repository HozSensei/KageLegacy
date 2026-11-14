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

    <div class="mt-10 flex flex-wrap items-center gap-3">
      <p class="text-xs text-ink-faint">{{ t('recon.afterHint') }}</p>
      <RouterLink to="/espionnage" class="btn-ghost text-[10px]">
        {{ t('recon.scoutLink') }}
      </RouterLink>
    </div>
  </div>
</template>

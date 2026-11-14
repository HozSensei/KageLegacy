<script setup>
import { useI18n } from 'vue-i18n'
import IdleMissionPanel from '../components/bureau/IdleMissionPanel.vue'
import ReconnaissancePanel from '../components/missions/ReconnaissancePanel.vue'

defineOptions({ name: 'MissionsView' })

const { t } = useI18n()
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="missions-page">
    <header>
      <h1 class="page-title">{{ t('missions.title') }}</h1>
      <p class="page-lead mt-2">{{ t('missions.lead') }}</p>
    </header>

    <ReconnaissancePanel />
    <IdleMissionPanel standalone />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import IdleMissionPanel from '../components/bureau/IdleMissionPanel.vue'

defineOptions({ name: 'MissionsView' })

const { t } = useI18n()
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="missions-page">
    <header>
      <p class="page-lead">{{ t('missions.lead') }}</p>
    </header>

    <IdleMissionPanel standalone />
  </div>
</template>

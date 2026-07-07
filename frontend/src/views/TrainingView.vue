<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import TrainingPlansPanel from '../components/bureau/TrainingPlansPanel.vue'

defineOptions({ name: 'TrainingView' })

const { t } = useI18n()
const store = useSquadStore()

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
})
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="training-page">
    <header>
      <p class="page-lead">{{ t('training.lead') }}</p>
    </header>

    <TrainingPlansPanel standalone />
  </div>
</template>

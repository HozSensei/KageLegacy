<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import BureauActivityPanel from '../components/bureau/BureauActivityPanel.vue'

defineOptions({ name: 'CycleJournalView' })

const { t } = useI18n()
const store = useSquadStore()

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
})
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="cycle-journal-page">
    <header>
      <p class="page-lead">{{ t('journal.lead') }}</p>
    </header>

    <p v-if="store.loading && !store.sensei" class="mt-12 text-sm text-ink-muted">
      {{ t('common.loading') }}
    </p>
    <p v-else-if="store.error" class="mt-12 text-sm text-fire">{{ store.error }}</p>
    <BureauActivityPanel v-else standalone />
  </div>
</template>

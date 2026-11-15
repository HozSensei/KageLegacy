<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTrainingJournalDetails } from '../../composables/useTrainingJournalDetails.js'

const props = defineProps({
  note: { type: Object, required: true },
})

const { t } = useI18n()
const { getTrainingDetails } = useTrainingJournalDetails()

const details = computed(() => getTrainingDetails(props.note))
</script>

<template>
  <div class="training-journal-details mt-3 space-y-3 border-t border-line/60 pt-3">
    <p
      v-if="details.globalTypeLabel"
      class="text-[11px] uppercase tracking-[0.12em] text-ink-faint"
    >
      {{ t('notifications.trainingJournalGlobal', { type: details.globalTypeLabel }) }}
    </p>

    <ul class="space-y-3">
      <li
        v-for="session in details.sessions"
        :key="session.key"
        class="rounded-sm border border-line/70 bg-bg/40 px-3 py-2"
      >
        <template v-if="session.legacy">
          <p class="text-sm text-ink-muted">{{ session.gainLines[0]?.text }}</p>
        </template>
        <template v-else>
          <p class="text-sm font-medium text-ink">
            {{ session.firstName }}
            <span class="font-normal text-ink-muted">
              · {{ session.modeLabel }}
              <template v-if="session.typeLabel"> · {{ session.typeLabel }}</template>
            </span>
          </p>
          <ul class="mt-1.5 space-y-0.5">
            <li
              v-for="(line, index) in session.gainLines"
              :key="index"
              class="text-sm text-ink-muted"
              :class="{
                'text-fire': line.kind === 'skipped',
                'text-accent-soft': line.kind === 'gain',
              }"
            >
              {{ line.text }}
            </li>
          </ul>
        </template>
      </li>
    </ul>

    <ul v-if="details.billingLines.length" class="space-y-1 border-t border-line/60 pt-2">
      <li
        v-for="(line, index) in details.billingLines"
        :key="index"
        class="text-[11px] text-ink-faint"
      >
        {{ line }}
      </li>
    </ul>
  </div>
</template>

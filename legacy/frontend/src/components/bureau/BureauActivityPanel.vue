<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useNotificationCopy } from '../../composables/useNotificationCopy'
import { useTrainingJournalDetails } from '../../composables/useTrainingJournalDetails.js'
import TrainingJournalDetails from '../journal/TrainingJournalDetails.vue'

defineOptions({ name: 'BureauActivityPanel' })

defineProps({
  standalone: { type: Boolean, default: false },
})

const { t, locale } = useI18n()
const router = useRouter()
const store = useSquadStore()
const { title, body, linkPath, linkLabel } = useNotificationCopy()
const { hasTrainingDetails } = useTrainingJournalDetails()

const feed = computed(() => store.activityFeed || [])

function formatWhen(note) {
  if (!note.createdAt) return ''
  const date = new Date(note.createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openNote(note) {
  const path = linkPath(note)
  if (path) router.push(path)
}
</script>

<template>
  <section
    :class="standalone ? 'mt-10' : 'mt-10 border-t border-line pt-8'"
    data-testid="cycle-journal-feed"
  >
    <template v-if="!standalone">
      <p class="section-label">{{ t('bureau.activityTitle') }}</p>
      <p class="mt-2 text-sm text-ink-muted">{{ t('bureau.activityHint') }}</p>
    </template>

    <p v-if="!feed.length" class="mt-4 text-sm text-ink-faint">
      {{ t('bureau.activityEmpty') }}
    </p>

    <ul v-else class="mt-4 space-y-3">
      <li
        v-for="note in feed"
        :key="note.id"
        class="rounded-sm border border-line bg-bg-card/60 p-3"
        :class="{ 'border-l-2 border-l-accent': !note.read }"
      >
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-[10px] uppercase tracking-[0.14em] text-accent">{{ title(note) }}</p>
          <time class="shrink-0 text-[10px] text-ink-faint">{{ formatWhen(note) }}</time>
        </div>
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">{{ body(note) }}</p>
        <TrainingJournalDetails v-if="hasTrainingDetails(note)" :note="note" />
        <button
          v-if="linkPath(note) && linkLabel(note)"
          type="button"
          class="btn-ghost mt-2 text-[10px]"
          @click="openNote(note)"
        >
          {{ linkLabel(note) }}
        </button>
      </li>
    </ul>
  </section>
</template>

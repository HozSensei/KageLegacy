<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const store = useSquadStore()
const dismissingId = ref(null)

const birdFlightNotes = computed(() =>
  (store.notifications || []).filter((n) => n.kind === 'bird_flight')
)

async function dismiss(id) {
  dismissingId.value = id
  try {
    await store.dismissNotification(id)
  } finally {
    dismissingId.value = null
  }
}
</script>

<template>
  <section v-if="birdFlightNotes.length" class="mt-10 space-y-4">
    <article
      v-for="note in birdFlightNotes"
      :key="note.id"
      class="border-l-2 border-accent bg-accent/5 p-5"
    >
      <p class="section-label text-accent">{{ t('bureau.birdFlight.graduationTitle') }}</p>
      <p class="mt-3 text-sm text-ink">
        {{
          t('bureau.birdFlight.graduationBody', {
            name: note.payload.departed.name.split(' ')[0],
            ryos: note.payload.departed.ryosReward.toLocaleString(),
            reputation: note.payload.departed.reputationReward,
          })
        }}
      </p>
      <p class="mt-3 text-xs text-ink-muted">
        {{
          t('bureau.birdFlight.arrivalBody', {
            name: note.payload.arrival.name,
            profile: note.payload.arrival.potential || note.payload.arrival.primaryArt || '',
          })
        }}
      </p>
      <button
        type="button"
        class="btn-ghost mt-4 text-[10px]"
        :disabled="dismissingId === note.id"
        @click="dismiss(note.id)"
      >
        {{ t('bureau.birdFlight.dismiss') }}
      </button>
    </article>
  </section>
</template>

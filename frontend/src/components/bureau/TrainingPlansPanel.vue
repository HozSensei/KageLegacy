<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useFormatRyos } from '../../composables/useFormatRyos'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'

defineProps({
  standalone: { type: Boolean, default: false },
})

const { t } = useI18n()
const { formatRyos } = useFormatRyos()
const store = useSquadStore()

const FOCUS_KEYS = ['Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence']

const allNinjas = computed(() => [...store.activeSquad, ...store.bench])
const localPlans = ref({})
const saving = ref(false)

function syncFromStore() {
  const next = {}
  for (const ninja of allNinjas.value) {
    next[ninja.id] = ninja.trainingFocus ?? ''
  }
  localPlans.value = next
}

watch(allNinjas, syncFromStore, { immediate: true })

async function onPlanChange(ninjaId) {
  const raw = localPlans.value[ninjaId]
  const trainingFocus = raw === '' ? null : raw
  saving.value = true
  try {
    await store.saveTrainingPlans([{ ninjaId, trainingFocus }])
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    :class="standalone ? 'mt-10' : 'mt-10 border-t border-line pt-8'"
    data-testid="bureau-training-panel"
  >
    <template v-if="!standalone">
      <p class="section-label">{{ t('bureau.trainingPlansTitle') }}</p>
      <p class="mt-2 text-xs leading-relaxed text-ink-muted">
        {{ t('bureau.trainingPlansHint') }}
      </p>
    </template>

    <ul class="mt-4 space-y-3">
      <li
        v-for="ninja in allNinjas"
        :key="ninja.id"
        class="flex flex-wrap items-center justify-between gap-3 border border-line/60 p-3 text-sm"
      >
        <NinjaListIdentity :ninja="ninja" compact />
        <div class="flex items-center gap-3">
          <span v-if="ninja.trainingCost" class="text-xs text-ink-faint">
            {{ formatRyos(ninja.trainingCost) }}
          </span>
          <select
            :value="localPlans[ninja.id] ?? ''"
            class="strategy-select max-w-[10rem] text-xs"
            data-testid="training-plan-select"
            :disabled="saving || store.tacticsLocked()"
            @change="localPlans[ninja.id] = $event.target.value; onPlanChange(ninja.id)"
          >
            <option value="">{{ t('bureau.trainingNone') }}</option>
            <option v-for="key in FOCUS_KEYS" :key="key" :value="key">
              {{ t(`ninja.stats.${key.toLowerCase()}`) }}
            </option>
          </select>
        </div>
      </li>
    </ul>
  </div>
</template>

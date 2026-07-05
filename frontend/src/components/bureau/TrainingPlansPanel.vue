<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
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
  <div class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.trainingPlansTitle') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-muted">
      {{ t('bureau.trainingPlansHint') }}
    </p>

    <ul class="mt-4 space-y-3">
      <li
        v-for="ninja in allNinjas"
        :key="ninja.id"
        class="flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <span class="text-ink">{{ ninja.name }}</span>
        <div class="flex items-center gap-3">
          <span v-if="ninja.trainingCost" class="text-xs text-ink-faint">
            {{ ninja.trainingCost.toLocaleString() }} Ryos
          </span>
          <select
            :value="localPlans[ninja.id] ?? ''"
            class="strategy-select max-w-[10rem] text-xs"
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

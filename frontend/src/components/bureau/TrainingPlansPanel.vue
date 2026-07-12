<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useFormatRyos } from '../../composables/useFormatRyos'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'
import { previewTrainingGain, STAT_COLUMNS } from '../../utils/trainingPreview.js'

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

function selectedFocus(ninjaId) {
  const raw = localPlans.value[ninjaId]
  return raw === '' ? null : raw
}

function trainingPreview(ninja) {
  return previewTrainingGain(ninja, selectedFocus(ninja.id))
}

function formatGain(value) {
  return value.toFixed(2).replace(/\.?0+$/, '') || '0'
}

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
      <p v-if="store.trainingLocked()" class="mt-2 text-xs text-ink-muted">
        {{ t('bureau.trainingLocked') }}
      </p>
    </template>

    <ul class="mt-6 space-y-4">
      <li
        v-for="ninja in allNinjas"
        :key="ninja.id"
        class="border border-line/60 bg-bg-soft/40 p-4 text-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <NinjaListIdentity :ninja="ninja" />
          <div class="flex flex-wrap items-center gap-3">
            <span v-if="ninja.trainingCost" class="text-xs text-ink-faint">
              {{ formatRyos(ninja.trainingCost) }}
            </span>
            <select
              :value="localPlans[ninja.id] ?? ''"
              class="strategy-select max-w-[10rem] text-xs"
              data-testid="training-plan-select"
              :disabled="saving || store.trainingLocked()"
              @change="localPlans[ninja.id] = $event.target.value; onPlanChange(ninja.id)"
            >
              <option value="">{{ t('bureau.trainingNone') }}</option>
              <option v-for="key in FOCUS_KEYS" :key="key" :value="key">
                {{ t(`ninja.stats.${key.toLowerCase()}`) }}
              </option>
            </select>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <div
            v-for="column in STAT_COLUMNS"
            :key="`${ninja.id}-${column}`"
            class="rounded-sm border border-line/50 bg-bg-card/60 px-2 py-1.5 text-center"
            :class="{
              'border-accent/50 bg-accent/10': trainingPreview(ninja)?.column === column && selectedFocus(ninja.id),
            }"
          >
            <dt class="text-[9px] uppercase tracking-[0.1em] text-ink-faint">
              {{ t(`ninja.stats.${column}`) }}
            </dt>
            <dd class="mt-0.5 font-display text-base tabular-nums text-ink">
              {{ ninja[column] }}
              <span
                v-if="ninja.gradeStatCaps?.[column]"
                class="text-[10px] text-ink-faint"
              >/{{ ninja.gradeStatCaps[column] }}</span>
            </dd>
          </div>
        </dl>

        <div
          v-if="selectedFocus(ninja.id) && trainingPreview(ninja)"
          class="mt-3 border-t border-line/40 pt-3 text-xs text-ink-muted"
        >
          <template v-if="trainingPreview(ninja).atCap">
            <p>{{ t('training.atCap', { stat: t(`ninja.stats.${trainingPreview(ninja).column}`) }) }}</p>
          </template>
          <template v-else>
            <p>
              {{ t('training.gainPreview', {
                stat: t(`ninja.stats.${trainingPreview(ninja).column}`),
                gain: formatGain(trainingPreview(ninja).gain),
              }) }}
              <span v-if="trainingPreview(ninja).wholePoints > 0" class="text-accent">
                {{ t('training.pointGain', { count: trainingPreview(ninja).wholePoints }) }}
              </span>
              <span v-else class="text-ink-faint">
                {{ t('training.residualProgress', { residual: formatGain(trainingPreview(ninja).residualAfter) }) }}
              </span>
            </p>
            <p v-if="trainingPreview(ninja).lazyRisk" class="mt-1 text-ink-faint">
              {{ t('training.lazyRisk') }}
            </p>
          </template>
        </div>
      </li>
    </ul>
  </div>
</template>

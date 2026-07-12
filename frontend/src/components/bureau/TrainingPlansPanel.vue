<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useFormatRyos } from '../../composables/useFormatRyos'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'
import {
  combinePreviews,
  previewTrainingSession,
  STAT_COLUMNS,
  TRAINING_TYPE_VALUES,
} from '../../utils/trainingPreview.js'

defineProps({
  standalone: { type: Boolean, default: false },
})

const { t } = useI18n()
const { formatRyos } = useFormatRyos()
const store = useSquadStore()

const activeNinjas = computed(() => store.activeSquad)
const benchNinjas = computed(() => store.bench)
const localPrepPlans = ref({})
const localGlobalType = ref('')
const saving = ref(false)

function syncFromStore() {
  const next = {}
  for (const ninja of activeNinjas.value) {
    next[ninja.id] = ninja.preparationType ?? ninja.trainingFocus ?? ''
  }
  localPrepPlans.value = next
  localGlobalType.value = store.sensei?.globalTrainingType ?? ''
}

watch([activeNinjas, () => store.sensei?.globalTrainingType], syncFromStore, { immediate: true })

function selectedPrepType(ninjaId) {
  const raw = localPrepPlans.value[ninjaId]
  return raw === '' ? null : raw
}

function globalType() {
  const raw = localGlobalType.value
  return raw === '' ? null : raw
}

function trainingPreview(ninja, isActive) {
  const prep = isActive
    ? previewTrainingSession(ninja, selectedPrepType(ninja.id), 'preparation')
    : null
  const global = globalType()
    ? previewTrainingSession(ninja, globalType(), 'global')
    : null
  return combinePreviews(prep, global)
}

function formatGain(value) {
  return value.toFixed(2).replace(/\.?0+$/, '') || '0'
}

function statCap(ninja, column) {
  return ninja.gradeStatCaps?.[column] ?? null
}

function statPercent(ninja, column) {
  const cap = statCap(ninja, column)
  if (!cap) return 100
  return Math.min(100, (Number(ninja[column] ?? 0) / cap) * 100)
}

function statPreviewFor(ninja, column, isActive) {
  const preview = trainingPreview(ninja, isActive)
  return preview?.statPreviews?.find((entry) => entry.column === column) ?? null
}

function isFocusedStat(ninja, column, isActive) {
  const preview = statPreviewFor(ninja, column, isActive)
  return Boolean(preview && !preview.atCap && preview.avgGain > 0)
}

async function onPrepChange(ninjaId) {
  const raw = localPrepPlans.value[ninjaId]
  const preparationType = raw === '' ? null : raw
  saving.value = true
  try {
    await store.saveTrainingPlans({ plans: [{ ninjaId, preparationType }] })
  } finally {
    saving.value = false
  }
}

async function onGlobalChange() {
  const globalTrainingType = globalType()
  saving.value = true
  try {
    await store.saveTrainingPlans({ globalTrainingType })
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
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        {{ t('bureau.trainingPlansHint') }}
      </p>
    </template>

    <p v-if="store.trainingLocked()" class="mt-2 text-sm text-ink-muted">
      {{ t('bureau.trainingLocked') }}
    </p>

    <section class="mt-6 rounded-lg border border-line bg-surface/40 p-4">
      <label class="block">
        <span class="text-sm font-medium text-ink">{{ t('training.globalLabel') }}</span>
        <p class="mt-1 text-xs text-ink-muted">{{ t('training.globalHint') }}</p>
        <select
          :value="localGlobalType"
          class="training-focus-select mt-3 w-full max-w-md"
          data-testid="global-training-select"
          :disabled="saving || store.trainingLocked()"
          @change="localGlobalType = $event.target.value; onGlobalChange()"
        >
          <option value="">{{ t('bureau.trainingNone') }}</option>
          <option v-for="key in TRAINING_TYPE_VALUES" :key="key" :value="key">
            {{ t(`training.types.${key}`) }}
          </option>
        </select>
      </label>
    </section>

    <section class="mt-8">
      <p class="section-label">{{ t('training.prepSectionTitle') }}</p>
      <p class="mt-1 text-xs text-ink-muted">{{ t('training.prepSectionHint') }}</p>

      <ul class="training-grid mt-4">
        <li
          v-for="ninja in activeNinjas"
          :key="ninja.id"
          class="training-card"
        >
          <div class="training-card__header">
            <NinjaListIdentity :ninja="ninja" compact />
          </div>

          <dl class="training-card__stats">
            <div
              v-for="column in STAT_COLUMNS"
              :key="`${ninja.id}-${column}`"
              class="training-stat"
              :class="{ 'training-stat--focused': isFocusedStat(ninja, column, true) }"
            >
              <div class="training-stat__head">
                <dt class="training-stat__label">{{ t(`ninja.stats.${column}`) }}</dt>
                <dd class="training-stat__value">
                  {{ ninja[column] }}
                  <span v-if="statCap(ninja, column)" class="training-stat__cap">
                    / {{ statCap(ninja, column) }}
                  </span>
                </dd>
              </div>
              <div class="training-stat__track" aria-hidden="true">
                <div
                  class="training-stat__fill"
                  :style="{ width: `${statPercent(ninja, column)}%` }"
                />
              </div>
            </div>
          </dl>

          <div class="training-card__footer">
            <div class="training-card__cost-row">
              <span class="training-card__cost-label">{{ t('training.costLabel') }}</span>
              <span v-if="ninja.preparationCost && selectedPrepType(ninja.id)" class="training-card__cost">
                {{ formatRyos(ninja.preparationCost ?? ninja.trainingCost) }}
              </span>
              <span v-else class="training-card__cost training-card__cost--idle">
                {{ t('bureau.trainingNone') }}
              </span>
            </div>

            <label class="training-card__focus">
              <span class="training-card__focus-label">{{ t('training.prepLabel') }}</span>
              <select
                :value="localPrepPlans[ninja.id] ?? ''"
                class="training-focus-select"
                data-testid="training-plan-select"
                :disabled="saving || store.trainingLocked()"
                @change="localPrepPlans[ninja.id] = $event.target.value; onPrepChange(ninja.id)"
              >
                <option value="">{{ t('bureau.trainingNone') }}</option>
                <option v-for="key in TRAINING_TYPE_VALUES" :key="key" :value="key">
                  {{ t(`training.types.${key}`) }}
                </option>
              </select>
            </label>

            <div
              v-if="trainingPreview(ninja, true)"
              class="training-card__preview"
            >
              <template v-if="trainingPreview(ninja, true).allCapped">
                <p>{{ t('training.allCapped') }}</p>
              </template>
              <template v-else>
                <p
                  v-for="statPreview in trainingPreview(ninja, true).statPreviews.filter((entry) => !entry.atCap && entry.avgGain > 0)"
                  :key="`${ninja.id}-preview-${statPreview.column}`"
                >
                  {{ t('training.gainRangePreview', {
                    stat: t(`ninja.stats.${statPreview.column}`),
                    min: formatGain(statPreview.minGain),
                    max: formatGain(statPreview.maxGain),
                  }) }}
                </p>
                <p v-if="trainingPreview(ninja, true).lazyRisk" class="mt-1 text-ink-faint">
                  {{ t('training.lazyRisk') }}
                </p>
              </template>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="benchNinjas.length" class="mt-10">
      <p class="section-label">{{ t('training.benchSectionTitle') }}</p>
      <p class="mt-1 text-xs text-ink-muted">{{ t('training.benchSectionHint') }}</p>

      <ul class="training-grid mt-4">
        <li
          v-for="ninja in benchNinjas"
          :key="`bench-${ninja.id}`"
          class="training-card training-card--bench"
        >
          <div class="training-card__header">
            <NinjaListIdentity :ninja="ninja" compact />
          </div>

          <div
            v-if="globalType() && trainingPreview(ninja, false)"
            class="training-card__preview px-4 pb-4"
          >
            <template v-if="trainingPreview(ninja, false).allCapped">
              <p class="text-sm text-ink-muted">{{ t('training.allCapped') }}</p>
            </template>
            <template v-else>
              <p
                v-for="statPreview in trainingPreview(ninja, false).statPreviews.filter((entry) => !entry.atCap && entry.avgGain > 0)"
                :key="`${ninja.id}-bench-${statPreview.column}`"
                class="text-sm"
              >
                {{ t('training.gainRangePreview', {
                  stat: t(`ninja.stats.${statPreview.column}`),
                  min: formatGain(statPreview.minGain),
                  max: formatGain(statPreview.maxGain),
                }) }}
              </p>
            </template>
          </div>
          <p v-else class="px-4 pb-4 text-sm text-ink-faint">
            {{ t('training.benchNoGlobal') }}
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>

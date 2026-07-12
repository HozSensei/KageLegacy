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

function statCap(ninja, column) {
  return ninja.gradeStatCaps?.[column] ?? null
}

function statPercent(ninja, column) {
  const cap = statCap(ninja, column)
  if (!cap) return 100
  return Math.min(100, (Number(ninja[column] ?? 0) / cap) * 100)
}

function projectedPercent(ninja, column, preview) {
  if (!preview || preview.column !== column || preview.atCap) return statPercent(ninja, column)
  const cap = statCap(ninja, column)
  if (!cap) return statPercent(ninja, column)
  return Math.min(100, (preview.projectedStat / cap) * 100)
}

function isFocusedStat(ninja, column) {
  return trainingPreview(ninja)?.column === column && selectedFocus(ninja.id)
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
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        {{ t('bureau.trainingPlansHint') }}
      </p>
      <p v-if="store.trainingLocked()" class="mt-2 text-sm text-ink-muted">
        {{ t('bureau.trainingLocked') }}
      </p>
    </template>

    <p v-else-if="store.trainingLocked()" class="text-sm text-ink-muted">
      {{ t('bureau.trainingLocked') }}
    </p>

    <ul class="training-grid mt-8">
      <li
        v-for="ninja in allNinjas"
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
            :class="{ 'training-stat--focused': isFocusedStat(ninja, column) }"
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
              <div
                v-if="isFocusedStat(ninja, column) && trainingPreview(ninja) && !trainingPreview(ninja).atCap"
                class="training-stat__gain"
                :style="{
                  left: `${statPercent(ninja, column)}%`,
                  width: `${Math.max(0, projectedPercent(ninja, column, trainingPreview(ninja)) - statPercent(ninja, column))}%`,
                }"
              />
            </div>
          </div>
        </dl>

        <div class="training-card__footer">
          <div class="training-card__cost-row">
            <span class="training-card__cost-label">{{ t('training.costLabel') }}</span>
            <span v-if="ninja.trainingCost && selectedFocus(ninja.id)" class="training-card__cost">
              {{ formatRyos(ninja.trainingCost) }}
            </span>
            <span v-else class="training-card__cost training-card__cost--idle">
              {{ t('bureau.trainingNone') }}
            </span>
          </div>

          <label class="training-card__focus">
            <span class="training-card__focus-label">{{ t('training.focusLabel') }}</span>
            <select
              :value="localPlans[ninja.id] ?? ''"
              class="training-focus-select"
              data-testid="training-plan-select"
              :disabled="saving || store.trainingLocked()"
              @change="localPlans[ninja.id] = $event.target.value; onPlanChange(ninja.id)"
            >
              <option value="">{{ t('bureau.trainingNone') }}</option>
              <option v-for="key in FOCUS_KEYS" :key="key" :value="key">
                {{ t(`ninja.stats.${key.toLowerCase()}`) }}
              </option>
            </select>
          </label>

          <div
            v-if="selectedFocus(ninja.id) && trainingPreview(ninja)"
            class="training-card__preview"
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
        </div>
      </li>
    </ul>
  </div>
</template>

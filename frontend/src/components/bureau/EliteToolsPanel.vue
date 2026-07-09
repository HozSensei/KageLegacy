<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEliteStore } from '../../stores/elite'

defineOptions({ name: 'EliteToolsPanel' })

const { t } = useI18n()
const elite = useEliteStore()

const opponentComp = ref('assaut')
const simulating = ref(false)
const simError = ref(null)

const isActive = computed(() => Boolean(elite.subscription?.isActive))
const tools = computed(() => elite.tools)
const matchup = computed(() => elite.lastMatchup)

onMounted(async () => {
  if (!elite.subscription) await elite.fetchElite()
})

watch(
  () => elite.subscription?.isActive,
  (active) => {
    if (active) elite.fetchTools()
  },
  { immediate: true }
)

async function runMatchup() {
  simulating.value = true
  simError.value = null
  try {
    await elite.simulateMatchup(opponentComp.value)
  } catch (e) {
    simError.value = e.message
  } finally {
    simulating.value = false
  }
}
</script>

<template>
  <div v-if="isActive" class="mt-10 border-t border-line pt-8" data-testid="elite-tools-panel">
    <p class="section-label">{{ t('eliteTools.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('eliteTools.lead') }}</p>

    <p v-if="elite.toolsLoading && !tools" class="mt-4 text-sm text-ink-muted">{{ t('common.loading') }}</p>

    <template v-else-if="tools">
      <section class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.seasonTitle') }}</p>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-ink-faint">{{ t('senseiProfile.wins') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats.wins }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">{{ t('senseiProfile.draws') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats.draws }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">{{ t('senseiProfile.losses') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats.losses }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">{{ t('eliteReport.possession') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats.avgPossession ?? '—' }}%</dd>
          </div>
        </dl>
      </section>

      <section class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.compTitle') }}</p>
        <p class="mt-2 text-sm text-ink">{{ tools.composition.label }}</p>
        <ul class="mt-2 space-y-1 text-xs text-ink-muted">
          <li v-for="(tip, i) in tools.composition.tips" :key="i">{{ tip }}</li>
        </ul>
      </section>

      <section v-if="tools.trainingRoi?.length" class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.trainingTitle') }}</p>
        <ul class="mt-3 space-y-2 text-xs">
          <li
            v-for="row in tools.trainingRoi"
            :key="row.ninjaId"
            class="border border-line/50 px-3 py-2 text-ink-muted"
          >
            <span class="text-ink">{{ row.ninjaName }}</span>
            · {{ row.focus }}
            · {{ row.netCost }} Ryos
            <span v-if="row.expectedGain"> · +{{ row.expectedGain.toFixed(1) }} {{ row.stat }}</span>
            <span v-if="row.atCap" class="text-ink-faint"> ({{ t('eliteTools.atCap') }})</span>
          </li>
        </ul>
      </section>

      <section class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.matchupTitle') }}</p>
        <p class="mt-2 text-xs text-ink-muted">{{ t('eliteTools.matchupHint') }}</p>
        <div class="mt-3 flex flex-wrap items-end gap-3">
          <label class="text-xs">
            <span class="text-ink-muted">{{ t('eliteTools.opponentComp') }}</span>
            <select
              v-model="opponentComp"
              class="mt-1 block border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="elite-matchup-select"
            >
              <option v-for="c in tools.compositionOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <button
            type="button"
            class="btn-ghost text-xs"
            :disabled="simulating"
            data-testid="elite-matchup-run"
            @click="runMatchup"
          >
            {{ simulating ? t('common.loading') : t('eliteTools.runSim') }}
          </button>
        </div>
        <p v-if="simError" class="mt-2 text-xs text-fire">{{ simError }}</p>
        <div v-if="matchup" class="mt-4 border border-accent/30 bg-bg-card/40 p-4 text-sm">
          <p class="text-ink">
            {{ t('eliteTools.simResult', { win: matchup.winPct, draw: matchup.drawPct, loss: matchup.lossPct }) }}
          </p>
          <p class="mt-1 text-xs text-ink-faint">
            {{ t('eliteTools.simMeta', { runs: matchup.runs, tours: matchup.avgTours, ko: matchup.koPct }) }}
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

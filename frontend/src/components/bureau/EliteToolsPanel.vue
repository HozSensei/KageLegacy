<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useEliteStore } from '../../stores/elite'

defineOptions({ name: 'EliteToolsPanel' })

defineProps({
  embedded: { type: Boolean, default: false },
})

const { t } = useI18n()
const elite = useEliteStore()

const opponentComp = ref('mixed')
const opponentLevel = ref('similar')
const simulating = ref(false)
const simError = ref(null)

const isActive = computed(() => Boolean(elite.subscription?.isActive))
const tools = computed(() => elite.tools)
const matchup = computed(() => elite.lastMatchup)

const verdictToneClass = computed(() => {
  const tone = matchup.value?.verdict?.tone
  if (tone === 'favorable') return 'border-water/40 text-water'
  if (tone === 'unfavorable') return 'border-fire/40 text-fire'
  return 'border-accent/40 text-accent'
})

const rulesCompLink = { path: '/rules', hash: '#cartes-tactiques' }

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
    await elite.simulateMatchup(opponentComp.value, opponentLevel.value)
  } catch (e) {
    simError.value = e.message
  } finally {
    simulating.value = false
  }
}
</script>

<template>
  <div
    v-if="isActive"
    :class="embedded ? 'mt-10' : 'mt-10 border-t border-line pt-8'"
    data-testid="elite-tools-panel"
  >
    <template v-if="!embedded">
      <p class="section-label">{{ t('eliteTools.title') }}</p>
      <p class="mt-2 text-xs text-ink-muted">{{ t('eliteTools.lead') }}</p>
    </template>

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
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.ordersTitle') }}</p>
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
        <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ t('eliteTools.matchupHint') }}</p>
        <RouterLink
          :to="rulesCompLink"
          class="mt-2 inline-block text-xs text-accent underline-offset-2 hover:underline"
          data-testid="elite-tools-rules-link"
        >
          {{ t('eliteTools.rulesCompLink') }}
        </RouterLink>
        <div class="mt-3 flex flex-wrap items-end gap-3">
          <label class="text-xs">
            <span class="text-ink-muted">{{ t('eliteTools.opponentStyle') }}</span>
            <select
              v-model="opponentComp"
              class="mt-1 block border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="elite-matchup-select"
            >
              <option
                v-for="c in tools.compositionOptions"
                :key="c.value ?? c"
                :value="c.value ?? c"
              >
                {{ c.label ?? c }}
              </option>
            </select>
          </label>
          <label class="text-xs">
            <span class="text-ink-muted">{{ t('eliteTools.opponentLevel') }}</span>
            <select
              v-model="opponentLevel"
              class="mt-1 block border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="elite-matchup-level-select"
            >
              <option
                v-for="lvl in tools.levelOptions"
                :key="lvl.value"
                :value="lvl.value"
              >
                {{ lvl.label }}
              </option>
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

        <div v-if="matchup" class="mt-4 border border-accent/30 bg-bg-card/40 p-4 text-sm" data-testid="elite-matchup-result">
          <p class="text-xs text-ink-muted">
            {{ t('eliteTools.simDuel', { mine: matchup.myCompositionLabel, opp: matchup.opponentCompositionLabel }) }}
            <span v-if="matchup.opponentLevelLabel" class="text-ink-faint">
              · {{ t('eliteTools.simLevel', { level: matchup.opponentLevelLabel }) }}
            </span>
          </p>

          <p class="mt-3 text-base font-semibold" :class="verdictToneClass">
            {{ matchup.verdict?.headline }}
          </p>

          <div class="mt-4 space-y-2">
            <div class="flex items-center gap-2 text-xs">
              <span class="w-16 shrink-0 text-ink-faint">{{ t('senseiProfile.wins') }}</span>
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-bg-soft">
                <div class="h-full bg-water" :style="{ width: `${matchup.winPct}%` }" />
              </div>
              <span class="w-10 text-right text-ink">{{ matchup.winPct }}%</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-16 shrink-0 text-ink-faint">{{ t('senseiProfile.draws') }}</span>
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-bg-soft">
                <div class="h-full bg-accent/70" :style="{ width: `${matchup.drawPct}%` }" />
              </div>
              <span class="w-10 text-right text-ink">{{ matchup.drawPct }}%</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-16 shrink-0 text-ink-faint">{{ t('senseiProfile.losses') }}</span>
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-bg-soft">
                <div class="h-full bg-fire/80" :style="{ width: `${matchup.lossPct}%` }" />
              </div>
              <span class="w-10 text-right text-ink">{{ matchup.lossPct }}%</span>
            </div>
          </div>

          <p class="mt-3 text-xs text-ink-faint">
            {{ t('eliteTools.simMeta', { runs: matchup.runs, tours: matchup.avgTours, ko: matchup.koPct }) }}
          </p>

          <ul v-if="matchup.verdict?.factors?.length" class="mt-4 space-y-2 border-t border-line/50 pt-3 text-xs leading-relaxed text-ink-muted">
            <li class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.whyTitle') }}</li>
            <li v-for="(factor, i) in matchup.verdict.factors" :key="`f-${i}`">· {{ factor }}</li>
          </ul>

          <div v-if="matchup.verdict?.advice?.length" class="mt-4 border-t border-line/50 pt-3">
            <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.adviceTitle') }}</p>
            <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink">
              <li v-for="(tip, i) in matchup.verdict.advice" :key="`a-${i}`">→ {{ tip }}</li>
            </ul>
            <RouterLink
              :to="rulesCompLink"
              class="mt-3 inline-block text-xs text-accent underline-offset-2 hover:underline"
            >
              {{ t('eliteTools.rulesCompLink') }}
            </RouterLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

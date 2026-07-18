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

const opponentLevel = ref('similar')
const customTechniqueSlugsByNinja = ref([[], [], []])
const simulating = ref(false)
const simError = ref(null)
const prefillMessage = ref(null)

const isActive = computed(() => Boolean(elite.subscription?.isActive))
const tools = computed(() => elite.tools)
const matchup = computed(() => elite.lastMatchup)
const builder = computed(() => tools.value?.matchupBuilder)
const scoutPrefill = computed(() => tools.value?.scoutPrefill)

const verdictToneClass = computed(() => {
  const tone = matchup.value?.verdict?.tone
  if (tone === 'favorable') return 'border-water/40 text-water'
  if (tone === 'unfavorable') return 'border-fire/40 text-fire'
  return 'border-accent/40 text-accent'
})

const rulesCompLink = { path: '/rules', hash: '#cartes-tactiques' }

function initCustomDeckFromBuilder() {
  const b = builder.value
  if (!b) return
  customTechniqueSlugsByNinja.value = (b.defaultTechniqueSlugsByNinja || [[], [], []]).map((row) => [...row])
}

function fillPreset(profile) {
  const preset = builder.value?.presets?.[profile]
  if (!preset) return
  customTechniqueSlugsByNinja.value = (preset.techniqueSlugsByNinja || [[], [], []]).map((row) => [...row])
  prefillMessage.value = null
}

function fillFromScout() {
  const prefill = scoutPrefill.value
  if (!prefill?.available || !prefill.config) return
  customTechniqueSlugsByNinja.value = (prefill.config.techniqueSlugsByNinja || [[], [], []]).map((row) => [...row])
  prefillMessage.value = prefill.summary
}

function scoutUnavailableHint() {
  const reason = scoutPrefill.value?.reason
  if (!reason) return ''
  const key = `eliteTools.scoutPrefillUnavailable.${reason}`
  const translated = t(key, { opponent: scoutPrefill.value?.opponentName ?? '—' })
  return translated === key ? reason : translated
}

function toggleTechnique(ninjaIndex, slug) {
  const row = [...(customTechniqueSlugsByNinja.value[ninjaIndex] || [])]
  const idx = row.indexOf(slug)
  if (idx >= 0) row.splice(idx, 1)
  else if (row.length < (builder.value?.maxTechniquesPerNinja ?? 3)) row.push(slug)
  customTechniqueSlugsByNinja.value[ninjaIndex] = row
  customTechniqueSlugsByNinja.value = [...customTechniqueSlugsByNinja.value]
}

onMounted(async () => {
  if (!elite.subscription) await elite.fetchElite()
  if (elite.subscription?.isActive && !elite.tools && !elite.toolsLoading) {
    await elite.fetchTools()
  }
})

watch(
  () => elite.subscription?.isActive,
  (active) => {
    if (active) elite.fetchTools()
  },
  { immediate: true }
)

watch(
  () => builder.value,
  () => {
    if (!customTechniqueSlugsByNinja.value.some((row) => row.length)) initCustomDeckFromBuilder()
  },
  { immediate: true }
)

async function runMatchup() {
  simulating.value = true
  simError.value = null
  try {
    await elite.simulateMatchup(null, opponentLevel.value, 100, {
      techniqueSlugsByNinja: customTechniqueSlugsByNinja.value.map((row) => [...row]),
    })
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

    <div v-else-if="elite.toolsError" class="mt-4 border border-fire/40 px-4 py-3 text-sm" data-testid="elite-tools-error">
      <p class="text-fire">{{ t('eliteTools.loadError') }}</p>
      <p class="mt-1 text-xs text-ink-muted">{{ elite.toolsError }}</p>
      <button type="button" class="btn-ghost mt-3 text-xs" @click="elite.fetchTools()">
        {{ t('eliteTools.retry') }}
      </button>
    </div>

    <template v-else-if="tools">
      <section class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.seasonTitle') }}</p>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-ink-faint">{{ t('senseiProfile.wins') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats?.wins ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">{{ t('senseiProfile.draws') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats?.draws ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">{{ t('senseiProfile.losses') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats?.losses ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">{{ t('eliteReport.plisWon') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats?.avgPlisShare ?? '—' }}%</dd>
          </div>
        </dl>
      </section>

      <section class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.ordersTitle') }}</p>
        <p class="mt-2 text-sm text-ink">{{ tools.orders?.label ?? tools.composition?.label }}</p>
        <ul class="mt-2 space-y-1 text-xs text-ink-muted">
          <li v-for="(tip, i) in (tools.orders?.tips ?? tools.composition?.tips)" :key="i">{{ tip }}</li>
        </ul>
      </section>

      <section v-if="tools.preparationChallenges?.challenges?.length" class="mt-8">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('eliteTools.challengesTitle') }}</p>
        <p class="mt-2 text-xs text-ink-muted">{{ t('eliteTools.challengesLead') }}</p>
        <p class="mt-2 text-xs text-ink-faint">
          {{ t('eliteTools.challengesSummary', tools.preparationChallenges.summary) }}
        </p>
        <ul class="mt-4 space-y-2">
          <li
            v-for="item in tools.preparationChallenges.challenges"
            :key="item.id"
            class="border px-3 py-2 text-xs"
            :class="{
              'border-water/40 text-water': item.status === 'done',
              'border-fire/40 text-fire': item.status === 'pending',
              'border-accent/40 text-accent': item.status === 'warning',
            }"
            :data-testid="`elite-challenge-${item.id}`"
          >
            <span class="font-medium text-ink">{{ item.title }}</span>
            <span class="mt-1 block leading-relaxed text-ink-muted">{{ item.detail }}</span>
          </li>
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
          class="btn-ghost mt-3 text-[10px]"
          data-testid="elite-tools-rules-link"
        >
          {{ t('eliteTools.rulesCompLink') }}
        </RouterLink>
        <div class="mt-4 space-y-6 border border-line/60 p-4" data-testid="elite-matchup-builder">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {{ t('eliteTools.customDeckTitle') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-primary text-[10px]"
                :disabled="!scoutPrefill?.available"
                data-testid="elite-matchup-scout-prefill"
                @click="fillFromScout"
              >
                {{ t('eliteTools.fillFromScout') }}
              </button>
              <button
                v-for="preset in tools.opponentProfileOptions"
                :key="preset.value"
                type="button"
                class="btn-ghost text-[10px]"
                @click="fillPreset(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
          <p v-if="prefillMessage" class="text-[11px] text-water">{{ prefillMessage }}</p>
          <p v-else-if="!scoutPrefill?.available && scoutPrefill?.reason" class="text-[11px] text-ink-faint">
            {{ scoutUnavailableHint() }}
          </p>

          <ul v-if="customTechniqueSlugsByNinja.length" class="space-y-3">
            <li
              v-for="(row, index) in customTechniqueSlugsByNinja"
              :key="`ninja-${index}`"
              class="border border-line/50 p-3 text-xs"
            >
              <p class="font-medium text-ink">
                {{ t('eliteTools.opponentSlot', { n: index + 1 }) }}
              </p>
              <ul class="mt-2 flex flex-wrap gap-2">
                <li v-for="technique in builder?.techniqueOptions" :key="`${index}-${technique.slug}`">
                  <button
                    type="button"
                    class="border px-2 py-1 text-[11px]"
                    :class="
                      row.includes(technique.slug)
                        ? 'border-accent text-accent'
                        : 'border-line text-ink-muted'
                    "
                    @click="toggleTechnique(index, technique.slug)"
                  >
                    {{ technique.label }}
                  </button>
                </li>
              </ul>
              <p class="mt-2 text-[11px] text-ink-faint">
                {{ t('eliteTools.techniquePickCount', { n: row.length, max: builder?.maxTechniquesPerNinja ?? 3 }) }}
              </p>
            </li>
          </ul>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-3">
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
            <span class="mt-1 block max-w-xs text-[10px] leading-relaxed text-ink-faint">
              {{ t('eliteTools.levelHint') }}
            </span>
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
            <template v-if="matchup.matchProcPct != null">
              · {{ t('eliteTools.simCardProcs', { pct: matchup.matchProcPct, rate: matchup.cardProcsPerMatch }) }}
            </template>
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
              class="btn-ghost mt-3 text-[10px]"
            >
              {{ t('eliteTools.rulesCompLink') }}
            </RouterLink>
          </div>
        </div>
      </section>
    </template>

    <p v-else class="mt-4 text-sm text-ink-muted" data-testid="elite-tools-empty">
      {{ t('eliteTools.empty') }}
    </p>
  </div>
</template>

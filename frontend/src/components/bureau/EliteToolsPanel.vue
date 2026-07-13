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
const customSlots = ref([])
const customElementSlugs = ref([])
const simulating = ref(false)
const simError = ref(null)

const isActive = computed(() => Boolean(elite.subscription?.isActive))
const tools = computed(() => elite.tools)
const matchup = computed(() => elite.lastMatchup)
const builder = computed(() => tools.value?.matchupBuilder)

const verdictToneClass = computed(() => {
  const tone = matchup.value?.verdict?.tone
  if (tone === 'favorable') return 'border-water/40 text-water'
  if (tone === 'unfavorable') return 'border-fire/40 text-fire'
  return 'border-accent/40 text-accent'
})

const rulesCompLink = { path: '/rules', hash: '#cartes-tactiques' }

function domainLabel(key) {
  return t(`squad.deck.domains.${key}`, key)
}

function initCustomDeckFromBuilder() {
  const b = builder.value
  if (!b) return
  customSlots.value = (b.defaultSlots || []).map((slot) => ({ ...slot }))
  customElementSlugs.value = [...(b.defaultElementSlugs || [])]
}

function fillPreset(profile) {
  const preset = builder.value?.presets?.[profile]
  if (!preset) return
  customSlots.value = preset.slots.map((slot) => ({ ...slot }))
  customElementSlugs.value = [...(preset.elementSlugs || [])]
}

function toggleElement(slug) {
  const set = new Set(customElementSlugs.value)
  if (set.has(slug)) set.delete(slug)
  else if (set.size < (builder.value?.maxElements ?? 5)) set.add(slug)
  customElementSlugs.value = [...set]
}

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

watch(
  () => builder.value,
  () => {
    if (!customSlots.value.length) initCustomDeckFromBuilder()
  },
  { immediate: true }
)

async function runMatchup() {
  simulating.value = true
  simError.value = null
  try {
    await elite.simulateMatchup(null, opponentLevel.value, 100, {
      slots: customSlots.value.map((slot) => ({
        configured: Boolean(slot.configured),
        primary: slot.primary,
        secondary: slot.secondary,
      })),
      elementSlugs: [...customElementSlugs.value],
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
            <dt class="text-ink-faint">{{ t('eliteReport.plisWon') }}</dt>
            <dd class="text-ink">{{ tools.seasonStats.avgPlisShare ?? '—' }}%</dd>
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
          class="mt-2 inline-block text-xs text-accent underline-offset-2 hover:underline"
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
                v-for="preset in tools.opponentProfileOptions"
                :key="preset.value"
                type="button"
                class="border border-line px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:border-accent hover:text-accent"
                @click="fillPreset(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <ul v-if="customSlots.length" class="space-y-3">
            <li
              v-for="(slot, index) in customSlots"
              :key="`slot-${index}`"
              class="border border-line/50 p-3 text-xs"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-medium text-ink">
                  {{ t('eliteTools.opponentSlot', { n: index + 1 }) }}
                </p>
                <label class="flex items-center gap-2 text-ink-muted">
                  <input v-model="slot.configured" type="checkbox" />
                  {{ t('eliteTools.techniquesConfigured') }}
                </label>
              </div>
              <div v-if="slot.configured" class="mt-3 grid gap-3 sm:grid-cols-2">
                <label class="text-ink-muted">
                  {{ t('squad.deck.primary') }}
                  <select
                    v-model="slot.primary"
                    class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm text-ink"
                  >
                    <option
                      v-for="domain in builder?.domainOptions"
                      :key="`p-${index}-${domain.value}`"
                      :value="domain.value"
                    >
                      {{ domainLabel(domain.value) }}
                    </option>
                  </select>
                </label>
                <label class="text-ink-muted">
                  {{ t('squad.deck.secondary') }}
                  <select
                    v-model="slot.secondary"
                    class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm text-ink"
                  >
                    <option
                      v-for="domain in builder?.domainOptions"
                      :key="`s-${index}-${domain.value}`"
                      :value="domain.value"
                    >
                      {{ domainLabel(domain.value) }}
                    </option>
                  </select>
                </label>
              </div>
              <p v-else class="mt-2 text-ink-faint">{{ t('eliteTools.relaisSlotHint') }}</p>
            </li>
          </ul>

          <div>
            <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {{ t('eliteTools.opponentElements', { count: builder?.maxElements ?? 5 }) }}
            </p>
            <ul class="mt-2 flex flex-wrap gap-2">
              <li v-for="element in builder?.elementOptions" :key="element.slug">
                <button
                  type="button"
                  class="border px-2 py-1 text-[11px]"
                  :class="
                    customElementSlugs.includes(element.slug)
                      ? 'border-accent text-accent'
                      : 'border-line text-ink-muted'
                  "
                  @click="toggleElement(element.slug)"
                >
                  {{ element.label }}
                </button>
              </li>
            </ul>
            <p class="mt-2 text-[11px] text-ink-faint">
              {{ t('eliteTools.elementPickCount', { n: customElementSlugs.length, max: builder?.maxElements ?? 5 }) }}
            </p>
          </div>
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

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad.js'

defineProps({
  standalone: { type: Boolean, default: false },
})

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const missions = ref(null)
const assigning = ref(false)
const collecting = ref(false)
const selectedNinjaId = ref(null)
const selectedTier = ref('D')
let fetchSeq = 0

const selectedNinja = computed(() =>
  missions.value?.availableNinjas?.find((n) => n.id === selectedNinjaId.value)
)

const selectedOdds = computed(() => {
  if (!selectedNinja.value || !selectedTier.value) return null
  return selectedNinja.value.oddsByTier?.[selectedTier.value] ?? null
})

const selectedTierConfig = computed(() =>
  tierOptions.value.find((entry) => entry.tier === selectedTier.value)
)

const maxSlots = computed(() => missions.value?.maxActiveMissions ?? 3)
const activeCount = computed(() => missions.value?.activeCount ?? 0)
const slotsRemaining = computed(() => missions.value?.slotsRemaining ?? maxSlots.value)

const slotsFull = computed(() => slotsRemaining.value <= 0 && activeCount.value > 0)

const slotMarks = computed(() =>
  Array.from({ length: maxSlots.value }, (_, index) => index < activeCount.value)
)

const currentHour = computed(() => missions.value?.gameClock?.hour ?? 0)

const tierOptions = computed(() => {
  if (!missions.value?.tiers) return []
  const noSlots = slotsRemaining.value <= 0
  return missions.value.tiers.map((tier) => {
    const odds = selectedNinja.value?.oddsByTier?.[tier.tier]
    const recommended = selectedNinja.value?.recommendedTiers?.includes(tier.tier)
    const noTime = tier.fitsInCycle === false
    const disabled = !missions.value.windowOpen || noSlots || noTime
    let disabledReason = null
    let warning = null
    if (!missions.value.windowOpen) disabledReason = t('missions.closed')
    else if (noSlots) disabledReason = t('missions.slotsFull', { max: maxSlots.value })
    else if (noTime) disabledReason = t('missions.noTimeLeft', { hours: tier.durationHours })
    else if (odds && odds.successChance < 50) {
      warning = t('missions.lowSuccess', { pct: odds.successChance })
    }
    return { ...tier, odds, disabled, disabledReason, warning, recommended }
  })
})

const canAssign = computed(() => {
  if (!selectedNinjaId.value || !missions.value?.windowOpen) return false
  if (slotsRemaining.value <= 0) return false
  const tier = selectedTierConfig.value
  return Boolean(tier && !tier.disabled && !selectedNinja.value?.examBlocked)
})

watch(selectedNinjaId, (id) => {
  if (!id) return
  const ninja = missions.value?.availableNinjas?.find((n) => n.id === id)
  if (ninja?.examBlocked) {
    selectedTier.value = 'D'
    return
  }
  const recommended = ninja?.recommendedTiers?.[0]
  if (recommended && tierOptions.value.some((tier) => tier.tier === recommended && !tier.disabled)) {
    selectedTier.value = recommended
  }
})

watch(tierOptions, (options) => {
  const current = options.find((tier) => tier.tier === selectedTier.value)
  if (current && !current.disabled) return
  const fallback = options.find((tier) => !tier.disabled)
  if (fallback) selectedTier.value = fallback.tier
})

onMounted(fetchMissions)

function applyMissionsState(next) {
  missions.value = next
  loading.value = false
  error.value = null
}

async function syncMissionsFromServer() {
  const res = await fetch(`${API_BASE}/api/missions`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
  applyMissionsState(await res.json())
}

async function fetchMissions() {
  const isInitial = !missions.value
  if (isInitial) loading.value = true
  error.value = null
  const seq = ++fetchSeq
  try {
    const res = await fetch(`${API_BASE}/api/missions`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    if (seq !== fetchSeq) return
    applyMissionsState(data)
  } catch (e) {
    if (seq !== fetchSeq) return
    error.value = e.message
  } finally {
    if (isInitial) loading.value = false
  }
}

async function assign() {
  if (!canAssign.value) return
  assigning.value = true
  error.value = null
  const seq = ++fetchSeq
  try {
    const res = await fetch(`${API_BASE}/api/missions/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId: selectedNinjaId.value, tier: selectedTier.value }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    if (seq !== fetchSeq) return
    applyMissionsState(data.missions)
    selectedNinjaId.value = null
    store.applySquadMutation({ ...data.squad, gameClock: data.gameClock })
    await syncMissionsFromServer()
  } catch (e) {
    if (seq === fetchSeq) error.value = e.message
  } finally {
    if (seq === fetchSeq) assigning.value = false
  }
}

async function collect() {
  collecting.value = true
  error.value = null
  const seq = ++fetchSeq
  try {
    const res = await fetch(`${API_BASE}/api/missions/collect`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    if (seq !== fetchSeq) return
    store.applySquadMutation({ ...data.squad, gameClock: data.gameClock })
    applyMissionsState(data.missions)
    await syncMissionsFromServer()
  } catch (e) {
    if (seq === fetchSeq) error.value = e.message
  } finally {
    if (seq === fetchSeq) collecting.value = false
  }
}

function selectTier(tier) {
  if (tier.disabled) return
  selectedTier.value = tier.tier
}

function ninjaBlockedReason(ninja) {
  if (ninja.examBlocked) return t('missions.examBlocked')
  return null
}

function ninjaOptionLabel(ninja) {
  const parts = [ninja.name]
  if (ninja.grade) parts.push(t(`grades.${ninja.grade}`))
  if (ninja.overallRating != null) parts.push(`★${ninja.overallRating}`)
  if (ninja.element_affinity) parts.push(t(`elements.${ninja.element_affinity}`))
  const blocked = ninjaBlockedReason(ninja)
  if (blocked) parts.push(`(${blocked})`)
  return parts.join(' · ')
}

function tierRewardLabel(tier) {
  if (tier.rewardMin === tier.rewardMax) return `${tier.rewardMax} Ryos`
  return `${tier.rewardMin}–${tier.rewardMax} Ryos`
}

function statGainLabel(tier) {
  const base = tier.statGainOnSuccess ?? 0
  const bonus = tier.benchStatGainBonus ?? 1
  if (!base) return '—'
  const benchGain = Math.round(base * bonus * 100) / 100
  return t('missions.statGainBench', { gain: benchGain, bonus })
}

function injuryLabel(type) {
  if (!type || type === 'none') return null
  return t(`missions.injuries.${type}`)
}

function lootSummary(mission) {
  const loot = mission.lootResult
  if (!loot) return null
  if (loot.success === false && !loot.baseRyos) return t('missions.missionFailed')
  if (loot.statGain?.gain) {
    return t('missions.loot.statGain', { stat: loot.statGain.stat, gain: loot.statGain.gain })
  }
  if (loot.prodige) return t('missions.loot.prodige', { name: loot.prodige.name })
  if (loot.scroll) return t('missions.loot.scroll', { stat: loot.scroll.stat, gain: loot.scroll.gain })
  if (loot.items?.length) {
    return t('missions.loot.items', { count: loot.items.reduce((s, i) => s + (i.quantity || 1), 0) })
  }
  if (loot.lootTier === 'none') return t('missions.loot.empty')
  return t(`missions.loot.${loot.narrative}`, {}, loot.narrative)
}

function hoursUntilResolve(mission) {
  const left = mission.resolves_at_hour - currentHour.value
  if (left <= 0) return t('missions.resolvesSoon')
  return t('missions.hoursLeft', { count: left })
}

function missionProgress(mission) {
  const duration = Number(
    missions.value?.tiers?.find((tier) => tier.tier === mission.mission_tier)?.durationHours
  )
  if (!duration || duration <= 0) return 0
  const left = Math.max(0, mission.resolves_at_hour - currentHour.value)
  const elapsed = Math.min(duration, Math.max(0, duration - left))
  return Math.round((elapsed / duration) * 100)
}

function oddsTone(chance) {
  if (chance == null) return 'text-ink-faint'
  if (chance >= 70) return 'text-accent'
  if (chance >= 50) return 'text-ink'
  return 'text-fire'
}
</script>

<template>
  <section
    :class="standalone ? 'mt-10' : 'mt-10 border-t border-line pt-10'"
    data-testid="missions-panel"
  >
    <template v-if="!standalone">
      <p class="section-label">{{ t('missions.title') }}</p>
      <p class="mt-2 text-sm text-ink-muted">{{ t('missions.lead') }}</p>
    </template>

    <p v-if="loading" class="mt-4 text-sm text-ink-muted">{{ t('missions.loading') }}</p>
    <p v-else-if="error" class="mt-4 text-sm text-fire">{{ error }}</p>

    <template v-else-if="missions">
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {{ t('missions.slotsLabel') }}
          </p>
          <p class="mt-1 text-sm text-ink" data-testid="missions-slots">
            {{
              t('missions.slots', {
                active: activeCount,
                max: maxSlots,
              })
            }}
          </p>
        </div>
        <div class="flex items-center gap-1.5" aria-hidden="true">
          <span
            v-for="(filled, index) in slotMarks"
            :key="`slot-${index}`"
            class="h-2.5 w-8 border transition-colors"
            :class="filled ? 'border-accent bg-accent/70' : 'border-line bg-transparent'"
          />
        </div>
      </div>

      <p v-if="!missions.windowOpen" class="mt-3 text-sm text-fire">{{ t('missions.closed') }}</p>
      <p v-else-if="slotsFull" class="mt-3 text-sm text-fire">
        {{ t('missions.slotsFull', { max: maxSlots }) }}
      </p>

      <div
        v-if="missions.pendingCollection?.length"
        class="mt-6 border-l-2 border-accent pl-4"
        data-testid="missions-pending"
      >
        <p class="text-sm text-ink">
          {{ t('missions.pending', { count: missions.pendingCollection.length }) }}
        </p>
        <ul class="mt-3 space-y-3 text-sm text-ink-muted">
          <li v-for="m in missions.pendingCollection" :key="m.id">
            <p>
              <span class="text-ink">{{ m.ninja_name }}</span>
              — {{ t(`missions.tiers.${m.mission_tier}`) }}
              <span v-if="m.reward_amount" class="text-accent">· {{ m.reward_amount }} Ryos</span>
              <span v-else class="text-ink-faint">· {{ t('missions.missionFailed') }}</span>
            </p>
            <p v-if="lootSummary(m)" class="mt-0.5 text-xs text-ink-faint">{{ lootSummary(m) }}</p>
            <p v-if="injuryLabel(m.injury_type)" class="mt-0.5 text-xs text-fire">
              {{ injuryLabel(m.injury_type) }}
            </p>
          </li>
        </ul>
        <button
          type="button"
          class="btn-ghost mt-4"
          data-testid="missions-collect"
          :disabled="collecting"
          @click="collect"
        >
          {{ collecting ? t('missions.collecting') : t('missions.collect') }}
        </button>
      </div>

      <div v-if="missions.activeMissions?.length" class="mt-8 space-y-3" data-testid="missions-active">
        <p class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{{ t('missions.active') }}</p>
        <div
          v-for="m in missions.activeMissions"
          :key="m.id"
          class="border border-line/70 px-4 py-3"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span class="text-ink">{{ m.ninja_name }}</span>
            <span class="text-ink-muted">{{ t(`missions.tiers.${m.mission_tier}`) }}</span>
            <span class="text-xs text-accent">{{ hoursUntilResolve(m) }}</span>
          </div>
          <div class="mt-3 h-1 overflow-hidden bg-bg-soft">
            <div
              class="h-full bg-accent/80 transition-[width] duration-500"
              :style="{ width: `${missionProgress(m)}%` }"
            />
          </div>
          <p class="mt-1.5 text-[10px] text-ink-faint">
            {{ t('missions.returnsAt', { hour: m.resolves_at_hour }) }}
          </p>
        </div>
      </div>

      <div v-if="missions.failedMissions?.length" class="mt-6 space-y-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-fire">{{ t('missions.failed') }}</p>
        <p
          v-for="m in missions.failedMissions"
          :key="m.id"
          class="text-sm text-ink-faint"
        >
          {{ m.ninja_name }} — {{ t(`missions.tiers.${m.mission_tier}`) }}
          <span v-if="m.injury_type === 'death'">· {{ t('missions.deathReport') }}</span>
        </p>
      </div>

      <div class="mt-10">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {{ t('missions.pickTier') }}
            </p>
            <p class="mt-1 text-xs text-ink-muted">{{ t('missions.rankPickHint') }}</p>
          </div>
        </div>

        <div class="mt-4 grid gap-2" data-testid="missions-tier-select">
          <button
            v-for="tier in tierOptions"
            :key="tier.tier"
            type="button"
            class="w-full border px-4 py-3 text-left transition-colors"
            :class="[
              selectedTier === tier.tier
                ? 'border-accent bg-accent/5'
                : 'border-line/70 hover:border-ink-faint',
              tier.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
            ]"
            :data-testid="`missions-tier-${tier.tier}`"
            :disabled="tier.disabled"
            @click="selectTier(tier)"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-ink">{{ t(`missions.tiers.${tier.tier}`) }}</p>
                <p class="mt-0.5 text-[10px] text-ink-faint">
                  {{ t('missions.targetRating', { rating: tier.targetRating }) }}
                  <span v-if="tier.recommended" class="text-accent">
                    · {{ t('missions.recommended') }}
                  </span>
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm tabular-nums text-ink">
                  {{ t('missions.durationHours', { count: tier.durationHours }) }}
                </p>
                <p v-if="tier.fitsInCycle && tier.resolvesAtHour != null" class="mt-0.5 text-[10px] text-ink-faint">
                  → H{{ tier.resolvesAtHour }}
                </p>
                <p v-else class="mt-0.5 text-[10px] text-fire">
                  {{ t('missions.noTimeLeft', { hours: tier.durationHours }) }}
                </p>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
              <span>{{ tierRewardLabel(tier) }}</span>
              <span>{{ statGainLabel(tier) }}</span>
              <span :class="oddsTone(tier.odds?.successChance)">
                {{ t('missions.success') }}
                <template v-if="tier.odds"> {{ tier.odds.successChance }} %</template>
                <template v-else> —</template>
              </span>
              <span v-if="tier.odds">
                {{ t('missions.injury') }} {{ tier.odds.injuryChance }} %
                · {{ t('missions.death') }} {{ tier.odds.deathChance }} %
              </span>
            </div>

            <p v-if="tier.disabledReason" class="mt-2 text-[10px] text-fire">
              {{ tier.disabledReason }}
            </p>
            <p v-else-if="tier.warning" class="mt-2 text-[10px] text-fire">
              {{ tier.warning }}
            </p>
          </button>
        </div>
      </div>

      <p class="mt-4 text-xs text-ink-faint">{{ t('missions.lootHint', { bonus: '1,5' }) }}</p>

      <div class="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <label class="block text-xs uppercase tracking-[0.14em] text-ink-faint">
          {{ t('missions.pickNinja') }}
          <select
            v-model="selectedNinjaId"
            class="strategy-select mt-2 w-full"
            data-testid="missions-ninja-select"
            :disabled="!missions.windowOpen || slotsFull"
          >
            <option :value="null" disabled>{{ t('missions.pickNinja') }}</option>
            <option
              v-for="n in missions.availableNinjas"
              :key="n.id"
              :value="n.id"
              :disabled="n.examBlocked"
            >
              {{ ninjaOptionLabel(n) }}
            </option>
          </select>
        </label>

        <div
          class="border border-line/70 px-4 py-3 text-xs text-ink-muted"
          data-testid="missions-odds"
        >
          <template v-if="selectedNinja && selectedOdds && !selectedNinja.examBlocked">
            <p class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {{ t(`missions.tiers.${selectedTier}`) }}
            </p>
            <p class="mt-2 text-sm text-ink">
              {{ t('missions.ninjaRating', { rating: selectedOdds.ninjaRating }) }}
            </p>
            <p class="mt-2">
              <span :class="oddsTone(selectedOdds.successChance)">
                {{ t('missions.success') }} {{ selectedOdds.successChance }} %
              </span>
              · {{ t('missions.injury') }} {{ selectedOdds.injuryChance }} %
              · {{ t('missions.death') }} {{ selectedOdds.deathChance }} %
            </p>
            <p v-if="selectedTierConfig" class="mt-2 text-ink-faint">
              {{ t('missions.durationHours', { count: selectedTierConfig.durationHours }) }}
              <template v-if="selectedTierConfig.resolvesAtHour != null">
                · {{ t('missions.returnsAt', { hour: selectedTierConfig.resolvesAtHour }) }}
              </template>
            </p>
            <p v-if="selectedNinja.recommendedTiers?.length" class="mt-2 text-ink-faint">
              {{ t('missions.eligible', {
                ranks: selectedNinja.recommendedTiers.map((r) => t(`missions.tiersShort.${r}`)).join(', ')
              }) }}
            </p>
          </template>
          <p v-else class="text-ink-faint">{{ t('missions.pickNinjaHint') }}</p>
        </div>
      </div>

      <button
        type="button"
        class="btn-ghost mt-6"
        data-testid="missions-send"
        :disabled="!canAssign || assigning"
        @click="assign"
      >
        {{ assigning ? t('missions.sending') : t('missions.send') }}
      </button>
    </template>
  </section>
</template>

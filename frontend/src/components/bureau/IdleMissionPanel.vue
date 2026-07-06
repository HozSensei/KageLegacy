<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad.js'

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const missions = ref(null)
const assigning = ref(false)
const collecting = ref(false)
const selectedNinjaId = ref(null)
const selectedTier = ref('routine')

const selectedNinja = computed(() =>
  missions.value?.availableNinjas?.find((n) => n.id === selectedNinjaId.value)
)

const eligibleTiersForSelection = computed(() => {
  if (!selectedNinja.value) return missions.value?.tiers?.map((tier) => tier.tier) ?? []
  return selectedNinja.value.eligibleTiers
})

const tierOptions = computed(() => {
  if (!missions.value?.tiers) return []
  const used = new Set(missions.value.usedTiers ?? [])
  return missions.value.tiers.map((tier) => {
    const recommended = eligibleTiersForSelection.value.includes(tier.tier)
    const alreadyUsed = used.has(tier.tier)
    const disabled = !missions.value.windowOpen || alreadyUsed
    let disabledReason = null
    let warning = null
    if (!missions.value.windowOpen) disabledReason = t('missions.closed')
    else if (alreadyUsed) disabledReason = t('missions.tierUsed')
    else if (!recommended) warning = t('missions.underQualified', { req: tier.requirement })
    return { ...tier, disabled, disabledReason, warning, recommended }
  })
})

const canAssign = computed(() => {
  if (!selectedNinjaId.value || !missions.value?.windowOpen) return false
  const tier = tierOptions.value.find((entry) => entry.tier === selectedTier.value)
  return tier && !tier.disabled
})

watch(selectedNinjaId, (id) => {
  if (!id) return
  const ninja = missions.value?.availableNinjas?.find((n) => n.id === id)
  if (ninja?.examBlocked || ninja?.hasCycleGear) {
    selectedTier.value = 'routine'
  }
})

onMounted(fetchMissions)

async function fetchMissions() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/missions`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    missions.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function assign() {
  if (!canAssign.value) return
  assigning.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/missions/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId: selectedNinjaId.value, tier: selectedTier.value }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    missions.value = data.missions
    if (data.squad) store.applyPayload({ ...data.squad, gameClock: data.gameClock })
    selectedNinjaId.value = null
  } catch (e) {
    error.value = e.message
  } finally {
    assigning.value = false
  }
}

async function collect() {
  collecting.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/missions/collect`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    missions.value = data.missions
    if (data.squad) store.applyPayload({ ...data.squad, gameClock: data.gameClock })
  } catch (e) {
    error.value = e.message
  } finally {
    collecting.value = false
  }
}

function ninjaBlockedReason(ninja) {
  if (ninja.examBlocked) return t('missions.examBlocked')
  if (ninja.hasCycleGear) return t('missions.cycleGearBlocked')
  return null
}

function tierRewardLabel(tier) {
  if (tier.rewardMin === tier.rewardMax) return `${tier.rewardMax} Ryos`
  return `${tier.rewardMin}–${tier.rewardMax} Ryos`
}

function injuryLabel(type) {
  if (!type || type === 'none') return null
  return t(`missions.injuries.${type}`)
}

function lootSummary(mission) {
  const loot = mission.lootResult
  if (!loot) return null
  if (loot.prodige) return t('missions.loot.prodige', { name: loot.prodige.name })
  if (loot.scroll) return t('missions.loot.scroll', { stat: loot.scroll.stat, gain: loot.scroll.gain })
  if (loot.items?.length) {
    return t('missions.loot.items', { count: loot.items.reduce((s, i) => s + (i.quantity || 1), 0) })
  }
  if (loot.lootTier === 'none') return t('missions.loot.empty')
  return t(`missions.loot.${loot.narrative}`, {}, loot.narrative)
}
</script>

<template>
  <section class="mt-10 border-t border-line pt-10">
    <p class="section-label">{{ t('missions.title') }}</p>
    <p class="mt-2 text-sm text-ink-muted">{{ t('missions.lead') }}</p>

    <p v-if="loading" class="mt-4 text-sm text-ink-muted">{{ t('missions.loading') }}</p>
    <p v-else-if="error" class="mt-4 text-sm text-fire">{{ error }}</p>

    <template v-else-if="missions">
      <p v-if="!missions.windowOpen" class="mt-4 text-sm text-fire">{{ t('missions.closed') }}</p>

      <div
        v-if="missions.pendingCollection?.length"
        class="mt-6 border-l-2 border-accent pl-4"
      >
        <p class="text-sm text-ink-muted">
          {{ t('missions.pending', { count: missions.pendingCollection.length }) }}
        </p>
        <ul class="mt-2 space-y-2 text-sm text-ink-muted">
          <li v-for="m in missions.pendingCollection" :key="m.id">
            {{ m.ninja_name }} — {{ t(`missions.tiers.${m.mission_tier}`) }}
            <span class="text-accent">· {{ m.reward_amount }} Ryos</span>
            <span v-if="lootSummary(m)" class="block text-xs text-ink-faint">{{ lootSummary(m) }}</span>
            <span v-if="injuryLabel(m.injury_type)" class="block text-xs text-fire">{{ injuryLabel(m.injury_type) }}</span>
          </li>
        </ul>
        <button type="button" class="btn-ghost mt-3" :disabled="collecting" @click="collect">
          {{ collecting ? t('missions.collecting') : t('missions.collect') }}
        </button>
      </div>

      <div v-if="missions.activeMissions?.length" class="mt-6 space-y-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{{ t('missions.active') }}</p>
        <p
          v-for="m in missions.activeMissions"
          :key="m.id"
          class="text-sm text-ink-muted"
        >
          {{ m.ninja_name }} — {{ t(`missions.tiers.${m.mission_tier}`) }}
          <span class="text-ink-faint">(H{{ m.resolves_at_hour }})</span>
        </p>
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

      <div class="mt-8 overflow-x-auto">
        <table class="w-full min-w-[32rem] text-left text-xs">
          <thead>
            <tr class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <th class="pb-2 pr-4">{{ t('missions.pickTier') }}</th>
              <th class="pb-2 pr-4">{{ t('missions.reward') }}</th>
              <th class="pb-2 pr-4">{{ t('missions.resolve') }}</th>
              <th class="pb-2">{{ t('missions.risk') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tier in missions.tiers" :key="tier.tier" class="border-t border-line/60 text-ink-muted">
              <td class="py-2 pr-4">
                <span class="text-ink">{{ t(`missions.tiers.${tier.tier}`) }}</span>
                <p class="mt-0.5 text-[10px] text-ink-faint">{{ tier.requirement }}</p>
              </td>
              <td class="py-2 pr-4 tabular-nums">{{ tierRewardLabel(tier) }}</td>
              <td class="py-2 pr-4 tabular-nums">H{{ tier.resolvesAtHour }}</td>
              <td class="py-2 text-[10px] text-ink-faint">
                <template v-if="tier.tier === 'routine'">{{ t('missions.riskNone') }}</template>
                <template v-else-if="tier.tier === 'infiltration'">{{ t('missions.riskLight') }}</template>
                <template v-else>{{ t('missions.riskCyclone') }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-4 text-xs text-ink-faint">{{ t('missions.lootHint') }}</p>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <label class="block text-xs uppercase tracking-[0.14em] text-ink-faint">
          {{ t('missions.pickNinja') }}
          <select v-model="selectedNinjaId" class="strategy-select mt-2 w-full" :disabled="!missions.windowOpen">
            <option :value="null" disabled>{{ t('missions.pickNinja') }}</option>
            <option
              v-for="n in missions.availableNinjas"
              :key="n.id"
              :value="n.id"
              :disabled="n.examBlocked || n.hasCycleGear"
            >
              {{ n.name }}{{ ninjaBlockedReason(n) ? ` (${ninjaBlockedReason(n)})` : '' }}
            </option>
          </select>
        </label>

        <label class="block text-xs uppercase tracking-[0.14em] text-ink-faint">
          {{ t('missions.pickTier') }}
          <select
            v-model="selectedTier"
            class="strategy-select mt-2 w-full"
            :disabled="!selectedNinjaId || !missions.windowOpen"
          >
            <option
              v-for="tier in tierOptions"
              :key="tier.tier"
              :value="tier.tier"
              :disabled="tier.disabled"
            >
              {{ t(`missions.tiers.${tier.tier}`) }}
              <template v-if="tier.disabled"> — {{ tier.disabledReason }}</template>
              <template v-else-if="tier.warning"> — {{ tier.warning }}</template>
            </option>
          </select>
        </label>
      </div>

      <p v-if="selectedNinja && !selectedNinja.examBlocked && !selectedNinja.hasCycleGear" class="mt-4 text-xs text-ink-faint">
        {{ t('missions.eligible', { ranks: selectedNinja.eligibleTiers.map((r) => t(`missions.tiersShort.${r}`)).join(', ') }) }}
      </p>

      <button
        type="button"
        class="btn-ghost mt-6"
        :disabled="!canAssign || assigning"
        @click="assign"
      >
        {{ assigning ? t('missions.sending') : t('missions.send') }}
      </button>
    </template>
  </section>
</template>

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
const selectedRank = ref('D')

const selectedNinja = computed(() =>
  missions.value?.availableNinjas?.find((n) => n.id === selectedNinjaId.value)
)

const eligibleRanksForSelection = computed(() => {
  if (!selectedNinja.value) return missions.value?.ranks?.map((r) => r.rank) ?? []
  return selectedNinja.value.eligibleRanks
})

const rankOptions = computed(() => {
  if (!missions.value?.ranks) return []
  return missions.value.ranks.map((rank) => {
    const statsOk = eligibleRanksForSelection.value.includes(rank.rank)
    const debtBlocked =
      missions.value.debtBlocksPaid && rank.paid
    const disabled = !statsOk || debtBlocked || !missions.value.windowOpen
    let disabledReason = null
    if (!missions.value.windowOpen) disabledReason = t('missions.closed')
    else if (debtBlocked) disabledReason = t('missions.debtBlocked')
    else if (!statsOk) disabledReason = rank.requirement
    return { ...rank, disabled, disabledReason }
  })
})

const canAssign = computed(() => {
  if (!selectedNinjaId.value || !missions.value?.windowOpen) return false
  const rank = rankOptions.value.find((r) => r.rank === selectedRank.value)
  return rank && !rank.disabled
})

watch(selectedNinjaId, (id) => {
  if (!id) return
  const ninja = missions.value?.availableNinjas?.find((n) => n.id === id)
  if (ninja?.examBlocked || ninja?.hasCycleGear) {
    selectedRank.value = 'D'
    return
  }
  if (!ninja?.eligibleRanks?.includes(selectedRank.value)) {
    selectedRank.value = ninja?.eligibleRanks?.[0] ?? 'D'
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
      body: JSON.stringify({ ninjaId: selectedNinjaId.value, rank: selectedRank.value }),
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
</script>

<template>
  <section class="mt-10 border-t border-line pt-10">
    <p class="section-label">{{ t('missions.title') }}</p>
    <p class="mt-2 text-sm text-ink-muted">{{ t('missions.lead') }}</p>

    <p v-if="loading" class="mt-4 text-sm text-ink-muted">{{ t('missions.loading') }}</p>
    <p v-else-if="error" class="mt-4 text-sm text-fire">{{ error }}</p>

    <template v-else-if="missions">
      <p v-if="!missions.windowOpen" class="mt-4 text-sm text-fire">{{ t('missions.closed') }}</p>
      <p v-else-if="missions.debtBlocksPaid" class="mt-4 text-sm text-ink-muted">
        {{ t('missions.debtHint') }}
      </p>

      <div
        v-if="missions.pendingCollection?.length"
        class="mt-6 border-l-2 border-accent pl-4"
      >
        <p class="text-sm text-ink-muted">
          {{ t('missions.pending', { count: missions.pendingCollection.length }) }}
        </p>
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
          {{ m.ninja_name }} — {{ t(`missions.ranks.${m.mission_rank}`) }}
        </p>
      </div>

      <div v-if="missions.failedMissions?.length" class="mt-6 space-y-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-fire">{{ t('missions.failed') }}</p>
        <p
          v-for="m in missions.failedMissions"
          :key="m.id"
          class="text-sm text-ink-faint"
        >
          {{ m.ninja_name }} — {{ t(`missions.ranks.${m.mission_rank}`) }} · {{ t('missions.failedHint') }}
        </p>
      </div>

      <div class="mt-8 overflow-x-auto">
        <table class="w-full min-w-[28rem] text-left text-xs">
          <thead>
            <tr class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <th class="pb-2 pr-4">{{ t('missions.pickRank') }}</th>
              <th class="pb-2 pr-4">{{ t('missions.cost') }}</th>
              <th class="pb-2 pr-4">{{ t('missions.reward') }}</th>
              <th class="pb-2">{{ t('missions.net') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rank in missions.ranks" :key="rank.rank" class="border-t border-line/60 text-ink-muted">
              <td class="py-2 pr-4">
                <span class="text-ink">{{ t(`missions.ranks.${rank.rank}`) }}</span>
                <p class="mt-0.5 text-[10px] text-ink-faint">{{ rank.requirement }}</p>
              </td>
              <td class="py-2 pr-4 tabular-nums">{{ rank.sendCost }} Ryos</td>
              <td class="py-2 pr-4 tabular-nums">{{ rank.reward }} Ryos</td>
              <td class="py-2 tabular-nums text-accent">+{{ rank.netProfit }}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
          {{ t('missions.pickRank') }}
          <select
            v-model="selectedRank"
            class="strategy-select mt-2 w-full"
            :disabled="!selectedNinjaId || !missions.windowOpen"
          >
            <option
              v-for="rank in rankOptions"
              :key="rank.rank"
              :value="rank.rank"
              :disabled="rank.disabled"
            >
              {{ t(`missions.ranks.${rank.rank}`) }} (+{{ rank.netProfit }})
              <template v-if="rank.disabled"> — {{ rank.disabledReason }}</template>
            </option>
          </select>
        </label>
      </div>

      <p v-if="selectedNinja && !selectedNinja.examBlocked && !selectedNinja.hasCycleGear" class="mt-4 text-xs text-ink-faint">
        {{ t('missions.eligible', { ranks: selectedNinja.eligibleRanks.map((r) => t(`missions.ranksShort.${r}`)).join(', ') }) }}
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

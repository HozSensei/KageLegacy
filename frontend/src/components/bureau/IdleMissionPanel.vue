<script setup>
import { onMounted, ref } from 'vue'
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

onMounted(async () => {
  await fetchMissions()
})

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
  if (!selectedNinjaId.value) return
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
</script>

<template>
  <section class="mt-10 border-t border-line pt-10">
    <p class="section-label">{{ t('missions.title') }}</p>
    <p class="mt-2 text-sm text-ink-muted">{{ t('missions.lead') }}</p>

    <p v-if="loading" class="mt-4 text-sm text-ink-muted">{{ t('missions.loading') }}</p>
    <p v-else-if="error" class="mt-4 text-sm text-fire">{{ error }}</p>

    <template v-else-if="missions">
      <div
        v-if="missions.pendingCollection?.length"
        class="mt-6 border-l-2 border-accent pl-4"
      >
        <p class="text-sm text-ink-muted">{{ t('missions.pending') }}</p>
        <button type="button" class="btn-ghost mt-3" :disabled="collecting" @click="collect">
          {{ collecting ? t('missions.collecting') : t('missions.collect') }}
        </button>
      </div>

      <div v-if="missions.activeMissions?.length" class="mt-6 space-y-2">
        <p
          v-for="m in missions.activeMissions"
          :key="m.id"
          class="text-sm text-ink-muted"
        >
          {{ m.ninja_name }} — {{ t(`missions.ranks.${m.mission_rank}`) }}
        </p>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <label class="block text-xs uppercase tracking-[0.14em] text-ink-faint">
          {{ t('missions.pickNinja') }}
          <select v-model="selectedNinjaId" class="strategy-select mt-2 w-full">
            <option :value="null" disabled>{{ t('missions.pickNinja') }}</option>
            <option v-for="n in missions.availableNinjas" :key="n.id" :value="n.id">
              {{ n.name }}
            </option>
          </select>
        </label>

        <label class="block text-xs uppercase tracking-[0.14em] text-ink-faint">
          {{ t('missions.pickRank') }}
          <select v-model="selectedRank" class="strategy-select mt-2 w-full">
            <option v-for="r in missions.ranks" :key="r.rank" :value="r.rank">
              {{ t(`missions.ranks.${r.rank}`) }} — {{ r.reward }} Ryos
            </option>
          </select>
        </label>
      </div>

      <button
        type="button"
        class="btn-ghost mt-6"
        :disabled="!selectedNinjaId || assigning"
        @click="assign"
      >
        {{ assigning ? t('missions.sending') : t('missions.send') }}
      </button>
    </template>
  </section>
</template>

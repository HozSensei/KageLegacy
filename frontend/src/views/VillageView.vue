<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import { readApiError } from '../utils/http.js'

defineOptions({ name: 'VillageView' })

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const village = ref(null)
const retaking = ref(false)

const villageIds = ['leaf', 'sand', 'mist', 'stone']

function villageName(id) {
  return t(`village.names.${id}`)
}

const rivalryLead = computed(() => {
  const r = village.value?.rivalry
  if (!r) return null
  if (r.resolved) {
    if (!r.winnerVillageId) return t('village.rivalryDraw')
    return t('village.rivalryWinner', { name: villageName(r.winnerVillageId) })
  }
  return t('village.rivalryLive', {
    a: villageName(r.villageA),
    b: villageName(r.villageB),
    scoreA: r.scoreA,
    scoreB: r.scoreB,
  })
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/village`)
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    village.value = data.village
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function retake(villageId) {
  if (!village.value?.canRetake || retaking.value) return
  retaking.value = true
  try {
    const res = await fetch(`${API_BASE}/api/village/retake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ villageId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    village.value = data.village
    if (store.sensei) {
      store.sensei.villageId = data.village.villageId
      store.sensei.villageRetakeUsed = data.village.retakeUsed
    }
  } catch (e) {
    error.value = e.message
  } finally {
    retaking.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell" data-testid="village-page">
    <header>
      <p class="page-lead">{{ t('village.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-10 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="mt-10 text-sm text-fire">{{ error }}</p>

    <template v-else-if="village">
      <section class="mt-10 border-l-2 border-accent pl-4" data-testid="village-identity">
        <p class="section-label">{{ t('village.yours') }}</p>
        <h2 class="mt-2 font-display text-3xl text-ink">
          {{ villageName(village.villageId) }}
        </h2>
        <p class="mt-2 text-sm text-ink-muted">
          {{ t(`village.tones.${village.villageId}`) }}
        </p>
        <p class="mt-3 text-sm text-ink-faint">
          {{ t('village.contribution', { pts: village.contribution, cap: village.cap }) }}
        </p>
        <p
          v-if="village.villageTitle"
          class="mt-2 text-xs uppercase tracking-[0.14em] text-accent"
        >
          {{ t('village.titlePrefix') }}
          {{ villageName(String(village.villageTitle).replace(/^rivalry:/, '')) }}
        </p>
      </section>

      <section
        v-if="rivalryLead"
        class="mt-10 border border-line bg-bg-soft/40 px-5 py-4"
        data-testid="village-rivalry"
      >
        <p class="section-label">{{ t('village.rivalryTitle') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ rivalryLead }}</p>
        <p class="mt-2 text-xs text-ink-faint">
          {{ t('village.rewardHint', { ryos: village.rewardRyos, min: village.rewardMinPoints }) }}
        </p>
      </section>

      <section class="mt-12" data-testid="village-standings">
        <p class="section-label">{{ t('village.standingsTitle') }}</p>
        <ul class="mt-4 divide-y divide-line border border-line">
          <li
            v-for="(row, index) in village.standings"
            :key="row.villageId"
            class="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            :class="row.villageId === village.villageId ? 'bg-accent/5' : ''"
          >
            <span>
              <span class="text-ink-faint">{{ index + 1 }}.</span>
              {{ villageName(row.villageId) }}
            </span>
            <span class="text-ink-muted">
              {{ t('village.pointsCycle', { n: row.cyclePoints }) }}
              ·
              {{ t('village.pointsSeason', { n: row.seasonPoints }) }}
            </span>
          </li>
        </ul>
      </section>

      <section class="mt-12" data-testid="village-actions">
        <p class="section-label">{{ t('village.howToScore') }}</p>
        <ul class="mt-4 space-y-2 text-sm text-ink-muted">
          <li v-for="action in village.actions" :key="action.key">
            {{ t(`village.actions.${action.key}`) }}
            <span class="text-accent">+{{ action.points }}</span>
          </li>
        </ul>
        <p class="mt-3 text-xs text-ink-faint">{{ t('village.noCombatBonus') }}</p>
      </section>

      <section
        v-if="village.topContributors?.length"
        class="mt-12"
        data-testid="village-contributors"
      >
        <p class="section-label">{{ t('village.topContributors') }}</p>
        <ul class="mt-4 space-y-2 text-sm text-ink-muted">
          <li
            v-for="row in village.topContributors"
            :key="row.userId"
            class="flex justify-between gap-3"
          >
            <span>{{ row.senseiName }}</span>
            <span class="text-accent">{{ row.points }}</span>
          </li>
        </ul>
      </section>

      <section v-if="village.canRetake" class="mt-12" data-testid="village-retake">
        <p class="section-label">{{ t('village.retakeTitle') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ t('village.retakeLead') }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="id in villageIds"
            :key="id"
            type="button"
            class="border border-line px-3 py-2 text-xs uppercase tracking-[0.14em] transition hover:border-accent hover:text-accent disabled:opacity-40"
            :disabled="retaking || id === village.villageId"
            @click="retake(id)"
          >
            {{ villageName(id) }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

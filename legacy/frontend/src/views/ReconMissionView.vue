<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import ChronicleReader from '../components/operation/ChronicleReader.vue'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'

defineOptions({ name: 'ReconMissionView' })

const props = defineProps({
  missionId: { type: [String, Number], required: true },
})

const { t } = useI18n()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const payload = ref(null)

const activeMissionId = computed(() => props.missionId || route.params.missionId)

const matchTitle = computed(() => {
  const m = payload.value?.mission
  if (!m) return null
  return `${m.homeSensei} vs ${m.awaySensei}`
})

const resultLabel = computed(() => {
  const m = payload.value?.mission
  if (!m) return null
  const map = {
    home_win: m.role === 'home' ? t('missions.reconOutcomeWin') : t('missions.reconOutcomeLoss'),
    away_win: m.role === 'away' ? t('missions.reconOutcomeWin') : t('missions.reconOutcomeLoss'),
    draw: t('missions.reconOutcomeDraw'),
  }
  return map[m.result]
})

onMounted(() => fetchMission())

async function fetchMission() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/reconnaissance/missions/${activeMissionId.value}`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    payload.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="recon-mission-page">
    <header>
      <p class="page-lead">{{ t('missions.reconChronicleTitle') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="payload">
      <div v-if="matchTitle" class="operation-match-header mb-8 mt-10">
        <div class="operation-match-header__versus">
          <SenseiIdentity
            v-if="payload.mission.homeIdentity"
            class="operation-match-header__card"
            :identity="payload.mission.homeIdentity"
            variant="match"
            :linkable="false"
          />
          <span v-else class="operation-match-header__card font-display text-xl text-ink">
            {{ payload.mission.homeSensei }}
          </span>
          <span class="operation-match-header__vs">{{ t('common.vs') }}</span>
          <SenseiIdentity
            v-if="payload.mission.awayIdentity"
            class="operation-match-header__card"
            :identity="payload.mission.awayIdentity"
            variant="match"
            :linkable="false"
          />
          <span v-else class="operation-match-header__card font-display text-xl text-ink">
            {{ payload.mission.awaySensei }}
          </span>
        </div>
        <p v-if="resultLabel" class="operation-match-header__status mt-4">
          {{ resultLabel }}
          <span v-if="payload.mission.ryos" class="ml-2 text-accent">+{{ payload.mission.ryos }} Ryos</span>
        </p>
      </div>

      <ChronicleReader
        :segments="payload.chronicle"
        :cast="payload.chronicleCast"
        :empty-text="t('missions.reconChronicleEmpty')"
      />
    </template>
  </div>
</template>

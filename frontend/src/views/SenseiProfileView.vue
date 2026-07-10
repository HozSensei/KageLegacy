<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useEliteStore } from '../stores/elite'
import { useSquadStore } from '../stores/squad'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'
import ElitePackPanel from '../components/bureau/ElitePackPanel.vue'
import HeritageWallPanel from '../components/bureau/HeritageWallPanel.vue'
import EliteCheckoutBanner from '../components/bureau/EliteCheckoutBanner.vue'
import VerifiedIcon from '../components/icons/VerifiedIcon.vue'

defineOptions({ name: 'SenseiProfileView' })

const props = defineProps({
  userId: { type: [String, Number], required: true },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const elite = useEliteStore()
const squad = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const profile = ref(null)

const targetId = computed(() => props.userId || route.params.userId)
const isOwnProfile = computed(() => profile.value?.isOwnProfile)
const isEliteActive = computed(() => Boolean(elite.subscription?.isActive))

const statsLine = computed(() => {
  const s = profile.value?.publicStats
  if (!s?.division) return null
  return t('senseiProfile.statsLine', {
    division: s.division,
    season: s.season,
    points: s.seasonPoints,
    reputation: s.reputation,
  })
})

onMounted(async () => {
  await fetchProfile()
  if (profile.value?.isOwnProfile) {
    await elite.handleCheckoutReturn(route, router)
    if (!elite.subscription) await elite.fetchElite()
    if (!squad.sensei) await squad.fetchSquad()
  }
})

watch(
  () => route.params.userId,
  async () => {
    await fetchProfile()
  }
)

async function fetchProfile() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/sensei/${targetId.value}/profile`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    profile.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="sensei-profile-page">
    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="profile">
      <EliteCheckoutBanner v-if="isOwnProfile" class="mb-8" />

      <div v-if="isOwnProfile" class="mb-6 flex flex-wrap items-center gap-3">
        <span class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('senseiProfile.ownBadge') }}</span>
        <RouterLink
          v-if="isEliteActive"
          to="/elite/outils"
          class="inline-flex items-center gap-1.5 text-xs text-accent underline-offset-2 hover:underline"
          data-testid="profile-elite-tools-link"
        >
          <VerifiedIcon size="1rem" />
          {{ t('nav.eliteTools') }}
        </RouterLink>
      </div>

      <SenseiIdentity
        :identity="profile.identity"
        variant="card"
        :subtitle="statsLine"
        :linkable="false"
      />

      <dl class="metric-row mt-10">
        <div class="metric-item">
          <dd class="metric-value">{{ profile.publicStats.wins }}</dd>
          <dt class="metric-label">{{ t('senseiProfile.wins') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ profile.publicStats.draws }}</dd>
          <dt class="metric-label">{{ t('senseiProfile.draws') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ profile.publicStats.losses }}</dd>
          <dt class="metric-label">{{ t('senseiProfile.losses') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value text-accent">{{ profile.publicStats.seasonPoints }}</dd>
          <dt class="metric-label">{{ t('league.points') }}</dt>
        </div>
      </dl>

      <section v-if="profile.recentMatch" class="mt-14 border-t border-line pt-10">
        <p class="section-label">{{ t('senseiProfile.lastMatch') }}</p>
        <RouterLink
          :to="{
            name: 'operation-match',
            params: { matchId: profile.recentMatch.id },
          }"
          class="mt-4 block border border-line p-5 transition hover:border-accent"
        >
          <p class="text-sm text-ink">
            {{ t('league.matchday') }} {{ profile.recentMatch.cycle }}
            · {{ profile.recentMatch.opponentName }}
          </p>
          <p class="mt-2 text-xs text-accent">{{ t('league.viewChronicle') }}</p>
        </RouterLink>
      </section>

      <template v-if="isOwnProfile">
        <section class="mt-14 border-t border-line pt-10" data-testid="profile-elite-section">
          <div class="flex flex-wrap items-center gap-2">
            <VerifiedIcon v-if="isEliteActive" size="1.25rem" />
            <p class="section-label">{{ t('senseiProfile.eliteSectionTitle') }}</p>
          </div>
          <p class="mt-2 text-sm text-ink-muted">{{ t('senseiProfile.eliteSectionLead') }}</p>
          <ElitePackPanel class="profile-panel" />
        </section>

        <section class="mt-14 border-t border-line pt-10" data-testid="profile-heritage-section">
          <p class="section-label">{{ t('senseiProfile.heritageSectionTitle') }}</p>
          <HeritageWallPanel class="profile-panel" />
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
:deep(.profile-panel) {
  margin-top: 1.5rem;
  border-top: none;
  padding-top: 0;
}
</style>

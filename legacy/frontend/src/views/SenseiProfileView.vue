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
const recon = ref(null)
const challengeBusy = ref(false)
const challengeError = ref(null)
const challengeSent = ref(false)

const targetId = computed(() => props.userId || route.params.userId)
const isOwnProfile = computed(() => profile.value?.isOwnProfile)
const isEliteActive = computed(
  () => Boolean(elite.featureEnabled && elite.subscription?.isActive)
)
const showEliteSection = computed(() => Boolean(elite.featureEnabled))

const canChallengeRecon = computed(
  () =>
    !isOwnProfile.value &&
    recon.value?.available &&
    !recon.value?.played &&
    !recon.value?.committed
)

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
  if (!profile.value?.isOwnProfile) {
    await fetchReconState()
  }
  if (profile.value?.isOwnProfile) {
    await elite.handleCheckoutReturn(route, router)
    if (!elite.subscription) await elite.fetchElite()
    if (!squad.sensei) await squad.fetchSquad()
  }
})

watch(
  () => route.params.userId,
  async () => {
    challengeSent.value = false
    challengeError.value = null
    await fetchProfile()
    if (!profile.value?.isOwnProfile) {
      await fetchReconState()
    }
  }
)

async function fetchReconState() {
  try {
    const res = await fetch(`${API_BASE}/api/reconnaissance`)
    if (res.ok) recon.value = await res.json()
  } catch {
    recon.value = null
  }
}

async function challengeRecon() {
  challengeBusy.value = true
  challengeError.value = null
  try {
    const res = await fetch(`${API_BASE}/api/reconnaissance/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: Number(targetId.value) }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
    challengeSent.value = true
    await fetchReconState()
  } catch (e) {
    challengeError.value = e.message
  } finally {
    challengeBusy.value = false
  }
}

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
      <EliteCheckoutBanner v-if="isOwnProfile && showEliteSection" class="mb-8" />

      <div v-if="isOwnProfile" class="mb-6 flex flex-wrap items-center gap-3">
        <span class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('senseiProfile.ownBadge') }}</span>
        <RouterLink
          v-if="isEliteActive"
          to="/elite/outils"
          class="btn-ghost gap-1.5 text-[10px]"
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

      <section v-if="!isOwnProfile && (canChallengeRecon || challengeSent)" class="mt-10" data-testid="profile-recon-challenge">
        <p v-if="challengeError" class="text-xs text-fire">{{ challengeError }}</p>
        <p v-if="challengeSent" class="text-xs text-ink-muted">
          {{ t('senseiProfile.reconChallengeSent', { name: profile.identity?.senseiName || '—' }) }}
        </p>
        <button
          v-else-if="canChallengeRecon"
          type="button"
          class="btn-primary text-[10px]"
          :disabled="challengeBusy"
          data-testid="profile-recon-challenge-btn"
          @click="challengeRecon"
        >
          {{ challengeBusy ? t('missions.reconBusy') : t('missions.reconChallenge') }}
        </button>
        <p v-else-if="recon?.available === false" class="text-xs text-ink-faint">
          {{ t('missions.reconClosed') }}
        </p>
      </section>

      <section v-if="profile.recentMatch" class="mt-10">
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
        <section v-if="showEliteSection" class="mt-14" data-testid="profile-elite-section">
          <div class="flex flex-wrap items-center gap-2">
            <VerifiedIcon v-if="isEliteActive" size="1.25rem" />
            <p class="section-label">{{ t('senseiProfile.eliteSectionTitle') }}</p>
          </div>
          <p class="mt-2 text-sm text-ink-muted">{{ t('senseiProfile.eliteSectionLead') }}</p>
          <ElitePackPanel class="profile-panel" />
        </section>

        <section class="mt-14" data-testid="profile-heritage-section">
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

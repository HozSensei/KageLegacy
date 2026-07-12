<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

defineOptions({ name: 'ReconnaissancePanel' })

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const busy = ref(false)
const error = ref(null)
const recon = ref(null)

const canRegister = computed(
  () =>
    recon.value?.available &&
    !recon.value?.played &&
    !recon.value?.committed
)

const isQueued = computed(() => Boolean(recon.value?.registration))
const isScheduled = computed(() => Boolean(recon.value?.scheduledChallenge))

onMounted(() => refresh())

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/reconnaissance`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    recon.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function runAction(action) {
  busy.value = true
  error.value = null
  try {
    const res = await action()
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
    await refresh()
    return body
  } catch (e) {
    error.value = e.message
    return null
  } finally {
    busy.value = false
  }
}

async function registerMatchmaking() {
  await runAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/matchmake`, { method: 'POST' })
  )
}

async function acceptChallenge(challengeId) {
  await runAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/challenges/${challengeId}/accept`, { method: 'POST' })
  )
}

async function declineChallenge(challengeId) {
  await runAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/challenges/${challengeId}/decline`, { method: 'POST' })
  )
}

function outcomeLabel(outcome) {
  const map = {
    win: t('missions.reconOutcomeWin'),
    draw: t('missions.reconOutcomeDraw'),
    loss: t('missions.reconOutcomeLoss'),
  }
  return map[outcome] || outcome
}
</script>

<template>
  <section class="mt-14 border-t border-line pt-10" data-testid="missions-reconnaissance">
    <p class="section-label">{{ t('missions.reconTitle') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ t('missions.reconLead') }}</p>
    <p class="mt-2 text-[10px] text-ink-faint">{{ t('missions.reconRewards') }}</p>

    <p v-if="loading" class="mt-4 text-xs text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="mt-4 text-xs text-fire">{{ error }}</p>

    <template v-else-if="recon">
      <p v-if="recon.available" class="mt-3 text-[10px] text-accent">
        {{ t('missions.reconWindow', { hour: recon.resolvesAtHour }) }}
      </p>

      <div v-if="recon.pendingIncoming?.length" class="mt-4 space-y-2">
        <p class="text-[10px] uppercase tracking-[0.14em] text-accent">{{ t('missions.reconIncoming') }}</p>
        <div
          v-for="challenge in recon.pendingIncoming"
          :key="challenge.challengeId"
          class="border border-line px-4 py-3 text-sm"
        >
          <p class="text-ink">{{ t('missions.reconChallengeFrom', { name: challenge.challengerName }) }}</p>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="btn-primary text-[10px]"
              :disabled="busy"
              @click="acceptChallenge(challenge.challengeId)"
            >
              {{ t('missions.reconAccept') }}
            </button>
            <button
              type="button"
              class="btn-ghost text-[10px]"
              :disabled="busy"
              @click="declineChallenge(challenge.challengeId)"
            >
              {{ t('missions.reconDecline') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="recon.pendingOutgoing" class="mt-4 text-xs text-ink-muted">
        {{ t('missions.reconPendingOutgoing', { name: recon.pendingOutgoing.defenderName }) }}
      </p>

        <p v-else-if="isQueued || isScheduled" class="mt-4 border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-ink">
        <template v-if="isQueued">
          {{ recon.hour >= recon.resolvesAtHour ? t('missions.reconPendingResolution', { hour: recon.resolvesAtHour }) : t('missions.reconQueued', { hour: recon.resolvesAtHour }) }}
        </template>
        <template v-else>
          {{
            recon.hour >= recon.scheduledChallenge.scheduledForHour
              ? t('missions.reconPendingResolution', { hour: recon.scheduledChallenge.scheduledForHour })
              : t('missions.reconScheduled', {
                  name: recon.scheduledChallenge.opponentName,
                  hour: recon.scheduledChallenge.scheduledForHour,
                })
          }}
        </template>
      </p>

      <button
        v-if="canRegister"
        type="button"
        class="btn-primary mt-4 text-[10px]"
        :disabled="busy"
        data-testid="recon-matchmake"
        @click="registerMatchmaking"
      >
        {{ busy ? t('missions.reconBusy') : t('missions.reconRegister') }}
      </button>

      <div v-else-if="recon.played && recon.lastMission" class="mt-4 border border-line px-4 py-3 text-sm">
        <p>
          <span class="text-ink">{{ outcomeLabel(recon.lastMission.outcome) }}</span>
          <span class="text-ink-muted"> · {{ recon.lastMission.opponentName }}</span>
          <span v-if="recon.lastMission.awayIsBot" class="text-ink-faint">{{ t('league.botParen') }}</span>
          <span v-if="recon.lastMission.ryos" class="ml-2 text-accent">+{{ recon.lastMission.ryos }} Ryos</span>
        </p>
        <RouterLink
          :to="{ name: 'recon-mission', params: { missionId: recon.lastMission.missionId } }"
          class="mt-3 inline-block text-xs text-accent underline-offset-2 hover:underline"
        >
          {{ t('missions.reconViewChronicle') }}
        </RouterLink>
      </div>

      <p v-else-if="!recon.available && !recon.played" class="mt-4 text-xs text-ink-faint">
        {{ t('missions.reconClosed') }}
      </p>
    </template>
  </section>
</template>

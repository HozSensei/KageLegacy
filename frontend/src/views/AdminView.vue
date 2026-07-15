<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '../stores/admin'
import { useAuthStore } from '../stores/auth'

defineOptions({ name: 'AdminView' })

const { t } = useI18n()
const admin = useAdminStore()
const auth = useAuthStore()

const targetHour = ref(36)
const cycleStartAt = ref('')
const seasonNumber = ref(1)
const resetCycleStartAt = ref('')
const resetConfirm = ref(false)
const repairAll = ref(true)
const repairPoolId = ref('')
const repairIncludePlayed = ref(false)

const phaseLabel = computed(() => {
  const phase = admin.clock?.phase
  if (!phase) return '—'
  return t(`gameClock.phases.${phase}`, phase)
})

const preview = computed(() => (admin.lastResult?.dryRun ? admin.lastResult.preview : null))

onMounted(async () => {
  await admin.fetchStatus()
  await admin.fetchClock()
})

async function handleAdvanceHour() {
  await admin.advanceHour()
}

async function handleSetHour(hour) {
  targetHour.value = hour
  await admin.setHour(hour)
}

async function handleSetCycleStart() {
  if (!cycleStartAt.value) return
  const iso = new Date(cycleStartAt.value).toISOString()
  await admin.setCycleStart(iso)
}

function resolveResetCycleStartAt() {
  return resetCycleStartAt.value ? new Date(resetCycleStartAt.value).toISOString() : null
}

async function handlePreviewReset() {
  resetConfirm.value = false
  await admin.hardReset({
    seasonNumber: seasonNumber.value,
    cycleStartAt: resolveResetCycleStartAt(),
    dryRun: true,
    confirm: false,
  })
}

async function handleConfirmReset() {
  if (!resetConfirm.value) return
  await admin.hardReset({
    seasonNumber: seasonNumber.value,
    cycleStartAt: resolveResetCycleStartAt(),
    dryRun: false,
    confirm: true,
  })
  resetConfirm.value = false
}

async function handlePurgeGuests() {
  await admin.purgeGuests()
}

async function handleRepairPools() {
  await admin.repairPools({
    all: repairAll.value,
    poolId: repairPoolId.value ? Number(repairPoolId.value) : null,
    includePlayed: repairIncludePlayed.value,
  })
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="admin-page">
    <header>
      <h1 class="font-display text-3xl">{{ t('admin.title') }}</h1>
      <p class="mt-2 text-sm text-ink-muted">{{ t('admin.lead') }}</p>
      <p v-if="auth.user" class="mt-2 text-xs text-ink-faint">
        {{ t('admin.connectedAs', { username: auth.user.username }) }}
      </p>
    </header>

    <p v-if="admin.loading && !admin.clock" class="mt-8 text-sm text-ink-muted">
      {{ t('common.loading') }}
    </p>

    <template v-else>
      <p v-if="admin.error" class="mt-6 text-sm text-fire">{{ admin.error }}</p>

      <section class="mt-8 border border-line/60 bg-bg-card/30 p-5" data-testid="admin-clock">
        <h2 class="font-display text-xl">{{ t('admin.clock.title') }}</h2>
        <p v-if="admin.clock" class="mt-3 text-sm">
          H{{ admin.clock.hour }} · {{ phaseLabel }}
          <span v-if="admin.clock.cycleStartAt" class="text-ink-muted">
            — {{ t('admin.clock.anchor') }} {{ admin.clock.cycleStartAt }}
          </span>
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading"
            @click="handleAdvanceHour"
          >
            {{ t('admin.clock.advanceHour') }}
          </button>
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading"
            @click="admin.runTick()"
          >
            {{ t('admin.clock.tick') }}
          </button>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-2">
          <label class="text-sm">
            {{ t('admin.clock.setHour') }}
            <input
              v-model.number="targetHour"
              type="number"
              min="0"
              max="72"
              class="ml-2 w-16 border border-line/60 bg-bg px-2 py-1"
            />
          </label>
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading"
            @click="handleSetHour(targetHour)"
          >
            {{ t('admin.clock.applyHour') }}
          </button>
          <button
            v-for="h in [36, 54, 71, 72]"
            :key="h"
            type="button"
            class="border border-line/60 px-2 py-1 text-xs hover:bg-bg-card"
            :disabled="admin.loading"
            @click="handleSetHour(h)"
          >
            H{{ h }}
          </button>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-2">
          <label class="text-sm">
            {{ t('admin.clock.setStart') }}
            <input
              v-model="cycleStartAt"
              type="datetime-local"
              class="ml-2 border border-line/60 bg-bg px-2 py-1"
            />
          </label>
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading || !cycleStartAt"
            @click="handleSetCycleStart"
          >
            {{ t('admin.clock.applyStart') }}
          </button>
        </div>

        <p class="mt-4 text-xs text-ink-muted">{{ t('admin.clock.reconHint') }}</p>
      </section>

      <section class="mt-8 border border-fire/40 bg-fire/5 p-5" data-testid="admin-hard-reset">
        <h2 class="font-display text-xl text-fire">{{ t('admin.reset.title') }}</h2>
        <p class="mt-2 text-sm text-ink-muted">{{ t('admin.reset.warning') }}</p>

        <div class="mt-4 flex flex-wrap items-end gap-3">
          <label class="text-sm">
            {{ t('admin.reset.season') }}
            <input
              v-model.number="seasonNumber"
              type="number"
              min="1"
              class="ml-2 w-16 border border-line/60 bg-bg px-2 py-1"
            />
          </label>
          <label class="text-sm">
            {{ t('admin.reset.anchor') }}
            <input
              v-model="resetCycleStartAt"
              type="datetime-local"
              class="ml-2 border border-line/60 bg-bg px-2 py-1"
            />
          </label>
        </div>
        <p class="mt-2 text-xs text-ink-muted">{{ t('admin.reset.anchorHint') }}</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading"
            @click="handlePreviewReset"
          >
            {{ t('admin.reset.preview') }}
          </button>
        </div>

        <div v-if="preview" class="mt-4 space-y-1 text-sm">
          <p>{{ t('admin.reset.humanPlayers', { count: preview.humanPlayers }) }}</p>
          <p>{{ t('admin.reset.eliteSubs', { count: preview.activeEliteSubscriptions }) }}</p>
          <p>{{ t('admin.reset.ninjas', { count: preview.ninjasToDelete }) }}</p>
          <p>{{ t('admin.reset.pools', { count: preview.poolsToDelete }) }}</p>
          <p>{{ t('admin.reset.matches', { count: preview.matchesToDelete }) }}</p>
          <p>{{ t('admin.reset.reconMissions', { count: preview.reconMissionsToDelete }) }}</p>
          <p v-if="admin.lastResult?.cycleStartAt">
            {{ t('admin.reset.anchorPreview', { at: admin.lastResult.cycleStartAt }) }}
          </p>
          <p v-else-if="resetCycleStartAt">
            {{ t('admin.reset.anchorPreview', { at: resolveResetCycleStartAt() }) }}
          </p>
          <p v-else class="text-ink-muted">{{ t('admin.reset.anchorNow') }}</p>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm">
            <input v-model="resetConfirm" type="checkbox" />
            {{ t('admin.reset.confirmCheckbox') }}
          </label>
          <button
            type="button"
            class="border border-fire bg-fire/10 px-3 py-1.5 text-sm text-fire hover:bg-fire/20"
            :disabled="admin.loading || !resetConfirm"
            @click="handleConfirmReset"
          >
            {{ t('admin.reset.execute') }}
          </button>
        </div>
      </section>

      <section class="mt-8 border border-line/60 bg-bg-card/30 p-5" data-testid="admin-maintenance">
        <h2 class="font-display text-xl">{{ t('admin.maintenance.title') }}</h2>

        <div class="mt-4">
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading"
            @click="handlePurgeGuests"
          >
            {{ t('admin.maintenance.purgeGuests') }}
          </button>
        </div>

        <div class="mt-6 space-y-3">
          <p class="text-sm font-medium">{{ t('admin.maintenance.repairPools') }}</p>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="repairAll" type="checkbox" />
            {{ t('admin.maintenance.repairAll') }}
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="repairIncludePlayed" type="checkbox" />
            {{ t('admin.maintenance.includePlayed') }}
          </label>
          <label class="text-sm">
            {{ t('admin.maintenance.poolId') }}
            <input
              v-model="repairPoolId"
              type="number"
              min="1"
              class="ml-2 w-24 border border-line/60 bg-bg px-2 py-1"
              :disabled="repairAll"
            />
          </label>
          <button
            type="button"
            class="border border-line/60 px-3 py-1.5 text-sm hover:bg-bg-card"
            :disabled="admin.loading"
            @click="handleRepairPools"
          >
            {{ t('admin.maintenance.repairRun') }}
          </button>
        </div>
      </section>

      <section v-if="admin.lastResult && !preview" class="mt-8 border border-line/60 p-4">
        <h3 class="text-sm font-medium">{{ t('admin.lastResult') }}</h3>
        <pre class="mt-2 max-h-64 overflow-auto text-xs text-ink-muted">{{ JSON.stringify(admin.lastResult, null, 2) }}</pre>
      </section>
    </template>
  </div>
</template>

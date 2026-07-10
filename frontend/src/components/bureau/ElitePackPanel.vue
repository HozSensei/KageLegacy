<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useEliteStore } from '../../stores/elite'
import EliteIdentityEditor from './EliteIdentityEditor.vue'

defineOptions({ name: 'ElitePackPanel' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const elite = useEliteStore()
const activating = ref(false)
const activateError = ref(null)
const checkoutNotice = ref(null)

const isActive = computed(() => Boolean(elite.subscription?.isActive))
const pass = computed(() => elite.seasonPass)
const progressPct = computed(() => {
  const s = pass.value?.summary
  if (!s?.total) return 0
  return Math.round((s.completed / s.total) * 100)
})

onMounted(() => handleCheckoutReturn())

async function handleCheckoutReturn() {
  const sessionId = typeof route.query.session_id === 'string' ? route.query.session_id : null
  const eliteStatus = route.query.elite

  if (sessionId) {
    checkoutNotice.value = 'confirming'
    activateError.value = null
    try {
      await elite.confirmCheckout(sessionId)
      checkoutNotice.value = 'success'
    } catch (e) {
      activateError.value = e.message
      checkoutNotice.value = 'error'
    }
  } else if (eliteStatus === 'canceled') {
    checkoutNotice.value = 'canceled'
    await elite.fetchElite()
  } else {
    await elite.fetchElite()
  }

  if (sessionId || eliteStatus) {
    const nextQuery = { ...route.query }
    delete nextQuery.session_id
    delete nextQuery.elite
    router.replace({ path: route.path, query: nextQuery })
  }
}

async function activatePack() {
  activating.value = true
  activateError.value = null
  checkoutNotice.value = null
  try {
    await elite.startCheckout()
  } catch (e) {
    activateError.value = e.message
  } finally {
    activating.value = false
  }
}

function questProgress(quest) {
  if (!quest?.targetCount) return 0
  return Math.min(100, Math.round((quest.currentProgress / quest.targetCount) * 100))
}
</script>

<template>
  <div class="mt-10 border-t border-line pt-8" data-testid="elite-pack-panel">
    <p class="section-label">{{ t('elitePack.title') }}</p>

    <p
      v-if="checkoutNotice === 'confirming'"
      class="mt-4 border-l-2 border-accent pl-4 text-sm text-ink-muted"
      data-testid="elite-checkout-confirming"
    >
      {{ t('elitePack.checkoutConfirming') }}
    </p>
    <p
      v-else-if="checkoutNotice === 'success'"
      class="mt-4 border-l-2 border-accent pl-4 text-sm"
      data-testid="elite-checkout-success"
    >
      <span class="text-accent">{{ t('elitePack.checkoutSuccess') }}</span>
      <span class="mt-2 block text-ink-muted">{{ t('elitePack.checkoutThanks') }}</span>
    </p>
    <p
      v-else-if="checkoutNotice === 'canceled'"
      class="mt-4 border-l-2 border-line pl-4 text-sm text-ink-muted"
      data-testid="elite-checkout-canceled"
    >
      {{ t('elitePack.checkoutCanceled') }}
    </p>

    <p v-if="elite.loading && !pass && !checkoutNotice" class="mt-4 text-sm text-ink-muted">
      {{ t('common.loading') }}
    </p>

    <template v-else-if="!isActive">
      <p class="mt-3 text-sm leading-relaxed text-ink-muted">{{ t('elitePack.inactiveLead') }}</p>
      <ul class="mt-4 space-y-2 text-xs text-ink-faint">
        <li>· {{ t('elitePack.perkIdentity') }}</li>
        <li>· {{ t('elitePack.perkSeasonPass') }}</li>
        <li>· {{ t('elitePack.perkSeasonAlign') }}</li>
      </ul>
      <button
        type="button"
        class="btn-ghost mt-6 w-full border-accent/40 text-accent"
        :disabled="activating"
        data-testid="elite-pack-activate"
        @click="activatePack"
      >
        {{ activating ? t('common.loading') : t('elitePack.activateCta') }}
      </button>
      <p v-if="activateError" class="mt-2 text-xs text-fire">{{ activateError }}</p>
    </template>

    <template v-else>
      <div class="mt-3 flex flex-wrap items-baseline gap-2 text-sm">
        <span class="text-accent">{{ t('elitePack.activeBadge') }}</span>
        <span class="text-ink-faint">
          {{ t('elitePack.seasonLabel', { season: pass?.seasonNumber, cycle: pass?.currentCycle, max: pass?.maxCycles }) }}
        </span>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          <span>{{ t('elitePack.seasonPassTitle') }}</span>
          <span>{{ pass?.summary?.completed ?? 0 }} / {{ pass?.summary?.total ?? 0 }}</span>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <div
            class="h-full rounded-full bg-accent transition-all duration-500"
            :style="{ width: `${progressPct}%` }"
          />
        </div>
      </div>

      <ul class="mt-6 space-y-4" data-testid="elite-quest-list">
        <li
          v-for="quest in pass?.quests ?? []"
          :key="quest.slug"
          class="border border-line/60 bg-bg-card/40 px-3 py-3"
          :class="{ 'border-accent/30': quest.completed }"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm text-ink" :class="{ 'text-ink-muted line-through': quest.completed }">
              {{ quest.label }}
            </p>
            <span
              v-if="quest.completed"
              class="shrink-0 text-[10px] uppercase tracking-[0.12em] text-accent"
            >
              {{ t('elitePack.questDone') }}
            </span>
          </div>
          <div class="mt-2 flex items-center gap-3">
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-bg-soft">
              <div
                class="h-full rounded-full transition-all"
                :class="quest.completed ? 'bg-accent/60' : 'bg-accent-soft/80'"
                :style="{ width: `${questProgress(quest)}%` }"
              />
            </div>
            <span class="shrink-0 text-[11px] tabular-nums text-ink-faint">
              {{ quest.currentProgress }}/{{ quest.targetCount }}
            </span>
          </div>
          <p class="mt-2 text-[10px] text-ink-faint">
            {{ t(`elitePack.reward.${quest.reward.type}`, { slug: quest.reward.slug }) }}
          </p>
        </li>
      </ul>

      <EliteIdentityEditor />
    </template>
  </div>
</template>

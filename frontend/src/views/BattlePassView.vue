<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BattlePassTrack from '../components/battlePass/BattlePassTrack.vue'
import QuestList from '../components/battlePass/QuestList.vue'
import { useBattlePassStore } from '../stores/battlePass'
import { useAuthStore } from '../stores/auth'

defineOptions({ name: 'BattlePassView' })

const { t, locale } = useI18n()
const store = useBattlePassStore()
const auth = useAuthStore()
const message = ref(null)
const activeTab = ref('free')

const canStubUnlock = computed(() => Boolean(auth.user?.isAdmin))

onMounted(async () => {
  await store.loadAll()
})

async function onClaim({ level, track }) {
  message.value = null
  const result = await store.claimReward(level, track)
  if (result) {
    message.value = t('battlePass.claimSuccess', { level, track: t(`battlePass.track.${track}`) })
  } else if (store.error) {
    message.value = store.error
  }
}

async function onUnlock(method) {
  message.value = null
  const result = await store.unlockPremium(method)
  if (result) {
    message.value = result.note || t('battlePass.premiumUnlocked')
  } else if (store.error) {
    message.value = store.error
  }
}

async function onClaimQuest(questId) {
  message.value = null
  const result = await store.claimQuest(questId)
  if (result) {
    message.value = t('battlePass.questClaimSuccess', { xp: result.xp?.xpGained || 0 })
  } else if (store.error) {
    message.value = store.error
  }
}

async function onStubProgress(quest) {
  message.value = null
  const remaining = Math.max(1, (quest.goalValue || 1) - (quest.progress?.current || 0))
  const result = await store.progressQuest(quest.questKey, remaining)
  if (result) {
    message.value = t('battlePass.stubProgressDone')
  } else if (store.error) {
    message.value = store.error
  }
}

async function onDebugXp() {
  message.value = null
  const result = await store.addXp(1000, 'debug_ui')
  if (result) {
    message.value = t('battlePass.xpGained', { n: result.xpGained })
  } else if (store.error) {
    message.value = store.error
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="battle-pass-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="page-kicker">{{ t('battlePass.kicker') }}</p>
        <h1 class="page-title mt-2">
          {{ store.season?.name || t('battlePass.title') }}
        </h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('battlePass.lead') }}</p>
      </div>

      <div v-if="store.progress" class="bp-summary">
        <p class="font-display text-3xl text-accent">
          {{ t('battlePass.level', { n: store.currentLevel }) }}
        </p>
        <div class="bp-xp mt-2" aria-hidden="true">
          <span class="bp-xp__fill" :style="{ width: `${store.xpProgressPct}%` }" />
        </div>
        <p class="mt-2 text-xs text-ink-muted">
          {{
            store.currentLevel >= store.maxLevel
              ? t('battlePass.maxLevel')
              : t('battlePass.xpToNext', { current: store.currentXp, next: store.xpForNext })
          }}
        </p>
        <p class="mt-1 text-xs" :class="store.isPremium ? 'text-win' : 'text-ink-muted'">
          {{ store.isPremium ? t('battlePass.premiumActive') : t('battlePass.freeActive') }}
        </p>
      </div>
    </div>

    <p v-if="store.loading && !store.season" class="mt-8 text-ink-muted">
      {{ t('battlePass.loading') }}
    </p>
    <p
      v-else-if="!store.season && !store.loading"
      class="mt-8 text-fire"
      data-testid="battle-pass-empty"
    >
      {{ t('battlePass.noSeason') }}
    </p>

    <template v-else-if="store.season">
      <p v-if="store.error && !message" class="mt-4 text-sm text-fire">{{ store.error }}</p>
      <p v-if="message" class="mt-4 text-sm text-accent">{{ message }}</p>

      <div v-if="!store.isPremium" class="bp-premium-cta mt-8">
        <div>
          <h2 class="font-display text-xl text-ink">{{ t('battlePass.unlockTitle') }}</h2>
          <p class="mt-2 text-sm text-ink-muted max-w-lg">{{ t('battlePass.unlockLead') }}</p>
          <p class="mt-2 text-xs text-ink-faint">{{ store.meta?.stripeNote }}</p>
        </div>
        <div class="flex flex-wrap gap-2 mt-4 sm:mt-0">
          <button
            type="button"
            class="btn-primary text-xs"
            :disabled="store.actionLoading"
            data-testid="unlock-premium-coins"
            @click="onUnlock('kage_coins')"
          >
            {{
              t('battlePass.unlockCoins', {
                n: store.meta?.premiumCostKageCoins || 500,
              })
            }}
          </button>
          <button
            v-if="canStubUnlock"
            type="button"
            class="btn-ghost text-xs"
            :disabled="store.actionLoading"
            data-testid="unlock-premium-stub"
            @click="onUnlock('stub')"
          >
            {{ t('battlePass.unlockStub') }}
          </button>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-ghost text-[10px]"
          :class="{ 'ring-1 ring-accent/60': activeTab === 'free' }"
          @click="activeTab = 'free'"
        >
          {{ t('battlePass.freeTrack') }}
          <span v-if="store.claimableFree" class="ml-1 text-accent">({{ store.claimableFree }})</span>
        </button>
        <button
          type="button"
          class="btn-ghost text-[10px]"
          :class="{ 'ring-1 ring-accent/60': activeTab === 'premium' }"
          @click="activeTab = 'premium'"
        >
          {{ t('battlePass.premiumTrack') }}
          <span v-if="store.claimablePremium" class="ml-1 text-accent">
            ({{ store.claimablePremium }})
          </span>
        </button>
        <button
          type="button"
          class="btn-ghost text-[10px] ml-auto"
          :disabled="store.actionLoading"
          data-testid="debug-bp-xp"
          @click="onDebugXp"
        >
          {{ t('battlePass.debugXp') }}
        </button>
      </div>

      <div class="mt-6">
        <BattlePassTrack
          v-if="activeTab === 'free'"
          track-type="free"
          :track="store.tracks?.free || []"
          :current-level="store.currentLevel"
          :busy="store.actionLoading"
          @claim="onClaim"
        />
        <BattlePassTrack
          v-else
          track-type="premium"
          :track="store.tracks?.premium || []"
          :current-level="store.currentLevel"
          :busy="store.actionLoading"
          @claim="onClaim"
        />
      </div>

      <div class="mt-12 grid gap-10 lg:grid-cols-2">
        <QuestList
          :title="t('battlePass.dailyQuests')"
          :quests="store.dailyQuests"
          :locale="locale"
          :busy="store.actionLoading"
          @claim="onClaimQuest"
          @stub-progress="onStubProgress"
        />
        <QuestList
          :title="t('battlePass.weeklyQuests')"
          :quests="store.weeklyQuests"
          :locale="locale"
          :busy="store.actionLoading"
          @claim="onClaimQuest"
          @stub-progress="onStubProgress"
        />
      </div>

      <div class="mt-10">
        <QuestList
          :title="t('battlePass.milestoneQuests')"
          :quests="store.milestoneQuests"
          :locale="locale"
          :busy="store.actionLoading"
          @claim="onClaimQuest"
          @stub-progress="onStubProgress"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.bp-summary {
  min-width: 11rem;
  text-align: right;
}

.bp-xp {
  height: 4px;
  width: 11rem;
  margin-left: auto;
  background: color-mix(in srgb, var(--kl-line-mix) 22%, transparent);
  overflow: hidden;
}

.bp-xp__fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--kl-accent), var(--kl-fire));
  transition: width 400ms ease;
}

.bp-premium-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 0;
  border-top: 1px solid color-mix(in srgb, var(--kl-line-mix) 18%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--kl-line-mix) 18%, transparent);
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--kl-accent) 8%, transparent),
    transparent 55%
  );
  animation: bp-cta-in 520ms ease both;
}

@keyframes bp-cta-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bp-xp__fill,
  .bp-premium-cta {
    animation: none;
    transition: none;
  }
}
</style>

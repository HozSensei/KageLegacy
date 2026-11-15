<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BattlePassTrack from '../components/battlePass/BattlePassTrack.vue'
import QuestList from '../components/battlePass/QuestList.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import marketImage from '../assets/illustrations/market-square.webp'
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
  <div class="page-shell" data-testid="battle-pass-page">
    <PageHeader
      index="08"
      tone="gold"
      layout="overlay"
      :kicker="t('battlePass.kicker')"
      :title="store.season?.name || t('battlePass.title')"
      :lead="t('battlePass.lead')"
      :image="marketImage"
      image-position="50% 40%"
    />

    <section v-if="store.progress" class="bp-summary" data-tone="gold">
      <div class="bp-summary__level">
        <span class="bp-summary__level-label">{{ t('battlePass.levelLabel') }}</span>
        <span :key="store.currentLevel" class="bp-summary__level-value" :title="t('battlePass.level', { n: store.currentLevel })">
          {{ store.currentLevel }}
        </span>
      </div>
      <div class="bp-summary__body">
        <div class="bp-summary__row">
          <p class="bp-summary__xp">
            {{
              store.currentLevel >= store.maxLevel
                ? t('battlePass.maxLevel')
                : t('battlePass.xpToNext', { current: store.currentXp, next: store.xpForNext })
            }}
          </p>
          <span
            class="badge"
            :class="{ 'badge--solid': store.isPremium }"
            :data-tone="store.isPremium ? 'leaf' : 'neutral'"
          >
            {{ store.isPremium ? t('battlePass.premiumActive') : t('battlePass.freeActive') }}
          </span>
        </div>
        <div class="meter meter--thick bp-summary__meter" aria-hidden="true">
          <span class="meter__fill" :style="{ width: `${store.xpProgressPct}%` }" />
        </div>
      </div>
    </section>

    <p v-if="store.loading && !store.season" class="mt-8 text-ink-muted">
      {{ t('battlePass.loading') }}
    </p>
    <p
      v-else-if="!store.season && !store.loading"
      class="alert alert--warning mt-8"
      data-testid="battle-pass-empty"
    >
      {{ t('battlePass.noSeason') }}
    </p>

    <template v-else-if="store.season">
      <p v-if="store.error && !message" class="alert alert--error mt-4">{{ store.error }}</p>
      <p v-if="message" class="alert alert--success mt-4">{{ message }}</p>

      <div v-if="!store.isPremium" class="bp-premium-cta" data-tone="gold">
        <span class="bp-premium-cta__shape" aria-hidden="true" />
        <div class="bp-premium-cta__text">
          <h2 class="t-subheading">{{ t('battlePass.unlockTitle') }}</h2>
          <p class="mt-2 max-w-lg text-ink">{{ t('battlePass.unlockLead') }}</p>
          <p v-if="store.meta?.stripeNote" class="mt-2 text-sm text-ink-muted">{{ store.meta.stripeNote }}</p>
        </div>
        <div class="bp-premium-cta__actions">
          <button
            type="button"
            class="btn-primary"
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
            class="btn-ghost"
            :disabled="store.actionLoading"
            data-testid="unlock-premium-stub"
            @click="onUnlock('stub')"
          >
            {{ t('battlePass.unlockStub') }}
          </button>
        </div>
      </div>

      <div class="bp-tabs">
        <div class="tabs" role="tablist" :aria-label="t('battlePass.tracksLabel')">
          <button
            type="button"
            role="tab"
            class="tab"
            :aria-selected="activeTab === 'free'"
            @click="activeTab = 'free'"
          >
            {{ t('battlePass.freeTrack') }}
            <span v-if="store.claimableFree" class="tab__count">{{ store.claimableFree }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            :aria-selected="activeTab === 'premium'"
            @click="activeTab = 'premium'"
          >
            {{ t('battlePass.premiumTrack') }}
            <span v-if="store.claimablePremium" class="tab__count">{{ store.claimablePremium }}</span>
          </button>
        </div>
        <button
          type="button"
          class="btn-ghost btn-sm"
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

      <div class="mt-14 grid gap-x-12 gap-y-10 lg:grid-cols-2">
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
  display: flex;
  align-items: stretch;
  margin-top: 1.75rem;
  background: var(--color-bg-card);
}

.bp-summary__level {
  display: flex;
  min-width: 6.5rem;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.85rem 1rem 0.75rem;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.bp-summary__level-label {
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.bp-summary__level-value {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 2.6rem + 3.5vw, 5.5rem);
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.8;
  letter-spacing: -0.03em;
  animation: pop-in 420ms var(--ease-out-quint) both;
}

.bp-summary__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.bp-summary__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.bp-summary__xp {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--color-ink);
}

.bp-summary__meter .meter__fill {
  transform-origin: left;
  animation: bar-grow 700ms var(--ease-out-quint) 150ms backwards;
}

.bp-premium-cta {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem 2rem;
  overflow: hidden;
  margin-top: 2rem;
  padding: 1.5rem 1.5rem 1.5rem 1.75rem;
  border-left: 6px solid var(--tone-fill);
  background: var(--tone-tint);
  animation: rise-in 480ms var(--ease-out-quint) both;
}

.bp-premium-cta__shape {
  position: absolute;
  top: -4rem;
  right: -3rem;
  width: 8rem;
  height: 8rem;
  background: color-mix(in srgb, var(--tone-fill) 30%, transparent);
  transform: rotate(45deg);
}

.bp-premium-cta__text,
.bp-premium-cta__actions {
  position: relative;
}

.bp-premium-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bp-tabs {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2.5rem;
  border-bottom: 1px solid var(--color-line);
}

.bp-tabs .tabs {
  min-width: 0;
  flex: 1;
  border-bottom: 0;
}

@media (max-width: 559px) {
  .bp-tabs {
    flex-wrap: wrap;
    gap: 0.75rem;
    border-bottom: 0;
  }

  .bp-tabs .tabs {
    flex-basis: 100%;
    border-bottom: 1px solid var(--color-line);
  }
}
</style>

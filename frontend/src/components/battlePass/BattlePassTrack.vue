<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'BattlePassTrack' })

const props = defineProps({
  track: { type: Array, default: () => [] },
  trackType: { type: String, default: 'free' },
  currentLevel: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['claim'])

const { t } = useI18n()

const isPremiumTrack = computed(() => props.trackType === 'premium')

function rewardLabel(reward) {
  if (!reward) return ''
  switch (reward.type) {
    case 'ryos':
      return t('battlePass.reward.ryos', { n: reward.amount })
    case 'dust':
      return t('battlePass.reward.dust', { n: reward.amount })
    case 'essence':
      return t('battlePass.reward.essence', { n: reward.amount })
    case 'kage_coins':
      return t('battlePass.reward.kageCoins', { n: reward.amount })
    case 'card':
      return t('battlePass.reward.card', {
        rarity: t(`battlePass.rarity.${reward.rarity || 'rare'}`),
        n: reward.count || 1,
      })
    case 'booster':
      return t('battlePass.reward.booster', {
        type: t(`battlePass.booster.${reward.boosterType || 'standard'}`),
      })
    case 'cosmetic':
      return t('battlePass.reward.cosmetic', {
        kind: t(`battlePass.cosmetic.${reward.cosmeticType || 'avatar'}`),
      })
    default:
      return reward.type
  }
}

function tierRewards(tier) {
  return (tier.rewards || []).map(rewardLabel).join(' · ')
}

function statusClass(tier) {
  if (tier.claimed) return 'bp-tier--claimed'
  if (tier.claimable) return 'bp-tier--claimable'
  if (tier.locked) return 'bp-tier--locked'
  if (tier.reached) return 'bp-tier--reached'
  return 'bp-tier--locked'
}
</script>

<template>
  <div class="bp-track" :data-track="trackType" data-testid="battle-pass-track">
    <header class="bp-track__head">
      <h2 class="font-display text-xl text-ink">
        {{ isPremiumTrack ? t('battlePass.premiumTrack') : t('battlePass.freeTrack') }}
      </h2>
      <p class="text-sm text-ink-muted mt-1">
        {{
          isPremiumTrack ? t('battlePass.premiumTrackLead') : t('battlePass.freeTrackLead')
        }}
      </p>
    </header>

    <ol class="bp-track__list mt-6">
      <li
        v-for="tier in track"
        :key="`${trackType}-${tier.level}`"
        class="bp-tier"
        :class="[
          statusClass(tier),
          { 'bp-tier--current': tier.level === currentLevel },
        ]"
      >
        <div class="bp-tier__level font-display">{{ tier.level }}</div>
        <div class="bp-tier__body">
          <p class="bp-tier__rewards">{{ tierRewards(tier) || t('battlePass.noReward') }}</p>
          <p class="bp-tier__meta text-ink-faint">
            {{ t('battlePass.xpNeeded', { n: tier.xpNeeded }) }}
          </p>
        </div>
        <div class="bp-tier__action">
          <span v-if="tier.claimed" class="bp-badge bp-badge--done">
            {{ t('battlePass.claimed') }}
          </span>
          <span v-else-if="tier.locked" class="bp-badge bp-badge--locked">
            {{ t('battlePass.premiumLocked') }}
          </span>
          <button
            v-else-if="tier.claimable"
            type="button"
            class="btn-primary text-[10px]"
            :disabled="busy"
            :data-testid="`claim-${trackType}-${tier.level}`"
            @click="emit('claim', { level: tier.level, track: trackType })"
          >
            {{ t('battlePass.claim') }}
          </button>
          <span v-else-if="tier.reached" class="bp-badge">{{ t('battlePass.reached') }}</span>
          <span v-else class="bp-badge bp-badge--locked">{{ t('battlePass.locked') }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.bp-track__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
  max-height: 28rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.bp-tier {
  display: grid;
  grid-template-columns: 2.75rem 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--kl-line-mix) 18%, transparent);
  transition: background 180ms ease, transform 180ms ease;
}

.bp-tier--claimable {
  background: color-mix(in srgb, var(--kl-accent) 10%, transparent);
}

.bp-tier--current {
  box-shadow: inset 2px 0 0 var(--kl-accent);
}

.bp-tier--claimed {
  opacity: 0.72;
}

.bp-tier--locked {
  opacity: 0.55;
}

.bp-tier__level {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--kl-accent) 45%, transparent);
  color: var(--kl-accent);
  font-size: 1.05rem;
}

.bp-tier--claimable .bp-tier__level {
  background: color-mix(in srgb, var(--kl-accent) 18%, transparent);
  animation: bp-pulse 1.8s ease-in-out infinite;
}

.bp-tier__rewards {
  font-size: 0.85rem;
  color: var(--kl-ink);
}

.bp-tier__meta {
  font-size: 0.7rem;
  margin-top: 0.15rem;
}

.bp-badge {
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--kl-ink-muted);
}

.bp-badge--done {
  color: var(--kl-win);
}

.bp-badge--locked {
  color: var(--kl-ink-faint);
}

@keyframes bp-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bp-tier,
  .bp-tier--claimable .bp-tier__level {
    animation: none;
    transition: none;
  }
}
</style>

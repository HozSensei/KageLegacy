<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { profileFrameLabel } from '../../constants/profileFrames.js';
import { ninjaNicknameLabel } from '../../utils/ninjaProfile.js';

defineOptions({ name: 'BattlePassTrack' });

const props = defineProps({
  track: { type: Array, default: () => [] },
  trackType: { type: String, default: 'free' },
  currentLevel: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
});

const emit = defineEmits(['claim']);

const { t, te, locale } = useI18n();

const isPremiumTrack = computed(() => props.trackType === 'premium');

function rewardLabel(reward) {
  if (!reward) return '';
  switch (reward.type) {
    case 'ryos':
      return t('battlePass.reward.ryos', { n: reward.amount });
    case 'dust':
      return t('battlePass.reward.dust', { n: reward.amount });
    case 'essence':
      return t('battlePass.reward.essence', { n: reward.amount });
    case 'kage_coins':
      return t('battlePass.reward.kageCoins', { n: reward.amount });
    case 'card':
      return t('battlePass.reward.card', {
        rarity: t(`battlePass.rarity.${reward.rarity || 'rare'}`),
        n: reward.count || 1,
      });
    case 'booster':
      return t('battlePass.reward.booster', {
        type: t(`battlePass.booster.${reward.boosterType || 'standard'}`),
      });
    case 'nickname': {
      const nicknameId = reward.nicknameId || reward.id;
      return t('battlePass.reward.nickname', {
        name: ninjaNicknameLabel(nicknameId, t, te, [], locale.value),
      });
    }
    case 'frame': {
      const frameId = reward.frameId || reward.id;
      return t('battlePass.reward.frame', {
        name: profileFrameLabel(frameId, t, te, locale.value),
      });
    }
    default:
      return reward.type;
  }
}

function tierRewards(tier) {
  return (tier.rewards || [])
    .filter(reward => reward.type !== 'cosmetic')
    .map(rewardLabel)
    .join(' · ');
}

function statusClass(tier) {
  if (tier.claimed) return 'bp-tier--claimed';
  if (tier.claimable) return 'bp-tier--claimable';
  if (tier.locked) return 'bp-tier--locked';
  if (tier.reached) return 'bp-tier--reached';
  return 'bp-tier--locked';
}
</script>

<template>
  <div
    class="bp-track"
    :data-track="trackType"
    :data-tone="isPremiumTrack ? 'gold' : 'indigo'"
    data-testid="battle-pass-track"
  >
    <header class="bp-track__head">
      <h2 class="t-subheading">
        {{ isPremiumTrack ? t('battlePass.premiumTrack') : t('battlePass.freeTrack') }}
      </h2>
      <p class="mt-1 text-ink-muted">
        {{ isPremiumTrack ? t('battlePass.premiumTrackLead') : t('battlePass.freeTrackLead') }}
      </p>
    </header>

    <ol class="bp-track__list">
      <li
        v-for="tier in track"
        :key="`${trackType}-${tier.level}`"
        class="bp-tier"
        :class="[
          statusClass(tier),
          {
            'bp-tier--current': tier.level === currentLevel,
            'bp-tier--passed': tier.level <= currentLevel,
          },
        ]"
      >
        <div class="bp-tier__marker">
          <span class="bp-tier__level">{{ tier.level }}</span>
        </div>
        <div class="bp-tier__body">
          <p class="bp-tier__rewards">{{ tierRewards(tier) || t('battlePass.noReward') }}</p>
          <p class="bp-tier__meta">
            {{ t('battlePass.xpNeeded', { n: tier.xpNeeded }) }}
          </p>
        </div>
        <div class="bp-tier__action">
          <span v-if="tier.claimed" class="bp-badge bp-badge--done">
            <AppIcon name="check" size="0.95rem" :stroke-width="2.5" />
            {{ t('battlePass.claimed') }}
          </span>
          <span v-else-if="tier.locked" class="bp-badge bp-badge--locked">
            <AppIcon name="lock" size="0.9rem" />
            {{ t('battlePass.premiumLocked') }}
          </span>
          <button
            v-else-if="tier.claimable"
            type="button"
            class="btn-primary btn-sm"
            :disabled="busy"
            :data-testid="`claim-${trackType}-${tier.level}`"
            @click="emit('claim', { level: tier.level, track: trackType })"
          >
            {{ t('battlePass.claim') }}
          </button>
          <span v-else-if="tier.reached" class="bp-badge">{{ t('battlePass.reached') }}</span>
          <span v-else class="bp-badge bp-badge--locked">
            <AppIcon name="lock" size="0.9rem" />
            {{ t('battlePass.locked') }}
          </span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.bp-track__list {
  display: grid;
  max-height: 30rem;
  margin: 1.25rem 0 0;
  padding: 0 0.5rem 0 0;
  overflow-y: auto;
  list-style: none;
}

.bp-tier {
  position: relative;
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  min-height: 4rem;
  padding: 0.5rem 0.75rem 0.5rem 0;
  transition: background var(--dur-base) ease;
}

/* Rail vertical : un segment par palier, plein jusqu'au niveau atteint. */
.bp-tier__marker {
  position: relative;
  display: grid;
  align-self: stretch;
  place-items: center;
}

.bp-tier__marker::before {
  content: '';
  position: absolute;
  top: -0.5rem;
  bottom: -0.5rem;
  left: 50%;
  width: 4px;
  background: var(--color-line);
  transform: translateX(-50%);
  transition: background var(--dur-slow) ease;
}

.bp-tier:first-child .bp-tier__marker::before {
  top: 50%;
}

.bp-tier:last-child .bp-tier__marker::before {
  bottom: 50%;
}

.bp-tier--passed .bp-tier__marker::before {
  background: var(--tone-fill);
}

.bp-tier__level {
  position: relative;
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  background: var(--color-bg);
  box-shadow: inset 0 0 0 2px var(--color-line-strong);
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-faint);
  transition:
    background var(--dur-slow) ease,
    color var(--dur-slow) ease,
    box-shadow var(--dur-slow) ease;
}

.bp-track[data-track='premium'] .bp-tier__level {
  border-radius: 999px;
}

.bp-tier--passed .bp-tier__level {
  background: var(--tone-fill);
  box-shadow: none;
  color: var(--tone-on);
}

.bp-tier--current {
  background: var(--color-bg-card);
}

.bp-tier--current .bp-tier__level {
  width: 3rem;
  height: 3rem;
  font-size: 1.5rem;
}

.bp-tier--claimable {
  background: var(--tone-tint);
}

.bp-tier--claimable .bp-tier__level {
  animation: pulse-ring 1.8s ease-out infinite;
}

.bp-tier__rewards {
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-ink);
}

.bp-tier__meta {
  margin-top: 0.1rem;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
}

.bp-tier--locked .bp-tier__rewards {
  font-weight: 500;
  color: var(--color-ink-muted);
}

.bp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.bp-badge--done {
  color: var(--color-leaf);
}

.bp-badge--locked {
  font-weight: 600;
  color: var(--color-ink-faint);
}

@media (max-width: 479px) {
  .bp-tier {
    grid-template-columns: 3rem minmax(0, 1fr);
  }

  .bp-tier__action {
    grid-column: 2;
    margin-top: -0.4rem;
  }
}
</style>

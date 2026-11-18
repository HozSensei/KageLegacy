<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { localizedName } from '../../utils/localeContent.js';

defineOptions({ name: 'VictoryRewards' });

const props = defineProps({
  rewards: { type: Object, default: null },
  state: { type: String, default: 'victory' },
  /** Combat au sein d'un parcours : pas de loot immédiat */
  midRun: { type: Boolean, default: false },
  continueLabel: { type: String, default: null },
});

const emit = defineEmits(['dismiss']);

const { t, locale } = useI18n();

const isVictory = computed(() => props.state === 'victory');

const title = computed(() => {
  if (props.midRun && isVictory.value) return t('combat.stepCleared');
  if (isVictory.value) return t('combat.victory');
  if (props.state === 'forfeited') return t('combat.forfeited');
  return t('combat.defeat');
});

const ctaLabel = computed(
  () => props.continueLabel || (props.midRun ? t('combat.continueRun') : t('combat.backToMissions'))
);

const lines = computed(() => {
  const r = props.rewards;
  if (!r || r.error) return [];
  const out = [];
  if (r.xp > 0) out.push({ key: 'xp', label: t('combat.rewardXp', { n: r.xp }) });
  if (r.ryos > 0) out.push({ key: 'ryos', label: t('combat.rewardRyos', { n: r.ryos }) });
  if (r.leveledUp) {
    out.push({
      key: 'level',
      label: t('combat.rewardLevel', {
        n: r.levelsGained,
        talent: r.talentPointsGained || 0,
      }),
    });
  }
  if (r.card) {
    const name = localizedName(r.card, locale.value, '…');
    out.push({
      key: 'card',
      label: t('combat.rewardCard', { name }),
      to: name === '…' ? null : { name: 'collection', query: { search: name } },
    });
  } else if (r.cardRolled === false && (r.xp > 0 || r.ryos > 0)) {
    out.push({ key: 'no-card', label: t('combat.rewardNoCard') });
  }
  if (r.runMult) {
    out.push({ key: 'run', label: t('combat.rewardRunBonus', { n: r.runMult }) });
  }
  return out;
});
</script>

<template>
  <div
    class="victory"
    :class="`victory--${state}`"
    :data-tone="isVictory ? 'leaf' : 'vermilion'"
    data-testid="victory-rewards"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <span class="victory__shape" aria-hidden="true" />
    <div class="victory__content">
      <p class="victory__title">{{ title }}</p>

      <p v-if="midRun && isVictory" class="victory__muted">
        {{ t('combat.stepClearedHint') }}
      </p>

      <ul v-else-if="isVictory && lines.length" class="victory__list stagger">
        <li v-for="line in lines" :key="line.key">
          <span class="lozenge" aria-hidden="true" />
          <RouterLink v-if="line.to" :to="line.to" class="victory__reward-link">
            {{ line.label }}
          </RouterLink>
          <span v-else>{{ line.label }}</span>
        </li>
      </ul>
      <p v-else-if="isVictory && rewards?.error" class="victory__muted">
        {{ t('combat.rewardError') }}
      </p>
      <p v-else-if="isVictory && !rewards && !midRun" class="victory__muted">
        {{ t('combat.rewardPending') }}
      </p>
    </div>

    <button type="button" class="btn-primary btn-lg victory__cta" @click="emit('dismiss')">
      {{ ctaLabel }}
    </button>
  </div>
</template>

<style scoped>
.victory {
  position: relative;
  display: grid;
  gap: 1.25rem;
  align-items: center;
  overflow: hidden;
  padding: clamp(1.25rem, 4vw, 2rem);
  border-radius: var(--radius-md);
  background: var(--tone-tint);
  animation: rise-in 480ms var(--ease-out-quint) both;
}

.victory__shape {
  position: absolute;
  top: -3rem;
  right: -3rem;
  width: clamp(6.5rem, 22vw, 11rem);
  height: clamp(6.5rem, 22vw, 11rem);
  background: var(--tone-fill);
  opacity: 0.9;
  transform: rotate(45deg);
  animation: pop-in 620ms var(--ease-out-quint) 120ms both;
}

.victory--defeat .victory__shape,
.victory--forfeited .victory__shape {
  border-radius: 50%;
}

.victory__content {
  position: relative;
  min-width: 0;
}

.victory__title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 1.6rem + 5vw, 4.5rem);
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  letter-spacing: -0.025em;
  color: var(--color-ink);
}

.victory__list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 1rem;
  font-weight: 600;
}

.victory__list li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.victory__list .lozenge {
  color: var(--tone-fill);
}

.victory__reward-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--tone-fill);
  text-underline-offset: 0.2em;
}

.victory__reward-link:hover {
  text-decoration-thickness: 0.12em;
}

.victory__muted {
  margin-top: 0.85rem;
  max-width: 28rem;
  color: var(--color-ink-muted);
}

.victory__cta {
  position: relative;
  justify-self: start;
}

@media (min-width: 768px) {
  .victory {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
  }

  .victory__cta {
    align-self: end;
    justify-self: end;
  }
}
</style>

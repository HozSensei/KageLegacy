<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import BoosterOpening from '../shop/BoosterOpening.vue';
import { localizedName } from '../../utils/localeContent.js';

defineOptions({ name: 'VictoryRewards' });

const props = defineProps({
  rewards: { type: Object, default: null },
  state: { type: String, default: 'victory' },
  /** Combat au sein d'un parcours : pas de loot immédiat */
  midRun: { type: Boolean, default: false },
  continueLabel: { type: String, default: null },
  showPendingRewards: { type: Boolean, default: true },
});

const emit = defineEmits(['dismiss']);

const { t, locale } = useI18n();

/** summary | opening */
const phase = ref('summary');

watch(
  () => [props.rewards, props.midRun, props.state],
  () => {
    phase.value = 'summary';
  }
);

const isVictory = computed(() => props.state === 'victory');

const title = computed(() => {
  if (props.midRun && isVictory.value) return t('combat.stepCleared');
  if (isVictory.value) return t('combat.victory');
  if (props.state === 'forfeited') return t('combat.forfeited');
  return t('combat.defeat');
});

const lootCards = computed(() => {
  const r = props.rewards;
  if (!r || r.error || props.midRun || !isVictory.value) return [];
  // Payload mission (completeRunVictory) — pas les duels hors parcours.
  if (Array.isArray(r.lootCards)) {
    return r.lootCards.filter(entry => entry?.card);
  }
  const shop = Array.isArray(r.shopCards) ? r.shopCards.filter(entry => entry?.card) : [];
  if (!shop.length) return [];
  const out = [];
  if (r.card?.card) {
    out.push({
      collectionId: r.card.collectionId ?? null,
      isNew: Boolean(r.card.isNew),
      rarity: r.card.card.rarity || r.card.rarity || 'common',
      card: r.card.card,
    });
  }
  for (const entry of shop) {
    out.push({
      collectionId: entry.collectionId ?? null,
      isNew: Boolean(entry.isNew),
      rarity: entry.card.rarity || entry.rarity || 'common',
      card: entry.card,
    });
  }
  return out;
});

const hasLootReveal = computed(() => lootCards.value.length > 0);

const ctaLabel = computed(() => {
  if (hasLootReveal.value && phase.value === 'summary') {
    return t('combat.revealLoot');
  }
  return props.continueLabel || (props.midRun ? t('combat.continueRun') : t('combat.backToMissions'));
});

const lines = computed(() => {
  const r = props.rewards;
  if (!r || r.error) return [];
  const out = [];
  if (r.xp > 0) out.push({ key: 'xp', label: t('combat.rewardXp', { n: r.xp }) });
  const totalRyos = Number(r.ryos) || 0;
  const purseReturned = Math.max(0, Number(r.purseReturned) || 0);
  const missionRyos = Math.max(0, totalRyos - purseReturned);
  if (missionRyos > 0) {
    out.push({ key: 'ryos', label: t('combat.rewardRyos', { n: missionRyos }) });
  }
  if (purseReturned > 0) {
    out.push({ key: 'purse', label: t('notifications.rewardPurse', { n: purseReturned }) });
  } else if (totalRyos > 0 && missionRyos <= 0) {
    out.push({ key: 'ryos', label: t('combat.rewardRyos', { n: totalRyos }) });
  }
  if (r.leveledUp) {
    out.push({
      key: 'level',
      label: t('combat.rewardLevel', {
        n: r.levelsGained,
        talent: r.talentPointsGained || 0,
      }),
    });
  }
  const deposits = Array.isArray(r.inventoryDeposits) ? r.inventoryDeposits : [];
  if (deposits.length > 0) {
    const qty = deposits.reduce((sum, d) => sum + (Number(d.quantity) || 1), 0);
    out.push({
      key: 'inventory',
      label: t('combat.rewardInventoryDeposit', { n: qty }),
      to: { name: 'inventory' },
    });
  }
  if (hasLootReveal.value) {
    out.push({
      key: 'loot',
      label: t('combat.revealLootHint', { n: lootCards.value.length }),
    });
  } else if (r.card) {
    const name = localizedName(r.card, locale.value, '…');
    out.push({
      key: 'card',
      label: t('combat.rewardCard', { name }),
      to: name === '…' ? null : { name: 'collection', query: { search: name } },
    });
  } else if (
    r.cardRolled === false &&
    (r.xp > 0 || totalRyos > 0) &&
    deposits.length === 0
  ) {
    // Drop aléatoire de fin manqué — les scellés vont désormais en poche.
    out.push({ key: 'no-card', label: t('combat.rewardNoCard') });
  }
  if (r.runMult) {
    out.push({ key: 'run', label: t('combat.rewardRunBonus', { n: r.runMult }) });
  }
  return out;
});

function onCta() {
  if (hasLootReveal.value && phase.value === 'summary') {
    phase.value = 'opening';
    return;
  }
  emit('dismiss');
}

function onRevealDone() {
  phase.value = 'summary';
  emit('dismiss');
}
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
      <p v-else-if="isVictory && !rewards && !midRun && showPendingRewards" class="victory__muted">
        {{ t('combat.rewardPending') }}
      </p>
    </div>

    <button type="button" class="btn-primary btn-lg victory__cta" @click="onCta">
      {{ ctaLabel }}
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="phase === 'opening' && hasLootReveal"
      class="loot-reveal"
      data-testid="mission-loot-reveal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('combat.lootRevealTitle')"
    >
      <div class="loot-reveal__scroll">
        <header class="loot-reveal__header">
          <p class="loot-reveal__kicker">{{ t('combat.lootRevealKicker') }}</p>
          <h2 class="loot-reveal__title">{{ t('combat.lootRevealTitle') }}</h2>
          <p class="loot-reveal__lead">{{ t('combat.lootRevealLead') }}</p>
        </header>
        <BoosterOpening
          :cards="lootCards"
          :active="phase === 'opening'"
          booster-type="standard"
          :booster-name="t('shop.sealedScroll')"
          :card-count="lootCards.length"
          :show-collection-status="true"
          :done-label="continueLabel || t('combat.backToMissions')"
          :done-status="t('combat.lootRevealDone')"
          @done="onRevealDone"
        />
      </div>
    </div>
  </Teleport>
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

.loot-reveal {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  padding:
    env(safe-area-inset-top, 0px)
    env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px)
    env(safe-area-inset-left, 0px);
  overscroll-behavior: none;
  animation: fade-in var(--dur-base) ease both;
}

.loot-reveal__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: clamp(0.75rem, 2.5vw, 1.5rem) clamp(0.85rem, 3vw, 2rem)
    clamp(1.25rem, 4vw, 2.25rem);
}

.loot-reveal__header {
  margin-bottom: 0.5rem;
  text-align: center;
}

.loot-reveal__kicker {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-wood);
}

.loot-reveal__title {
  margin: 0.35rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.2rem + 2vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
  color: var(--color-ink);
}

.loot-reveal__lead {
  margin: 0.65rem auto 0;
  max-width: 28rem;
  color: var(--color-ink-muted);
  font-size: 0.9375rem;
  line-height: 1.45;
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

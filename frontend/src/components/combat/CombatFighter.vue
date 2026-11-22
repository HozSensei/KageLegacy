<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import bossBackground from '../../assets/illustrations/bg-boss.webp';
import enemyBackground from '../../assets/illustrations/bg-ennemi.webp';
import { localizedName } from '../../utils/localeContent.js';
import { ninjaRankLabel } from '../../utils/ninjaProfile.js';
import NinjaProfileCard from '../player/NinjaProfileCard.vue';
import StatusIcon from './StatusIcon.vue';

const props = defineProps({
  fighter: { type: Object, required: true },
  roleLabel: { type: String, required: true },
  /** `ninja` pour un joueur (ou adversaire joueur), `enemy` pour un ennemi PvE. */
  variant: { type: String, default: 'ninja' },
  /** Valeurs des arts du combattant ; à défaut, celles exposées par le combattant lui-même. */
  arts: { type: Object, default: null },
  showPiles: { type: Boolean, default: false },
});

const { t, te, locale } = useI18n();
const isEnemy = computed(() => props.variant === 'enemy');
const name = computed(() => localizedName(props.fighter, locale.value, props.roleLabel));
const rank = computed(() =>
  props.fighter.rank ? ninjaRankLabel(props.fighter.rank, t, te) : null
);
const stats = computed(() => ({
  hp: props.fighter.hp,
  maxHp: props.fighter.maxHp,
  armor: props.fighter.block,
  chakra: props.fighter.chakra,
  maxChakra: props.fighter.maxChakra,
}));
const background = computed(() => {
  if (!isEnemy.value) return null;
  return props.fighter.boss ? bossBackground : enemyBackground;
});
const chain = computed(() => {
  const type = props.fighter.previousCardStatType;
  if (!type) return '—';
  const key = `cards.stats.${type}`;
  return te(key) ? t(key) : type;
});
</script>

<template>
  <div class="combat-fighter">
    <p class="t-kicker">{{ roleLabel }}</p>
    <NinjaProfileCard
      :variant="variant"
      :name="name"
      :rank="rank"
      :level="fighter.level"
      :profile="fighter.profile"
      :faction-id="fighter.factionId"
      :stats="stats"
      :arts="arts ?? fighter.stats"
      :background="background"
    >
      <template #statuses>
        <div
          v-if="fighter.statuses?.length"
          class="combat-fighter__statuses"
          data-testid="combat-fighter-statuses"
        >
          <StatusIcon
            v-for="(status, idx) in fighter.statuses"
            :key="`${status.key}-${idx}`"
            :status="status"
          />
        </div>
        <p v-else class="combat-fighter__none">{{ t('combat.noStatus') }}</p>
      </template>

      <template v-if="showPiles || $slots.aside" #aside>
        <slot name="aside" />
        <ul v-if="showPiles" class="combat-fighter__piles">
          <li>{{ t('combat.drawPile', { n: fighter.drawCount ?? 0 }) }}</li>
          <li>{{ t('combat.discardPile', { n: fighter.discardCount ?? 0 }) }}</li>
          <li data-testid="combat-fighter-chain">
            <span>{{ t('combat.chainLabel') }}</span> <strong>{{ chain }}</strong>
          </li>
        </ul>
      </template>
    </NinjaProfileCard>

    <slot />

    <div v-if="fighter.ally" class="summon" data-testid="combat-ally">
      <span class="shape shape--hexagon summon__mark" aria-hidden="true" />
      <div class="min-w-0">
        <p class="t-kicker">{{ t('combat.allyLabel') }}</p>
        <p class="summon__name">{{ localizedName(fighter.ally, locale) }}</p>
      </div>
      <p class="combat-fighter__meta summon__meta">
        <strong>{{ fighter.ally.hp }}</strong>/{{ fighter.ally.maxHp }} {{ t('combat.hpLabel') }} ·
        {{ t('combat.allyAttackStat', { n: fighter.ally.attack }) }}
        <span v-if="fighter.ally.taunt">· {{ t('combat.allyTaunt') }}</span>
        <span v-if="fighter.ally.regen">· {{ t('combat.allyRegen', { n: fighter.ally.regen }) }}</span>
        <span v-if="fighter.ally.evadeChance"
          >·
          {{
            t('combat.allyEvade', { pct: Math.round(Number(fighter.ally.evadeChance) * 100) })
          }}</span
        >
        <span v-if="fighter.ally.burn">· {{ t('combat.allyBurn') }}</span>
        <span v-if="fighter.ally.remainingTurns != null">
          · {{ t('combat.allyTurns', { n: fighter.ally.remainingTurns }) }}
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.combat-fighter {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.55rem;
}

.combat-fighter > :deep(.ninja-card) {
  flex: 1 1 auto;
}

.combat-fighter__meta {
  color: var(--color-ink-muted);
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.combat-fighter__statuses,
.summon {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.combat-fighter__none {
  font-size: 0.8125rem;
  font-style: italic;
  opacity: 0.7;
}

.combat-fighter__piles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.9rem;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  list-style: none;
}

.combat-fighter__piles li span {
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  opacity: 0.75;
  text-transform: uppercase;
}

.combat-fighter__piles li strong {
  color: var(--color-gold-fill);
}

.summon {
  align-items: center;
  gap: 0.4rem 0.75rem;
  padding: 0.6rem 0.75rem;
  background: var(--color-bg-card);
  animation: rise-in 360ms var(--ease-out-quint) both;
}

.summon__mark {
  font-size: 1.5rem;
  color: var(--color-wood-fill);
}

.summon__name {
  font-family: var(--font-display);
  font-weight: 700;
}

.summon__meta {
  margin-left: auto;
}
</style>

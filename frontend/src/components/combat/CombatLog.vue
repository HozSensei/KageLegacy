<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'CombatLog' });

const props = defineProps({
  logs: { type: Array, default: () => [] },
  /** Duel PvP : siège du joueur (`host` ou `guest`) pour dire « vous » ou « l'adversaire ». */
  viewerSeat: { type: String, default: null },
});

const { t, te, locale } = useI18n();

/* Événements purement techniques (effet de carte pas encore branché côté moteur) : non affichés. */
const HIDDEN_TYPES = new Set(['stub_effect']);

const lines = computed(() =>
  (props.logs || [])
    .filter(log => log && !HIDDEN_TYPES.has(log.type))
    .slice(0, 12)
    .map((log, idx) => ({
      key: `${idx}-${log.type}`,
      text: formatLog(log),
    }))
);

/** Dernier recours pour un type inconnu : jamais d'identifiant technique brut à l'écran. */
function humanize(code) {
  const text = String(code ?? '')
    .replace(/_/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function isSeat(value) {
  return value === 'host' || value === 'guest';
}

/** Vrai quand l'événement vient du joueur qui regarde (PvE : `player` ; PvP : son siège). */
function isMine(value) {
  if (isSeat(value)) return value === props.viewerSeat;
  return value !== 'enemy';
}

function statusLabel(status) {
  const key = typeof status === 'string' ? status : status?.key;
  if (!key) return '';
  return te(`combat.statuses.${key}`) ? t(`combat.statuses.${key}`) : humanize(key);
}

const PCT_STATUS_KEYS = new Set([
  'damage_pct',
  'block_pct',
  'heal_pct',
  'taijutsu_pct',
  'ninjutsu_pct',
  'genjutsu_pct',
]);

function statusWithValue(status, value) {
  const key = typeof status === 'string' ? status : status?.key;
  const label = statusLabel(status);
  const n = Number(value ?? (typeof status === 'object' ? status?.value : 0)) || 0;
  if (n === 0) return label;
  if (PCT_STATUS_KEYS.has(key)) {
    return t('combat.log.statusPct', { status: label, n });
  }
  return t('combat.log.statusValue', { status: label, n });
}

function talentLabel(effect) {
  return te(`combat.log.talentNames.${effect}`)
    ? t(`combat.log.talentNames.${effect}`)
    : humanize(effect);
}

function localName(source, fallback = '') {
  if (!source) return fallback;
  return (
    (locale.value === 'en' ? source.nameEn || source.nameFr : source.nameFr || source.nameEn) ||
    fallback
  );
}

function formatLog(log) {
  const n = log.amount ?? log.value ?? 0;
  switch (log.type) {
    case 'combat_start':
      return t('combat.log.combatStart');
    case 'duel_start':
      return t('combat.log.duelStart');
    case 'damage':
      if (isSeat(log.source)) {
        return t(isMine(log.source) ? 'combat.log.damageYou' : 'combat.log.damageOpponent', { n });
      }
      if (log.source === 'enemy') {
        return t(log.fromCharge ? 'combat.log.damageEnemyCharged' : 'combat.log.damageEnemy', {
          n,
        });
      }
      return t(log.isCrit ? 'combat.log.damageYouCrit' : 'combat.log.damageYou', { n });
    case 'block': {
      const who = log.seat ?? log.source;
      if (isSeat(who))
        return t(isMine(who) ? 'combat.log.blockYou' : 'combat.log.blockOpponent', { n });
      return t(who === 'enemy' ? 'combat.log.blockEnemy' : 'combat.log.blockYou', { n });
    }
    case 'phase_block':
      return t('combat.log.blockEnemy', { n: log.block ?? 0 });
    case 'block_fade':
      return t(log.side === 'enemy' ? 'combat.log.blockFadeEnemy' : 'combat.log.blockFadeYou', {
        n,
      });
    case 'block_denied':
      return t('combat.log.blockDenied');
    case 'heal':
      return t(
        isSeat(log.seat) && !isMine(log.seat) ? 'combat.log.healOpponent' : 'combat.log.healYou',
        { n }
      );
    case 'draw': {
      const count = log.count ?? 0;
      const key =
        isSeat(log.seat) && !isMine(log.seat) ? 'combat.log.drawOpponent' : 'combat.log.drawYou';
      return t(key, { n: count }, count);
    }
    case 'gain_chakra':
      return t('combat.log.gainChakra', { n });
    case 'poison':
      return t(log.side === 'enemy' ? 'combat.log.poisonEnemy' : 'combat.log.poisonYou', { n });
    case 'burn':
      return t(log.side === 'enemy' ? 'combat.log.burnEnemy' : 'combat.log.burnYou', { n });
    case 'regen':
      return t(log.side === 'enemy' ? 'combat.log.regenEnemy' : 'combat.log.regenYou', { n });
    case 'apply_status':
      return t(log.target === 'enemy' ? 'combat.log.statusEnemy' : 'combat.log.statusYou', {
        status: statusLabel(log.status),
      });
    case 'buff':
    case 'phase_buff':
      return t('combat.log.buffEnemy', { status: statusWithValue(log.status, log.value) });
    case 'debuff':
      return t('combat.log.debuffEnemy', { status: statusWithValue(log.status, log.value) });
    case 'evade':
      return t('combat.log.evade');
    case 'evade_ready':
      return t('combat.log.evadeReady', { pct: Math.round((Number(log.chance) || 0) * 100) });
    case 'status_immune':
      return t('combat.log.statusImmune', { status: statusLabel(log.status) });
    case 'counter_ready':
      return t('combat.log.counterReady', { n: log.damage ?? 0 });
    case 'counter':
      return t('combat.log.counter', { n });
    case 'charge':
      return t('combat.log.charge', { n: log.displayDamage ?? log.releaseDamage ?? 0 });
    case 'attack_denied':
      return t('combat.log.attackDenied');
    case 'victory':
      if (isSeat(log.winnerSeat) && !isMine(log.winnerSeat)) return t('combat.log.defeat');
      return t('combat.log.victory');
    case 'defeat':
      return t('combat.log.defeat');
    case 'forfeited':
      return t('combat.log.forfeited');
    case 'forfeit':
      return t(isMine(log.seat) ? 'combat.log.forfeitYou' : 'combat.log.forfeitOpponent');
    case 'intent':
      return t('combat.log.intent');
    case 'discard_for_chakra':
      return t('combat.log.discardChakra');
    case 'discard_chakra':
      return t(isMine(log.seat) ? 'combat.log.discardChakra' : 'combat.log.discardChakraOpponent');
    case 'talent':
      return t('combat.log.talent', { effect: talentLabel(log.effect) });
    case 'summon':
      return isSeat(log.seat)
        ? t('combat.log.pvpSummon', { name: localName(log), n: log.duration ?? 0 })
        : t('combat.log.summon', { name: log.name });
    case 'ally_attack':
      return isSeat(log.seat)
        ? t(isMine(log.seat) ? 'combat.log.pvpAllyAttackYou' : 'combat.log.pvpAllyAttackOpponent', {
            name: localName(log),
            n,
          })
        : t('combat.log.allyAttack', { name: log.name, n });
    case 'ally_damage':
      if (isSeat(log.seat)) {
        return t(
          log.fallen
            ? isMine(log.seat)
              ? 'combat.log.pvpAllyFallenYou'
              : 'combat.log.pvpAllyFallenOpponent'
            : isMine(log.seat)
              ? 'combat.log.pvpAllyDamageYou'
              : 'combat.log.pvpAllyDamageOpponent',
          { n }
        );
      }
      return log.fallen ? t('combat.log.allyFallen') : t('combat.log.allyDamage', { n });
    case 'ally_expired':
      if (isSeat(log.seat))
        return t(
          isMine(log.seat) ? 'combat.log.pvpAllyExpiredYou' : 'combat.log.pvpAllyExpiredOpponent'
        );
      return '';
    case 'enemy_summon':
      return t('combat.log.enemySummon', { name: localName(log.minion) });
    case 'minion_attack':
      return t('combat.log.minionAttack', { name: log.name, n });
    case 'minion_damage':
      return log.fallen ? t('combat.log.minionFallen') : t('combat.log.minionDamage', { n });
    case 'raise_barrier':
      return t('combat.log.raiseBarrier', { n });
    case 'phase_barrier':
      return t('combat.log.raiseBarrier', { n: log.barrier ?? 0 });
    case 'barrier_absorb':
      return t('combat.log.barrierAbsorb', { n });
    case 'shield_break':
      return t('combat.log.shieldBreak');
    case 'shield_break_vulnerable':
      return t('combat.log.shieldBreakVulnerable');
    case 'boss_phase':
      return t('combat.log.bossPhase');
    case 'phase_immunities':
      return t('combat.log.phaseImmunities', {
        list: (log.immunities || []).map(statusLabel).join(', '),
      });
    case 'phase_clear_statuses':
      return t('combat.log.phaseClearStatuses');
    case 'play_card':
      return t(isMine(log.seat) ? 'combat.log.playCardYou' : 'combat.log.playCardOpponent', {
        name: localName(log, t('combat.log.playCardFallback')),
      });
    case 'end_turn':
      return t(isMine(log.seat) ? 'combat.log.endTurnYou' : 'combat.log.endTurnOpponent');
    case 'rewards':
      return t('combat.log.rewards');
    default:
      return humanize(log.type);
  }
}
</script>

<template>
  <aside class="combat-log" data-testid="combat-log">
    <h3 class="combat-log__title">
      <span class="lozenge" aria-hidden="true" />
      {{ t('combat.logTitle') }}
    </h3>
    <ul class="combat-log__list">
      <li v-for="line in lines" :key="line.key">{{ line.text }}</li>
      <li v-if="!lines.length" class="combat-log__empty">{{ t('combat.logEmpty') }}</li>
    </ul>
  </aside>
</template>

<style scoped>
.combat-log {
  max-height: 16rem;
  overflow: auto;
  padding: 0.9rem 1rem 1rem;
  border-radius: var(--radius-md);
  background: var(--color-bg-soft);
}

.combat-log__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-sans);
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.combat-log__title .lozenge {
  color: var(--color-vermilion);
}

.combat-log__list {
  display: flex;
  flex-direction: column;
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.combat-log__list li {
  padding: 0.3rem 0;
  border-top: 1px solid var(--color-line);
}

.combat-log__list li:first-child {
  border-top: 0;
  font-weight: 600;
  color: var(--color-ink);
}

.combat-log__empty {
  color: var(--color-ink-faint);
}

@media (min-width: 1120px) {
  .combat-log {
    max-height: 30rem;
  }
}
</style>

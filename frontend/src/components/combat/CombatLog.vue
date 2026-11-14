<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'CombatLog' })

const props = defineProps({
  logs: { type: Array, default: () => [] },
})

const { t } = useI18n()

const lines = computed(() =>
  (props.logs || []).slice(0, 12).map((log, idx) => ({
    key: `${idx}-${log.type}`,
    text: formatLog(log),
  }))
)

function formatLog(log) {
  switch (log.type) {
    case 'damage':
      return t('combat.log.damage', {
        source: log.source === 'enemy' ? t('combat.log.enemy') : t('combat.log.you'),
        n: log.amount,
      })
    case 'block':
      return t('combat.log.block', { n: log.amount })
    case 'heal':
      return t('combat.log.heal', { n: log.amount })
    case 'draw':
      return t('combat.log.draw', { n: log.count })
    case 'poison':
      return t('combat.log.poison', { n: log.value })
    case 'burn':
      return t('combat.log.burn', { n: log.value })
    case 'victory':
      return t('combat.log.victory')
    case 'defeat':
      return t('combat.log.defeat')
    case 'forfeited':
      return t('combat.log.forfeited')
    case 'intent':
      return t('combat.log.intent')
    case 'discard_for_chakra':
      return t('combat.log.discardChakra')
    case 'talent':
      return t('combat.log.talent', { effect: log.effect })
    case 'summon':
      return t('combat.log.summon', { name: log.name })
    case 'ally_attack':
      return t('combat.log.allyAttack', { name: log.name, n: log.amount })
    case 'rewards':
      return t('combat.log.rewards')
    default:
      return log.type
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

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
    <h3 class="combat-log__title">{{ t('combat.logTitle') }}</h3>
    <ul class="combat-log__list">
      <li v-for="line in lines" :key="line.key">{{ line.text }}</li>
      <li v-if="!lines.length" class="combat-log__empty">{{ t('combat.logEmpty') }}</li>
    </ul>
  </aside>
</template>

<style scoped>
.combat-log {
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  background: color-mix(in srgb, var(--color-bg-soft) 70%, transparent);
  padding: 0.85rem 1rem;
  max-height: 14rem;
  overflow: auto;
}

.combat-log__title {
  font-family: var(--font-display);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.combat-log__list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--color-ink-muted);
  list-style: none;
  padding: 0;
  margin: 0;
}

.combat-log__empty {
  opacity: 0.6;
}
</style>

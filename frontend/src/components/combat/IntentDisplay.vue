<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'IntentDisplay' })

const props = defineProps({
  intent: { type: Object, default: null },
})

const { t } = useI18n()

const kind = computed(() => props.intent?.type || 'unknown')

const text = computed(() => {
  const i = props.intent
  if (!i) return t('combat.intent.unknown')
  if (i.type === 'attack') {
    const dmg = i.displayDamage ?? i.damage ?? '?'
    return t('combat.intent.attack', { n: dmg })
  }
  if (i.type === 'defend') return t('combat.intent.defend', { n: i.block ?? '?' })
  if (i.type === 'buff') return t('combat.intent.buff')
  if (i.type === 'debuff') return t('combat.intent.debuff')
  return t('combat.intent.special')
})

const glyph = computed(() => {
  const map = { attack: '⚔', defend: '🛡', buff: '▲', debuff: '▼', special: '✦' }
  return map[kind.value] || '?'
})
</script>

<template>
  <div class="intent" :class="`intent--${kind}`" data-testid="enemy-intent">
    <span class="intent__glyph" aria-hidden="true">{{ glyph }}</span>
    <span class="intent__text">{{ text }}</span>
  </div>
</template>

<style scoped>
.intent {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--color-bg-card) 90%, transparent),
    color-mix(in srgb, var(--color-bg) 95%, transparent)
  );
  font-size: 0.8rem;
  color: var(--color-ink);
  animation: intent-pulse 2.4s ease-in-out infinite;
}

.intent--attack {
  border-color: color-mix(in srgb, var(--color-fire) 45%, transparent);
  color: var(--color-fire);
}

.intent--defend {
  border-color: color-mix(in srgb, var(--color-water) 45%, transparent);
  color: var(--color-water);
}

.intent__glyph {
  font-size: 0.95rem;
}

@keyframes intent-pulse {
  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateY(-2px);
    opacity: 0.92;
  }
}
</style>

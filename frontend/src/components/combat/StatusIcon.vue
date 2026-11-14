<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'StatusIcon' })

const props = defineProps({
  status: { type: Object, required: true },
})

const { t } = useI18n()

const label = computed(() =>
  t(`combat.statuses.${props.status.key}`, props.status.key)
)

const icon = computed(() => {
  const map = {
    force: '⚔',
    dexterity: '◈',
    regen: '+',
    poison: '☠',
    burn: '炎',
    weak: '▾',
    vulnerable: '◇',
    intangible: '◌',
    evade: '⇢',
    counter: '↩',
  }
  return map[props.status.key] || '•'
})
</script>

<template>
  <span
    class="status-icon"
    :class="`status-icon--${status.key}`"
    :title="`${label} ${status.value}${status.duration != null ? ` (${status.duration})` : ''}`"
  >
    <span class="status-icon__glyph" aria-hidden="true">{{ icon }}</span>
    <span class="status-icon__value">{{ status.value }}</span>
    <span v-if="status.duration != null" class="status-icon__dur">{{ status.duration }}</span>
  </span>
</template>

<style scoped>
.status-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  background: color-mix(in srgb, var(--color-bg-soft) 80%, transparent);
  color: var(--color-ink-muted);
  animation: status-in 0.35s ease-out;
}

.status-icon--poison,
.status-icon--burn,
.status-icon--weak,
.status-icon--vulnerable {
  color: var(--color-fire);
  border-color: color-mix(in srgb, var(--color-fire) 35%, transparent);
}

.status-icon--force,
.status-icon--dexterity,
.status-icon--regen {
  color: var(--color-win);
  border-color: color-mix(in srgb, var(--color-win) 35%, transparent);
}

.status-icon__glyph {
  font-size: 0.65rem;
  opacity: 0.85;
}

.status-icon__dur {
  opacity: 0.55;
}

@keyframes status-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>

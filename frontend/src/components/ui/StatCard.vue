<script setup>
defineOptions({ name: 'StatCard' })

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'ink' },
})
</script>

<template>
  <div class="stat-card" :data-tone="tone">
    <dt class="stat-card__label">{{ label }}</dt>
    <dd class="stat-card__value figure">{{ value }}</dd>
    <p v-if="hint" class="stat-card__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.stat-card {
  min-width: 0;
  padding-top: 0.75rem;
  border-top: 3px solid var(--tone-fill);
}

.stat-card__label {
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.stat-card__value {
  margin-top: 0.5rem;
  overflow: hidden;
  font-size: clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card__hint {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  color: var(--color-ink-muted);
}
</style>

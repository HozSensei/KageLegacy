<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../ui/AppIcon.vue'

defineOptions({ name: 'StatusIcon' })

const props = defineProps({
  status: { type: Object, required: true },
})

const { t } = useI18n()

const label = computed(() =>
  t(`combat.statuses.${props.status.key}`, props.status.key)
)

const KNOWN = ['force', 'dexterity', 'regen', 'poison', 'burn', 'weak', 'vulnerable', 'intangible', 'evade', 'counter']
const HARMFUL = ['poison', 'burn', 'weak', 'vulnerable']
const HELPFUL = ['force', 'dexterity', 'regen']

const icon = computed(() => (KNOWN.includes(props.status.key) ? props.status.key : 'unknown'))

const tone = computed(() => {
  if (HARMFUL.includes(props.status.key)) return 'vermilion'
  if (HELPFUL.includes(props.status.key)) return 'leaf'
  return 'ink'
})
</script>

<template>
  <span
    class="status-icon"
    :class="`status-icon--${status.key}`"
    :data-tone="tone"
    :title="`${label} ${status.value}${status.duration != null ? ` (${status.duration})` : ''}`"
  >
    <AppIcon :name="icon" size="0.9rem" :stroke-width="2" class="status-icon__glyph" />
    <span class="status-icon__label">{{ label }}</span>
    <span class="status-icon__value">{{ status.value }}</span>
    <span v-if="status.duration != null" class="status-icon__dur">{{ status.duration }}</span>
  </span>
</template>

<style scoped>
.status-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 1.6rem;
  padding: 0 0.45rem;
  background: var(--color-bg-card);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--tone);
  animation: pop-in 320ms var(--ease-out-quint) both;
}

.status-icon__label {
  letter-spacing: 0.04em;
}

.status-icon__value {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
}

.status-icon__dur {
  display: inline-grid;
  place-items: center;
  min-width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--tone-fill);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--tone-on);
}
</style>

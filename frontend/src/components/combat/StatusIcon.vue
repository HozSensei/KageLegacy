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

const PCT_KEYS = new Set([
  'damage_pct',
  'block_pct',
  'heal_pct',
  'taijutsu_pct',
  'ninjutsu_pct',
  'genjutsu_pct',
])
const ICON_MAP = {
  force: 'force',
  damage_pct: 'force',
  taijutsu_pct: 'force',
  ninjutsu_pct: 'force',
  genjutsu_pct: 'force',
  dexterity: 'dexterity',
  block_pct: 'dexterity',
  heal_pct: 'regen',
  regen: 'regen',
  poison: 'poison',
  burn: 'burn',
  bleed: 'bleed',
  madness: 'madness',
  weak: 'weak',
  vulnerable: 'vulnerable',
  intangible: 'intangible',
  evade: 'evade',
  counter: 'counter',
}
const HARMFUL = ['poison', 'burn', 'bleed', 'madness', 'weak', 'vulnerable']
const HELPFUL = [
  'force',
  'dexterity',
  'regen',
  'damage_pct',
  'block_pct',
  'heal_pct',
  'taijutsu_pct',
  'ninjutsu_pct',
  'genjutsu_pct',
]

const icon = computed(() => ICON_MAP[props.status.key] || 'unknown')
const isPct = computed(() => PCT_KEYS.has(props.status.key))
const isDot = computed(() =>
  ['poison', 'burn', 'bleed', 'madness'].includes(props.status.key)
)
const displayValue = computed(() => {
  if (isPct.value) return `+${props.status.value}%`
  if (isDot.value) return `${props.status.value}/t`
  return props.status.value
})

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
    :title="
      isDot
        ? `${label} ${status.value} PV/tour${status.duration != null ? ` · ${status.duration} t` : ''}`
        : `${label} ${displayValue}${status.duration != null ? ` (${status.duration})` : ''}`
    "
  >
    <AppIcon :name="icon" size="0.9rem" :stroke-width="2" class="status-icon__glyph" />
    <span class="status-icon__label">{{ label }}</span>
    <span class="status-icon__value">{{ displayValue }}</span>
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

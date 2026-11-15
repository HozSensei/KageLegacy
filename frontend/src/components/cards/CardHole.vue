<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'CardHole' })

const props = defineProps({
  /** Numéro catalogue 1-based (#1…), ordre grille complète. */
  catalogueNumber: { type: Number, required: true },
  selected: { type: Boolean, default: false },
})

defineEmits(['select'])

const { t } = useI18n()

const numberLabel = computed(() => `#${props.catalogueNumber}`)
</script>

<template>
  <button
    type="button"
    class="card-hole"
    :class="{ 'card-hole--selected': selected }"
    :aria-pressed="selected"
    :aria-label="t('cards.missingCardAria', { n: catalogueNumber })"
    data-testid="card-hole"
    @click="$emit('select')"
  >
    <span class="card-hole__number" aria-hidden="true">{{ numberLabel }}</span>
  </button>
</template>

<style scoped>
.card-hole {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2.5 / 3.5;
  padding: 0;
  border: 2.5px dashed color-mix(in srgb, var(--color-line-strong) 78%, transparent);
  border-radius: 0.7rem;
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--color-ink) 6%, var(--color-bg-soft)) 0%,
      color-mix(in srgb, var(--color-ink) 14%, var(--color-bg)) 100%
    );
  color: var(--color-ink-faint);
  opacity: 0.92;
  overflow: hidden;
  outline: 0 solid var(--color-ink);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-ink) 4%, transparent);
  transition:
    opacity var(--dur-fast) ease,
    outline-width var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint),
    border-color var(--dur-fast) ease;
}

.card-hole:hover {
  opacity: 1;
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-line-strong) 95%, transparent);
}

.card-hole--selected,
.card-hole--selected:hover {
  opacity: 1;
  outline-width: 3px;
  transform: translateY(-2px);
}

.card-hole:focus-visible {
  outline: 3px solid var(--color-indigo);
  outline-offset: 3px;
}

.card-hole__number {
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 0.9rem + 1.6vw, 1.85rem);
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
  color: color-mix(in srgb, var(--color-ink) 42%, transparent);
  user-select: none;
}
</style>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardTypeVisual, rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'CardHole' })

const props = defineProps({
  card: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

defineEmits(['select'])

const { t, te, locale } = useI18n()

const name = computed(() =>
  locale.value === 'en' ? props.card.nameEn : props.card.nameFr
)
const typeLabel = computed(() => t(`cards.types.${props.card.type}`, props.card.type))
const typeVisual = computed(() => cardTypeVisual(props.card.type))
const rarity = computed(() => rarityVisual(props.card.rarity))
const rarityLabel = computed(() => {
  const key = `cards.rarities.${props.card.rarity || 'common'}`
  return te(key) ? t(key) : props.card.rarity
})
</script>

<template>
  <button
    type="button"
    class="card-hole"
    :class="{ 'card-hole--selected': selected }"
    :data-tone="typeVisual.tone"
    :aria-pressed="selected"
    :aria-label="t('cards.missingCardAria', { name })"
    data-testid="card-hole"
    @click="$emit('select', card)"
  >
    <header class="card-hole__header">
      <span class="card-hole__cost" aria-hidden="true">?</span>
      <span class="card-hole__type">
        <span class="shape" :class="`shape--${typeVisual.shape}`" aria-hidden="true" />
        {{ typeLabel }}
      </span>
      <span class="card-hole__lock" aria-hidden="true">{{ t('cards.missingBadge') }}</span>
    </header>

    <div class="card-hole__body">
      <p class="card-hole__name">{{ name }}</p>
      <p class="card-hole__meta">
        <span class="card-hole__rarity" :data-tone="rarity.tone">
          <span class="card-hole__pips" aria-hidden="true">
            <span v-for="n in rarity.pips" :key="n" class="lozenge lozenge--hollow" />
          </span>
          {{ rarityLabel }}
        </span>
      </p>
      <p class="card-hole__hint">{{ t('cards.missingHint') }}</p>
    </div>
  </button>
</template>

<style scoped>
.card-hole {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 14.5rem;
  overflow: hidden;
  border: 2px dashed var(--color-line-strong, var(--color-line));
  border-radius: var(--radius-md);
  background:
    repeating-linear-gradient(
      -18deg,
      transparent,
      transparent 7px,
      color-mix(in srgb, var(--color-ink) 4%, transparent) 7px,
      color-mix(in srgb, var(--color-ink) 4%, transparent) 8px
    ),
    var(--color-bg-soft);
  color: var(--color-ink-muted);
  text-align: left;
  opacity: 0.78;
  outline: 0 solid var(--color-ink);
  transition:
    opacity var(--dur-fast) ease,
    outline-width var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.card-hole:hover {
  opacity: 0.95;
  transform: translateY(-2px);
}

.card-hole--selected,
.card-hole--selected:hover {
  opacity: 1;
  outline-width: 3px;
  transform: translateY(-2px);
}

.card-hole:focus-visible {
  outline: 3px solid var(--color-indigo);
  outline-offset: 2px;
}

.card-hole__header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.5rem;
  padding: 0 0.75rem 0 0;
  background: color-mix(in srgb, var(--tone-fill) 28%, var(--color-bg-soft));
  color: var(--color-ink-muted);
}

.card-hole__cost {
  display: grid;
  place-items: center;
  align-self: stretch;
  min-width: 2.5rem;
  background: color-mix(in srgb, var(--color-bg-card) 70%, transparent);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
}

.card-hole__type {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.card-hole__lock {
  margin-left: auto;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.card-hole__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.85rem 0.9rem 1rem;
}

.card-hole__name {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--color-ink-muted);
  overflow-wrap: anywhere;
}

.card-hole__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.card-hole__rarity {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.card-hole__pips {
  display: inline-flex;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: var(--tone-fill);
  opacity: 0.55;
}

.card-hole__hint {
  margin-top: auto;
  padding-top: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-ink-faint);
}
</style>

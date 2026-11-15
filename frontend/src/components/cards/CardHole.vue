<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveCardArt } from '../../utils/cardArt'
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
const artUrl = computed(() => resolveCardArt(props.card))
const cost = computed(() => props.card.cost ?? props.card.baseCost ?? 0)
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
    <span class="card-hole__frame" aria-hidden="true" />

    <div class="card-hole__art-wrap">
      <div class="card-hole__art" aria-hidden="true">
        <img
          v-if="artUrl"
          class="card-hole__art-img"
          :src="artUrl"
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <span v-else class="card-hole__art-fallback">
          <span class="shape" :class="`shape--${typeVisual.shape}`" />
        </span>
        <span class="card-hole__veil" />
      </div>
      <span class="card-hole__cost">?</span>
      <span class="card-hole__lock">{{ t('cards.missingBadge') }}</span>
    </div>

    <div class="card-hole__nameplate">
      <span class="card-hole__type-icon" aria-hidden="true">
        <span class="shape" :class="`shape--${typeVisual.shape}`" />
      </span>
      <p class="card-hole__name">{{ name }}</p>
      <p class="card-hole__type">{{ typeLabel }}</p>
    </div>

    <div class="card-hole__rules">
      <p class="card-hole__hint">{{ t('cards.missingHint') }}</p>
      <p class="card-hole__cost-hint" aria-hidden="true">{{ cost }}</p>
    </div>

    <footer class="card-hole__footer" :data-tone="rarity.tone">
      <span class="card-hole__gem" aria-hidden="true">
        <span v-for="n in rarity.pips" :key="n" class="lozenge lozenge--hollow" />
      </span>
      <span class="card-hole__rarity">{{ rarityLabel }}</span>
    </footer>
  </button>
</template>

<style scoped>
.card-hole {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2.5 / 3.5;
  overflow: hidden;
  padding: 0.42rem 0.42rem 0.5rem;
  border: 0;
  border-radius: 0.85rem;
  background:
    repeating-linear-gradient(
      -18deg,
      transparent,
      transparent 6px,
      color-mix(in srgb, var(--color-ink) 5%, transparent) 6px,
      color-mix(in srgb, var(--color-ink) 5%, transparent) 7px
    ),
    color-mix(in srgb, var(--color-ink) 72%, var(--color-bg));
  color: var(--color-ink-muted);
  text-align: left;
  opacity: 0.82;
  outline: 0 solid var(--color-ink);
  box-shadow:
    0 0 0 2px dashed color-mix(in srgb, var(--color-line-strong) 80%, transparent),
    0 8px 18px color-mix(in srgb, var(--color-ink) 14%, transparent);
  transition:
    opacity var(--dur-fast) ease,
    outline-width var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.card-hole__frame {
  position: absolute;
  inset: 0.28rem;
  z-index: 0;
  border-radius: 0.62rem;
  background: color-mix(in srgb, var(--color-bg-soft) 55%, transparent);
  border: 1px dashed color-mix(in srgb, var(--color-line-strong) 70%, transparent);
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
  outline-offset: 3px;
}

.card-hole__art-wrap,
.card-hole__nameplate,
.card-hole__rules,
.card-hole__footer {
  position: relative;
  z-index: 1;
}

.card-hole__art-wrap {
  position: relative;
  margin: 0.12rem 0.12rem 0;
}

.card-hole__art {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 0.92;
  border: 2px solid color-mix(in srgb, var(--color-line-strong) 70%, transparent);
  border-radius: 0.35rem 0.35rem 0.15rem 0.15rem;
  background: color-mix(in srgb, var(--tone-fill) 18%, var(--color-bg-soft));
}

.card-hole__art-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  filter: grayscale(1) brightness(0.55) contrast(0.9);
  user-select: none;
}

.card-hole__art-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 6rem;
  font-size: 2.25rem;
  color: var(--tone-fill);
  opacity: 0.35;
}

.card-hole__veil {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 8px,
      color-mix(in srgb, var(--color-ink) 18%, transparent) 8px,
      color-mix(in srgb, var(--color-ink) 18%, transparent) 9px
    );
}

.card-hole__cost {
  position: absolute;
  top: -0.3rem;
  left: -0.3rem;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-bg-card) 55%, transparent);
  border: 2px dashed var(--color-line-strong);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-ink-faint);
}

.card-hole__lock {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  z-index: 2;
  padding: 0.15rem 0.4rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-ink) 72%, transparent);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-on-ink);
}

.card-hole__nameplate {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 0.05rem 0.4rem;
  align-items: center;
  margin: 0.35rem 0.12rem 0;
  padding: 0.3rem 0.4rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--tone-fill) 28%, var(--color-bg-soft));
  color: var(--color-ink-muted);
}

.card-hole__type-icon {
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-ink) 12%, transparent);
  font-size: 0.75rem;
  opacity: 0.7;
}

.card-hole__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.88rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.card-hole__type {
  margin: 0;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.card-hole__rules {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  margin: 0.3rem 0.12rem 0;
  padding: 0.4rem 0.45rem;
  border-radius: 0.2rem;
  border: 1px dashed color-mix(in srgb, var(--color-line-strong) 65%, transparent);
  background: color-mix(in srgb, var(--color-bg-soft) 40%, transparent);
}

.card-hole__hint {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--color-ink-faint);
}

.card-hole__cost-hint {
  margin: 0.4rem 0 0;
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink-faint) 70%, transparent);
}

.card-hole__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.25rem;
  padding: 0.1rem;
}

.card-hole__gem {
  display: inline-flex;
  gap: 0.12rem;
  font-size: 0.5rem;
  opacity: 0.55;
  color: var(--tone-fill);
}

.card-hole__rarity {
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tone);
  opacity: 0.75;
}
</style>

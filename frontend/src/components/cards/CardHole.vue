<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveCardArt } from '../../utils/cardArt'
import { CARD_FOOTER_STATS } from '../../utils/cardFooterStats'
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
const footerCells = CARD_FOOTER_STATS
</script>

<template>
  <button
    type="button"
    class="card-hole"
    :class="{ 'card-hole--selected': selected }"
    :data-tone="typeVisual.tone"
    :data-rarity="card.rarity || 'common'"
    :aria-pressed="selected"
    :aria-label="t('cards.missingCardAria', { name })"
    data-testid="card-hole"
    @click="$emit('select', card)"
  >
    <div class="card-hole__shell">
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

      <div class="card-hole__body">
        <p class="card-hole__name">{{ name }}</p>
        <p class="card-hole__type">{{ typeLabel }}</p>
        <p class="card-hole__hint">{{ t('cards.missingHint') }}</p>
      </div>

      <footer class="card-hole__footer" aria-hidden="true">
        <span
          v-for="cell in footerCells"
          :key="cell.key"
          class="card-hole__stat"
          :data-tone="cell.tone"
        />
      </footer>
    </div>

    <span class="card-hole__cost" aria-hidden="true"><span>?</span></span>
    <span class="card-hole__lock">{{ t('cards.missingBadge') }}</span>
    <span class="card-hole__rarity" :data-tone="rarity.tone">{{ rarityLabel }}</span>
    <span class="sr-only">{{ t('cards.costLabel') }} {{ cost }}</span>
  </button>
</template>

<style scoped>
.card-hole {
  --card-body-bg: color-mix(in srgb, var(--color-ink) 88%, var(--color-bg));
  --card-body-fg: color-mix(in srgb, var(--color-on-ink) 72%, transparent);

  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2.5 / 3.5;
  padding: 0;
  border: 2.5px dashed color-mix(in srgb, var(--color-line-strong) 85%, transparent);
  border-radius: 0.7rem;
  background: var(--card-body-bg);
  color: var(--card-body-fg);
  text-align: left;
  opacity: 0.88;
  overflow: visible;
  outline: 0 solid var(--color-ink);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--color-ink) 12%, transparent);
  transition:
    opacity var(--dur-fast) ease,
    outline-width var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.card-hole__shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(0.7rem - 2.5px);
}

.card-hole:hover {
  opacity: 0.96;
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

.card-hole__art {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--tone-fill) 18%, var(--card-body-bg));
}

.card-hole__art-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  filter: grayscale(1) brightness(0.5) contrast(0.9);
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
  opacity: 0.3;
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

.card-hole__body {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
  height: 5.6rem;
  padding: 0.5rem 0.65rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-ink) 10%, transparent);
}

.card-hole__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.88rem;
  font-weight: 700;
  font-stretch: 92%;
  line-height: 1.1;
  overflow-wrap: anywhere;
  color: var(--card-body-fg);
}

.card-hole__type {
  margin: 0;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-on-ink) 45%, transparent);
}

.card-hole__hint {
  margin: 0.15rem 0 0;
  padding-top: 0.3rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-ink) 10%, transparent);
  font-size: 0.62rem;
  line-height: 1.3;
  color: color-mix(in srgb, var(--color-on-ink) 42%, transparent);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-hole__footer {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  height: 1.65rem;
  margin: 0;
  padding: 0;
}

.card-hole__stat {
  background: color-mix(in srgb, var(--tone-fill) 55%, var(--card-body-bg));
  opacity: 0.55;
}

.card-hole__cost {
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  transform: rotate(45deg);
  border-radius: 0.2rem;
  border: 2px dashed var(--color-line-strong);
  background: color-mix(in srgb, var(--color-bg-card) 55%, transparent);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-ink-faint);
}

.card-hole__cost > span {
  transform: rotate(-45deg);
}

.card-hole__lock {
  position: absolute;
  top: 0.35rem;
  left: 0.35rem;
  z-index: 3;
  padding: 0.15rem 0.4rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-ink) 72%, transparent);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-on-ink);
}

.card-hole__rarity {
  position: absolute;
  bottom: 1.85rem;
  right: 0.5rem;
  z-index: 3;
  font-size: 0.45rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tone);
  opacity: 0.7;
}
</style>

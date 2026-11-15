<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ShopBalances from './ShopBalances.vue'
import { elementTone, rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'BoosterSelection' })

const props = defineProps({
  boosters: { type: Array, default: () => [] },
  balances: { type: Object, default: () => ({}) },
  elements: { type: Array, default: () => [] },
  selectedElement: { type: String, default: null },
  opening: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'select-element'])

const { t, locale } = useI18n()

function nameOf(booster) {
  return locale.value === 'en' ? booster.nameEn : booster.nameFr
}

function descOf(booster) {
  return locale.value === 'en' ? booster.descriptionEn : booster.descriptionFr
}

function costLabel(booster) {
  const parts = []
  if (booster.cost?.ryos) parts.push(t('shop.costRyos', { n: booster.cost.ryos }))
  if (booster.cost?.kageCoins) parts.push(t('shop.costCoins', { n: booster.cost.kageCoins }))
  return parts.join(' · ') || t('shop.costFree')
}

function canAfford(booster) {
  const ryos = props.balances.ryos || 0
  const coins = props.balances.kageCoins || 0
  return ryos >= (booster.cost?.ryos || 0) && coins >= (booster.cost?.kageCoins || 0)
}

function pct(prob) {
  return `${Math.round((prob || 0) * 1000) / 10}%`
}

const rarityOrder = ['common', 'rare', 'legendary', 'mythic']

const BOOSTER_VISUALS = {
  standard: { tone: 'indigo', shape: 'square' },
  elemental: { tone: 'sky', shape: 'circle' },
  premium: { tone: 'gold', shape: 'lozenge' },
}

function boosterVisual(booster) {
  const visual = BOOSTER_VISUALS[booster.type] || BOOSTER_VISUALS.standard
  if (booster.elementalOnly && props.selectedElement) {
    return { ...visual, tone: elementTone(props.selectedElement) }
  }
  return visual
}

const elementalBooster = computed(() => props.boosters.find((b) => b.elementalOnly))
</script>

<template>
  <div class="booster-selection" data-testid="booster-selection">
    <ShopBalances :balances="balances" />

    <div v-if="elementalBooster" class="booster-selection__elements">
      <p class="t-kicker">{{ t('shop.elementFilter') }}</p>
      <div class="chip-row">
        <button
          type="button"
          class="chip"
          :aria-pressed="!selectedElement"
          @click="emit('select-element', null)"
        >
          {{ t('shop.elementAny') }}
        </button>
        <button
          v-for="el in elements"
          :key="el"
          type="button"
          class="chip"
          :aria-pressed="selectedElement === el"
          :data-tone="elementTone(el)"
          @click="emit('select-element', el)"
        >
          <span class="dot chip__mark" aria-hidden="true" />
          {{ t(`shop.elements.${el}`, el) }}
        </button>
      </div>
    </div>

    <ul class="shop-grid stagger">
      <li
        v-for="booster in boosters"
        :key="booster.type"
        class="shop-tile booster-card"
        :class="`booster-card--${booster.type}`"
        :data-tone="boosterVisual(booster).tone"
        :data-testid="`booster-${booster.type}`"
      >
        <span
          class="shop-tile__shape"
          :class="`shop-tile__shape--${boosterVisual(booster).shape}`"
          aria-hidden="true"
        />
        <p class="shop-tile__kicker">{{ t(`shop.types.${booster.type}`, booster.type) }}</p>
        <h3 class="shop-tile__name">{{ nameOf(booster) }}</h3>
        <p class="shop-tile__desc">{{ descOf(booster) }}</p>
        <p class="shop-tile__meta">
          {{ t('shop.cardCount', { n: booster.cardCount }) }}
          <template v-if="booster.guaranteedMinRarity">
            · {{ t('shop.guaranteed', { rarity: t(`cards.rarities.${booster.guaranteedMinRarity}`) }) }}
          </template>
        </p>

        <div class="booster-card__odds">
          <p class="t-kicker">{{ t('shop.oddsTitle') }}</p>
          <ul>
            <li v-for="rarity in rarityOrder" :key="rarity" :data-tone="rarityVisual(rarity).tone">
              <span class="booster-card__odds-label">{{ t(`cards.rarities.${rarity}`) }}</span>
              <span class="booster-card__odds-bar" aria-hidden="true">
                <span :style="{ width: pct(booster.probabilities?.[rarity]) }" />
              </span>
              <span class="booster-card__odds-value">{{ pct(booster.probabilities?.[rarity]) }}</span>
            </li>
          </ul>
        </div>

        <p class="shop-tile__cost">{{ costLabel(booster) }}</p>

        <button
          type="button"
          class="btn-primary btn-block"
          :disabled="disabled || opening || !canAfford(booster)"
          data-testid="booster-open-btn"
          @click="emit('open', booster.type)"
        >
          {{
            opening
              ? t('shop.opening')
              : canAfford(booster)
                ? t('shop.open')
                : t('shop.insufficientFunds')
          }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.booster-selection__elements {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-bottom: 1.5rem;
}

.booster-card__odds {
  padding: 0.75rem 0 0.25rem;
  border-top: 1px solid var(--color-line);
}

.booster-card__odds ul {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.booster-card__odds li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 3.25rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8125rem;
}

.booster-card__odds-label {
  font-weight: 500;
  color: var(--color-ink-muted);
}

.booster-card__odds-bar {
  display: block;
  height: 0.375rem;
  background: var(--color-bg-soft);
}

.booster-card__odds-bar > span {
  display: block;
  min-width: 2px;
  height: 100%;
  background: var(--tone-fill);
  transform-origin: left;
  animation: bar-grow 600ms var(--ease-out-quint) 200ms backwards;
}

.booster-card__odds li[data-tone='neutral'] .booster-card__odds-bar > span {
  background: var(--color-ink-faint);
}

.booster-card__odds-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--color-ink);
}
</style>

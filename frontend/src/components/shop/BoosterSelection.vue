<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ShopBalances from './ShopBalances.vue';
import BoosterPackVisual from './BoosterPackVisual.vue';
import { elementTone, rarityVisual } from '../../utils/cardVisuals';

defineOptions({ name: 'BoosterSelection' });

const props = defineProps({
  boosters: { type: Array, default: () => [] },
  balances: { type: Object, default: () => ({}) },
  elements: { type: Array, default: () => [] },
  selectedElement: { type: String, default: null },
  opening: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['open', 'select-element']);

const { t, locale } = useI18n();

function nameOf(booster) {
  return locale.value === 'en' ? booster.nameEn : booster.nameFr;
}

function descOf(booster) {
  return locale.value === 'en' ? booster.descriptionEn : booster.descriptionFr;
}

function costLabel(booster) {
  const parts = [];
  if (booster.cost?.ryos) parts.push(t('shop.costRyos', { n: booster.cost.ryos }));
  if (booster.cost?.kageCoins) parts.push(t('shop.costCoins', { n: booster.cost.kageCoins }));
  return parts.join(' · ') || t('shop.costFree');
}

function canAfford(booster) {
  const ryos = props.balances.ryos || 0;
  const coins = props.balances.kageCoins || 0;
  return ryos >= (booster.cost?.ryos || 0) && coins >= (booster.cost?.kageCoins || 0);
}

function pct(prob) {
  return `${Math.round((prob || 0) * 1000) / 10}%`;
}

const rarityOrder = ['common', 'rare', 'legendary', 'mythic'];

const elementalBooster = computed(() => props.boosters.find(b => b.elementalOnly));

/** Étalage stable : standard → voies → élémentaire → premium. */
const orderedBoosters = computed(() => {
  const rank = {
    standard: 0,
    'path-taijutsu': 1,
    'path-ninjutsu': 2,
    'path-genjutsu': 3,
    'path-medicine': 4,
    elemental: 5,
    premium: 6,
  };
  return [...props.boosters].sort((a, b) => (rank[a.type] ?? 99) - (rank[b.type] ?? 99));
});
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

    <ul class="booster-offer-grid stagger">
      <li
        v-for="booster in orderedBoosters"
        :key="booster.type"
        class="booster-offer"
        :data-testid="`booster-${booster.type}`"
      >
        <BoosterPackVisual
          :type="booster.type"
          :element="booster.elementalOnly ? selectedElement : null"
          :name="nameOf(booster)"
          :card-count="booster.cardCount"
          mode="preview"
        />

        <div class="booster-offer__meta">
          <p class="booster-offer__desc">{{ descOf(booster) }}</p>
          <p v-if="booster.guaranteedMinRarity" class="booster-offer__guarantee">
            {{
              t('shop.guaranteed', {
                rarity: t(`cards.rarities.${booster.guaranteedMinRarity}`),
              })
            }}
          </p>
          <p v-else class="booster-offer__guarantee">-</p>

          <div class="booster-offer__odds">
            <p class="t-kicker">{{ t('shop.oddsTitle') }}</p>
            <ul>
              <li
                v-for="rarity in rarityOrder"
                :key="rarity"
                :data-tone="rarityVisual(rarity).tone"
              >
                <span class="booster-offer__odds-label">{{ t(`cards.rarities.${rarity}`) }}</span>
                <span class="booster-offer__odds-bar" aria-hidden="true">
                  <span :style="{ width: pct(booster.probabilities?.[rarity]) }" />
                </span>
                <span class="booster-offer__odds-value">{{
                  pct(booster.probabilities?.[rarity])
                }}</span>
              </li>
            </ul>
          </div>

          <p class="booster-offer__cost">{{ costLabel(booster) }}</p>

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
        </div>
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

.booster-offer-grid {
  display: grid;
  gap: 2rem 1.75rem;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 720px) {
  .booster-offer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .booster-offer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1400px) {
  .booster-offer-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.booster-offer {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  align-items: stretch;
}

.booster-offer__meta {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.booster-offer__desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
  text-wrap: pretty;
}

.booster-offer__guarantee {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-gold);
}

.booster-offer__odds {
  padding: 0.75rem 0 0.15rem;
  border-top: 1px solid var(--color-line);
}

.booster-offer__odds ul {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.booster-offer__odds li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 3.25rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8125rem;
}

.booster-offer__odds-label {
  font-weight: 500;
  color: var(--color-ink-muted);
}

.booster-offer__odds-bar {
  display: block;
  height: 0.375rem;
  background: var(--color-bg-soft);
}

.booster-offer__odds-bar > span {
  display: block;
  min-width: 2px;
  height: 100%;
  background: var(--tone-fill);
  transform-origin: left;
  animation: bar-grow 600ms var(--ease-out-quint) 200ms backwards;
}

.booster-offer__odds li[data-tone='neutral'] .booster-offer__odds-bar > span {
  background: var(--color-ink-faint);
}

.booster-offer__odds-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--color-ink);
}

.booster-offer__cost {
  margin: 0.15rem 0 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-ink);
}
</style>

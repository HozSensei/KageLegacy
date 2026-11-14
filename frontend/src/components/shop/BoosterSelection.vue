<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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

const elementalBooster = computed(() => props.boosters.find((b) => b.elementalOnly))
</script>

<template>
  <div class="booster-selection" data-testid="booster-selection">
    <div class="booster-selection__balances">
      <span>{{ t('shop.balanceRyos', { n: (balances.ryos || 0).toLocaleString() }) }}</span>
      <span>{{ t('shop.balanceCoins', { n: (balances.kageCoins || 0).toLocaleString() }) }}</span>
    </div>

    <div v-if="elementalBooster" class="booster-selection__elements">
      <p class="booster-selection__elements-label">{{ t('shop.elementFilter') }}</p>
      <div class="booster-selection__element-row">
        <button
          type="button"
          class="btn-ghost text-[10px]"
          :class="{ 'ring-1 ring-accent/60': !selectedElement }"
          @click="emit('select-element', null)"
        >
          {{ t('shop.elementAny') }}
        </button>
        <button
          v-for="el in elements"
          :key="el"
          type="button"
          class="btn-ghost text-[10px]"
          :class="{ 'ring-1 ring-accent/60': selectedElement === el }"
          @click="emit('select-element', el)"
        >
          {{ t(`shop.elements.${el}`, el) }}
        </button>
      </div>
    </div>

    <ul class="booster-selection__grid">
      <li
        v-for="booster in boosters"
        :key="booster.type"
        class="booster-card"
        :class="`booster-card--${booster.type}`"
        :data-testid="`booster-${booster.type}`"
      >
        <p class="booster-card__kicker">{{ t(`shop.types.${booster.type}`, booster.type) }}</p>
        <h3 class="booster-card__name">{{ nameOf(booster) }}</h3>
        <p class="booster-card__desc">{{ descOf(booster) }}</p>
        <p class="booster-card__meta">
          {{ t('shop.cardCount', { n: booster.cardCount }) }}
          <template v-if="booster.guaranteedMinRarity">
            · {{ t('shop.guaranteed', { rarity: t(`cards.rarities.${booster.guaranteedMinRarity}`) }) }}
          </template>
        </p>

        <ul class="booster-card__odds">
          <li v-for="rarity in rarityOrder" :key="rarity">
            <span>{{ t(`cards.rarities.${rarity}`) }}</span>
            <span>{{ pct(booster.probabilities?.[rarity]) }}</span>
          </li>
        </ul>

        <p class="booster-card__cost">{{ costLabel(booster) }}</p>

        <button
          type="button"
          class="btn-primary text-xs w-full"
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
.booster-selection__balances {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.booster-selection__balances span {
  letter-spacing: 0.04em;
}

.booster-selection__elements {
  margin-bottom: 1.5rem;
}

.booster-selection__elements-label {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.booster-selection__element-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.booster-selection__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .booster-selection__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.booster-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.25rem 1.15rem;
  border: 1px solid color-mix(in srgb, var(--kl-line-mix) 22%, transparent);
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--kl-bg-card) 88%, transparent), var(--kl-bg-soft)),
    radial-gradient(ellipse at top right, color-mix(in srgb, var(--kl-accent) 12%, transparent), transparent 55%);
  animation: booster-in 0.45s ease both;
}

.booster-card--standard {
  animation-delay: 0.05s;
}
.booster-card--elemental {
  animation-delay: 0.12s;
  border-color: color-mix(in srgb, var(--kl-water) 35%, transparent);
}
.booster-card--premium {
  animation-delay: 0.2s;
  border-color: color-mix(in srgb, var(--kl-accent) 45%, transparent);
}

.booster-card__kicker {
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.booster-card__name {
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.15;
  color: var(--color-ink);
}

.booster-card__desc {
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
  flex: 1;
}

.booster-card__meta {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
}

.booster-card__odds {
  list-style: none;
  margin: 0;
  padding: 0.55rem 0;
  border-top: 1px solid color-mix(in srgb, var(--kl-accent) 22%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--kl-accent) 22%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

.booster-card__odds li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.booster-card__cost {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--color-accent);
}

@keyframes booster-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

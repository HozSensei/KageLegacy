<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'BoosterResults' })

const props = defineProps({
  result: { type: Object, required: true },
})

defineEmits(['again', 'close'])

const { t } = useI18n()

const newCount = computed(() => (props.result.cards || []).filter((c) => c.isNew).length)
const dupCount = computed(() => (props.result.cards || []).length - newCount.value)

const rarityLines = computed(() => {
  const summary = props.result.raritySummary || {}
  return Object.entries(summary)
    .filter(([, n]) => n > 0)
    .map(([rarity, n]) => ({ rarity, n }))
})
</script>

<template>
  <div class="booster-results" data-testid="booster-results">
    <h2 class="t-heading">{{ t('shop.resultsTitle') }}</h2>
    <p class="mt-2 text-ink-muted">
      {{ t('shop.resultsLead', { newCount, dupCount }) }}
    </p>

    <ul class="booster-results__rarities">
      <li v-for="line in rarityLines" :key="line.rarity" :data-tone="rarityVisual(line.rarity).tone">
        <strong>×{{ line.n }}</strong>
        <span>{{ t(`cards.rarities.${line.rarity}`) }}</span>
      </li>
    </ul>

    <p v-if="result.costPaid" class="booster-results__cost">
      <template v-if="result.costPaid.ryos">
        −{{ result.costPaid.ryos }} Ryos
      </template>
      <template v-if="result.costPaid.kageCoins">
        <span v-if="result.costPaid.ryos"> · </span>
        −{{ result.costPaid.kageCoins }} KC
      </template>
    </p>

    <div class="booster-results__actions">
      <button type="button" class="btn-primary" data-testid="booster-again" @click="$emit('again')">
        {{ t('shop.openAnother') }}
      </button>
      <RouterLink to="/collection" class="btn-secondary">
        {{ t('shop.viewCollection') }}
      </RouterLink>
      <button type="button" class="btn-ghost" @click="$emit('close')">
        {{ t('shop.closeResults') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.booster-results {
  margin-top: 2rem;
  padding: 1.5rem 1.25rem;
  border-top: 6px solid var(--color-gold-fill);
  background: var(--color-bg-card);
  animation: rise-in 420ms var(--ease-out-quint) both;
}

.booster-results__rarities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 2rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
}

.booster-results__rarities li {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.booster-results__rarities strong {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: var(--tone, var(--color-ink));
}

.booster-results__rarities li[data-tone='neutral'] strong {
  color: var(--color-ink);
}

.booster-results__cost {
  margin-top: 0.9rem;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
}

.booster-results__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
</style>

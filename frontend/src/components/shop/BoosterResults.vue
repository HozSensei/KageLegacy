<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

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
    <h2 class="booster-results__title">{{ t('shop.resultsTitle') }}</h2>
    <p class="booster-results__lead">
      {{ t('shop.resultsLead', { newCount, dupCount }) }}
    </p>

    <ul class="booster-results__rarities">
      <li v-for="line in rarityLines" :key="line.rarity">
        <span>{{ t(`cards.rarities.${line.rarity}`) }}</span>
        <strong>×{{ line.n }}</strong>
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
      <button type="button" class="btn-primary text-xs" data-testid="booster-again" @click="$emit('again')">
        {{ t('shop.openAnother') }}
      </button>
      <RouterLink to="/collection" class="btn-ghost text-xs">
        {{ t('shop.viewCollection') }}
      </RouterLink>
      <button type="button" class="btn-ghost text-xs" @click="$emit('close')">
        {{ t('shop.closeResults') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.booster-results {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--kl-accent) 28%, transparent);
  animation: results-in 0.4s ease both;
}

.booster-results__title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--color-ink);
}

.booster-results__lead {
  margin-top: 0.4rem;
  font-size: 0.9rem;
  color: var(--color-ink-muted);
}

.booster-results__rarities {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}

.booster-results__rarities strong {
  margin-left: 0.35rem;
  color: var(--color-accent);
  font-weight: 600;
}

.booster-results__cost {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-ink-faint);
}

.booster-results__actions {
  margin-top: 1.15rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@keyframes results-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

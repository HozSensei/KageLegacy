<script setup>
import { useI18n } from 'vue-i18n';
import { CARD_SIZES, useCardSizePreference } from '../../composables/useCardSizePreference.js';

defineOptions({ name: 'CardSizeControl' });

const { t } = useI18n();
const { cardSize, setCardSize } = useCardSizePreference();
</script>

<template>
  <div
    class="card-size-control"
    role="group"
    :aria-label="t('cards.cardSizeLabel')"
    data-testid="card-size-control"
  >
    <span class="t-kicker">{{ t('cards.cardSizeLabel') }}</span>
    <div class="chip-row">
      <button
        v-for="size in CARD_SIZES"
        :key="size"
        type="button"
        class="chip"
        :aria-pressed="cardSize === size"
        :data-testid="`card-size-${size}`"
        @click="setCardSize(size)"
      >
        {{ t(`cards.cardSize.${size}`) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Desktop only — mobile garde la grille 2 colonnes fixe. */
.card-size-control {
  display: none;
  align-items: center;
  gap: 0.55rem 0.85rem;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .card-size-control {
    display: inline-flex;
  }
}
</style>

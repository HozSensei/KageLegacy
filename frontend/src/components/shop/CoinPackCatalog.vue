<script setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'CoinPackCatalog' })

defineProps({
  packs: { type: Array, default: () => [] },
  balances: { type: Object, default: () => ({}) },
  purchasing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  metaNote: { type: String, default: null },
  canStub: { type: Boolean, default: false },
})

const emit = defineEmits(['purchase'])

const { t, locale } = useI18n()

function nameOf(pack) {
  return locale.value === 'en' ? pack.nameEn : pack.nameFr
}

function descOf(pack) {
  return locale.value === 'en' ? pack.descriptionEn : pack.descriptionFr
}
</script>

<template>
  <div class="coin-catalog" data-testid="coin-pack-catalog">
    <div class="shop-balances">
      <span>{{ t('shop.balanceRyos', { n: (balances.ryos || 0).toLocaleString() }) }}</span>
      <span>{{ t('shop.balanceCoins', { n: (balances.kageCoins || 0).toLocaleString() }) }}</span>
    </div>

    <p v-if="metaNote" class="coin-catalog__note">{{ metaNote }}</p>
    <p v-else class="coin-catalog__note">{{ t('shop.currency.stubNote') }}</p>

    <ul class="shop-grid">
      <li
        v-for="(pack, idx) in packs"
        :key="pack.id"
        class="shop-tile"
        :style="{ animationDelay: `${0.05 + idx * 0.06}s` }"
        :data-testid="`coin-pack-${pack.id}`"
      >
        <p class="shop-tile__kicker">{{ t('shop.currency.packKicker') }}</p>
        <h3 class="shop-tile__name">{{ nameOf(pack) }}</h3>
        <p class="shop-tile__desc">{{ descOf(pack) }}</p>
        <p class="shop-tile__cost">
          {{ t('shop.currency.totalCoins', { n: pack.totalCoins }) }}
          <template v-if="pack.bonusCoins">
            · {{ t('shop.currency.bonus', { n: pack.bonusCoins }) }}
          </template>
        </p>
        <p class="shop-tile__meta">{{ t('shop.currency.priceEur', { n: pack.priceEur }) }}</p>
        <button
          type="button"
          class="btn-primary text-xs w-full"
          :disabled="disabled || purchasing || !canStub"
          data-testid="coin-pack-buy-btn"
          @click="emit('purchase', pack.id)"
        >
          {{
            canStub
              ? purchasing
                ? t('shop.purchasing')
                : t('shop.currency.buyStub')
              : t('shop.currency.buyLocked')
          }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.coin-catalog__note {
  margin: 0 0 1.25rem;
  font-size: 0.78rem;
  color: var(--color-ink-faint);
  max-width: 42rem;
}
</style>

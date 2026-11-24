<script setup>
import { useI18n } from 'vue-i18n'
import ShopBalances from './ShopBalances.vue'

defineOptions({ name: 'CoinPackCatalog' })

defineProps({
  packs: { type: Array, default: () => [] },
  balances: { type: Object, default: () => ({}) },
  purchasing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  metaNote: { type: String, default: null },
  canStub: { type: Boolean, default: false },
  stripeEnabled: { type: Boolean, default: false },
  paymentsEnabled: { type: Boolean, default: true },
})

const emit = defineEmits(['purchase'])
const { t, locale } = useI18n()
function nameOf(pack) { return locale.value === 'en' ? pack.nameEn : pack.nameFr }
function descOf(pack) { return locale.value === 'en' ? pack.descriptionEn : pack.descriptionFr }
</script>

<template>
  <div class="coin-catalog" data-testid="coin-pack-catalog">
    <ShopBalances :balances="balances" />
    <p v-if="metaNote" class="shop-note">{{ metaNote }}</p>
    <p v-else class="shop-note">
      <template v-if="!paymentsEnabled">{{ t('shop.paymentsComingSoonNote') }}</template>
      <template v-else-if="stripeEnabled">{{ t('shop.currency.stripeNote') }}</template>
      <template v-else>{{ t('shop.currency.stubNote') }}</template>
    </p>
    <ul class="shop-grid stagger">
      <li
        v-for="pack in packs"
        :key="pack.id"
        class="shop-tile"
        data-tone="gold"
        :data-testid="`coin-pack-${pack.id}`"
      >
        <span class="shop-tile__shape shop-tile__shape--lozenge" aria-hidden="true" />
        <p class="shop-tile__kicker">{{ t('shop.currency.packKicker') }}</p>
        <h3 class="shop-tile__name">{{ nameOf(pack) }}</h3>
        <p class="shop-tile__desc">{{ descOf(pack) }}</p>
        <p class="shop-tile__cost">
          {{ t('shop.currency.totalCoins', { n: pack.totalCoins }) }}
          <small v-if="pack.bonusCoins"> {{ t('shop.currency.bonus', { n: pack.bonusCoins }) }}</small>
        </p>
        <p class="shop-tile__meta">{{ t('shop.currency.priceEur', { n: pack.priceEur }) }}</p>
        <div class="shop-tile__actions">
          <button
            v-if="!paymentsEnabled"
            type="button"
            class="btn-primary btn-block"
            disabled
            data-testid="coin-pack-coming-soon-btn"
          >
            {{ t('shop.comingSoon') }}
          </button>
          <button
            v-else-if="stripeEnabled"
            type="button"
            class="btn-primary btn-block"
            :disabled="disabled || purchasing"
            data-testid="coin-pack-pay-btn"
            @click="emit('purchase', pack.id, 'stripe')"
          >
            {{ purchasing ? t('shop.purchasing') : t('shop.currency.buyStripe', { n: pack.priceEur }) }}
          </button>
          <button
            v-if="canStub"
            type="button"
            class="btn-secondary btn-block"
            :disabled="disabled || purchasing"
            data-testid="coin-pack-buy-btn"
            @click="emit('purchase', pack.id, 'stub')"
          >
            {{ purchasing ? t('shop.purchasing') : t('shop.currency.buyStub') }}
          </button>
          <button
            v-if="paymentsEnabled && !stripeEnabled && !canStub"
            type="button"
            class="btn-primary btn-block"
            disabled
            data-testid="coin-pack-buy-btn"
          >
            {{ t('shop.currency.buyLocked') }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

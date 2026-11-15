<script setup>
import { useI18n } from 'vue-i18n'
import AppIcon from '../ui/AppIcon.vue'

defineOptions({ name: 'ShopBalances' })

defineProps({
  balances: { type: Object, default: () => ({}) },
})

const { t } = useI18n()
</script>

<template>
  <dl class="shop-balances" :aria-label="t('shop.balancesLabel')">
    <div class="shop-balances__item" data-tone="wood" :title="t('shop.balanceRyos', { n: (balances.ryos || 0).toLocaleString() })">
      <span class="shop-balances__mark" aria-hidden="true"><AppIcon name="ryos" size="1.15rem" /></span>
      <div>
        <dd class="shop-balances__value">{{ (balances.ryos || 0).toLocaleString() }}</dd>
        <dt class="shop-balances__label">{{ t('shop.ryos') }}</dt>
      </div>
    </div>
    <div class="shop-balances__item" data-tone="gold" :title="t('shop.balanceCoins', { n: (balances.kageCoins || 0).toLocaleString() })">
      <span class="shop-balances__mark" aria-hidden="true"><AppIcon name="coins" size="1.15rem" /></span>
      <div>
        <dd class="shop-balances__value">{{ (balances.kageCoins || 0).toLocaleString() }}</dd>
        <dt class="shop-balances__label">{{ t('shop.kageCoins') }}</dt>
      </div>
    </div>
  </dl>
</template>

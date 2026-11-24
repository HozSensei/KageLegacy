<script setup>
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'ShopBalances' });

defineProps({
  balances: { type: Object, default: () => ({}) },
  /** Réduit les marges pour un bandeau de page. */
  compact: { type: Boolean, default: false },
});

const { t, n } = useI18n();

const resources = [
  { key: 'ryos', icon: 'ryos', tone: 'wood' },
  { key: 'kageCoins', icon: 'coins', tone: 'gold' },
  { key: 'dust', icon: 'dust', tone: 'indigo' },
  { key: 'essence', icon: 'essence', tone: 'vermilion' },
];
</script>

<template>
  <dl
    class="shop-balances"
    :class="{ 'shop-balances--compact': compact }"
    :aria-label="t('resources.balancesLabel')"
    data-testid="shop-balances"
  >
    <div
      v-for="resource in resources"
      :key="resource.key"
      class="shop-balances__item"
      :data-tone="resource.tone"
      :data-testid="`shop-balance-${resource.key}`"
      :title="t(`resources.${resource.key}`, { n: n(balances[resource.key] || 0) })"
    >
      <span class="shop-balances__mark" aria-hidden="true">
        <AppIcon :name="resource.icon" size="1.15rem" />
      </span>
      <div>
        <dd class="shop-balances__value">{{ n(balances[resource.key] || 0) }}</dd>
        <dt class="shop-balances__label">{{ t(`resources.names.${resource.key}`) }}</dt>
      </div>
    </div>
  </dl>
</template>

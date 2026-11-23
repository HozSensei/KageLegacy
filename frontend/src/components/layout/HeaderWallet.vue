<script setup>
import { useI18n } from 'vue-i18n';
import { useShopStore } from '../../stores/shop';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'HeaderWallet' });

const { t, n } = useI18n();
const shop = useShopStore();

const resources = [
  { key: 'ryos', icon: 'ryos', tone: 'wood' },
  { key: 'kageCoins', icon: 'coins', tone: 'gold' },
  { key: 'dust', icon: 'dust', tone: 'indigo' },
  { key: 'essence', icon: 'essence', tone: 'vermilion' },
];
</script>

<template>
  <dl
    class="nav-wallet"
    :aria-label="t('resources.balancesLabel')"
    data-testid="header-wallet-balances"
  >
    <div
      v-for="resource in resources"
      :key="resource.key"
      class="nav-wallet__balance"
      :data-tone="resource.tone"
      :title="t(`resources.${resource.key}`, { n: n(shop.balances[resource.key] || 0) })"
    >
      <dt class="sr-only">{{ t(`resources.names.${resource.key}`) }}</dt>
      <dd>
        <AppIcon :name="resource.icon" size="1rem" aria-hidden="true" />
        <span class="nav-wallet__name" aria-hidden="true">{{
          t(`resources.names.${resource.key}`)
        }}</span>
        <span>{{ n(shop.balances[resource.key] || 0) }}</span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.nav-wallet {
  display: grid;
  gap: 0.35rem;
  margin: 0;
}

.nav-wallet__balance dd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.45rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--color-on-fill) 22%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-on-fill);
}

.nav-wallet__name {
  flex: 1;
  min-width: 0;
  color: inherit;
  opacity: 0.9;
}

.nav-wallet__balance[data-tone='wood'] {
  --tone: #e8c39a;
}
.nav-wallet__balance[data-tone='gold'] {
  --tone: var(--color-gold-fill);
}
.nav-wallet__balance[data-tone='indigo'] {
  --tone: #a8b8ff;
}
.nav-wallet__balance[data-tone='vermilion'] {
  --tone: #ff8f7a;
}
</style>

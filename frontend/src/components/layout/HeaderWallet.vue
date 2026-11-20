<script setup>
import { useI18n } from 'vue-i18n';
import { useShopStore } from '../../stores/shop';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'HeaderWallet' });

defineProps({
  /** `panel` : liste toujours visible (menu / rail). */
  variant: {
    type: String,
    default: 'panel',
    validator: value => ['panel', 'rail'].includes(value),
  },
});

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
    :class="`nav-wallet--${variant}`"
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
        <span v-if="variant === 'panel'" class="nav-wallet__name" aria-hidden="true">{{
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
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tone);
}

.nav-wallet__name {
  flex: 1;
  min-width: 0;
  color: inherit;
  opacity: 0.9;
}

.nav-wallet--panel .nav-wallet__balance dd {
  border-color: color-mix(in srgb, var(--color-on-fill) 22%, transparent);
  color: var(--color-on-fill);
}

.nav-wallet--panel .nav-wallet__balance[data-tone='wood'] {
  --tone: #e8c39a;
}
.nav-wallet--panel .nav-wallet__balance[data-tone='gold'] {
  --tone: var(--color-gold-fill);
}
.nav-wallet--panel .nav-wallet__balance[data-tone='indigo'] {
  --tone: #a8b8ff;
}
.nav-wallet--panel .nav-wallet__balance[data-tone='vermilion'] {
  --tone: #ff8f7a;
}

.nav-wallet--rail {
  width: 100%;
  gap: 0.25rem;
  padding: 0 0.35rem;
}

.nav-wallet--rail .nav-wallet__balance dd {
  justify-content: center;
  gap: 0.2rem;
  padding: 0.35rem 0.2rem;
  border-color: color-mix(in srgb, var(--color-on-fill) 22%, transparent);
  font-size: 0.625rem;
  color: var(--color-on-fill);
}
</style>

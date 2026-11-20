<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useShopStore } from '../../stores/shop';
import AppIcon from '../ui/AppIcon.vue';

const { t, n } = useI18n();
const shop = useShopStore();
const route = useRoute();
const open = ref(false);
const root = ref(null);
const trigger = ref(null);

const resources = [
  { key: 'ryos', icon: 'ryos', tone: 'wood' },
  { key: 'kageCoins', icon: 'coins', tone: 'gold' },
  { key: 'dust', icon: 'dust', tone: 'indigo' },
  { key: 'essence', icon: 'essence', tone: 'vermilion' },
];

function closeOutside(event) {
  if (open.value && !root.value?.contains(event.target)) open.value = false;
}

function closeOnEscape(event) {
  if (!open.value) return;
  event.stopPropagation();
  open.value = false;
  trigger.value?.focus();
}

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  }
);
onMounted(() => {
  document.addEventListener('pointerdown', closeOutside);
  document.addEventListener('focusin', closeOutside);
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', closeOutside);
  document.removeEventListener('focusin', closeOutside);
});
</script>

<template>
  <div ref="root" class="header-wallet" @keydown.esc="closeOnEscape">
    <button
      ref="trigger"
      type="button"
      class="btn-icon header-wallet__trigger"
      :aria-label="t('resources.wallet')"
      :title="t('resources.wallet')"
      :aria-expanded="open"
      aria-controls="header-wallet-balances"
      data-testid="header-wallet-trigger"
      @click="open = !open"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M21 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16a1 1 0 0 1 1 1v9H5a2 2 0 0 1-2-2V7m19 5h-5a2.5 2.5 0 0 0 0 5h5m-5-2.5h.01"
        />
      </svg>
    </button>
    <dl
      id="header-wallet-balances"
      class="header-wallet__balances"
      :class="{ 'is-open': open }"
      :aria-label="t('resources.balancesLabel')"
    >
      <div
        v-for="resource in resources"
        :key="resource.key"
        class="header-wallet__balance"
        :data-tone="resource.tone"
        :title="t(`resources.${resource.key}`, { n: n(shop.balances[resource.key] || 0) })"
      >
        <dt class="sr-only">{{ t(`resources.names.${resource.key}`) }}</dt>
        <dd>
          <AppIcon :name="resource.icon" size="1rem" aria-hidden="true" />
          <span class="header-wallet__name" aria-hidden="true">{{
            t(`resources.names.${resource.key}`)
          }}</span>
          <span>{{ n(shop.balances[resource.key] || 0) }}</span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.header-wallet__trigger,
.header-wallet__name {
  display: none;
}

.header-wallet__balances {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin: 0;
}

.header-wallet__balance dd {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--color-line);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tone);
}

.header-wallet__balance[data-tone='wood'] {
  --tone: var(--color-wood);
}
.header-wallet__balance[data-tone='gold'] {
  --tone: var(--color-gold-fill);
}
.header-wallet__balance[data-tone='indigo'] {
  --tone: var(--color-indigo);
}
.header-wallet__balance[data-tone='vermilion'] {
  --tone: var(--color-vermilion);
}

@media (width < 68rem) {
  .header-wallet__trigger {
    display: inline-flex;
  }

  .header-wallet__balances {
    display: none;
    position: absolute;
    z-index: 1;
    inset-block-start: 100%;
    inset-inline-end: var(--space-gutter);
    width: 18rem;
    max-width: calc(100% - 2 * var(--space-gutter));
    padding: 0.75rem;
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-md);
    background: var(--color-bg-card);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
  }

  .header-wallet__balances.is-open {
    display: grid;
  }

  .header-wallet__balance dd {
    gap: 0.5rem;
    padding: 0.45rem;
    font-size: 0.875rem;
  }

  .header-wallet__name {
    display: inline;
    flex: 1;
    color: var(--color-ink);
  }
}
</style>

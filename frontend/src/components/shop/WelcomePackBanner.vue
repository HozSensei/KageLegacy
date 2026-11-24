<script setup>
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'WelcomePackBanner' });

defineProps({
  offer: { type: Object, default: null },
  purchasing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  canStub: { type: Boolean, default: false },
  stripeEnabled: { type: Boolean, default: false },
  paymentsEnabled: { type: Boolean, default: true },
});

const emit = defineEmits(['purchase']);
const { t } = useI18n();
</script>

<template>
  <section
    v-if="offer?.available"
    class="welcome-pack"
    data-testid="welcome-pack-banner"
  >
    <p class="welcome-pack__kicker">{{ t('shop.welcome.kicker') }}</p>
    <h3 class="welcome-pack__title">{{ t('shop.welcome.title') }}</h3>
    <p class="welcome-pack__lead">{{ t('shop.welcome.lead') }}</p>
    <ul class="welcome-pack__list">
      <li>{{ t('shop.welcome.itemBp') }}</li>
      <li>{{ t('shop.welcome.itemTitle') }}</li>
      <li>{{ t('shop.welcome.itemBooster') }}</li>
    </ul>
    <p class="welcome-pack__meta">{{ t('shop.welcome.once') }}</p>
    <div class="welcome-pack__actions">
      <button
        v-if="!paymentsEnabled"
        type="button"
        class="btn-primary"
        disabled
        data-testid="welcome-pack-coming-soon-btn"
      >
        {{ t('shop.comingSoon') }}
      </button>
      <button
        v-else-if="stripeEnabled"
        type="button"
        class="btn-primary"
        :disabled="disabled || purchasing"
        data-testid="welcome-pack-pay-btn"
        @click="emit('purchase', 'stripe')"
      >
        {{
          purchasing
            ? t('shop.purchasing')
            : t('shop.welcome.buyStripe', { n: offer.priceEur })
        }}
      </button>
      <button
        v-if="canStub"
        type="button"
        class="btn-secondary"
        :disabled="disabled || purchasing"
        data-testid="welcome-pack-stub-btn"
        @click="emit('purchase', 'stub')"
      >
        {{ purchasing ? t('shop.purchasing') : t('shop.welcome.buyStub') }}
      </button>
      <button
        v-if="paymentsEnabled && !stripeEnabled && !canStub"
        type="button"
        class="btn-primary"
        disabled
      >
        {{ t('shop.welcome.buyLocked') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.welcome-pack {
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.35rem;
  border: 1px solid color-mix(in oklab, var(--color-gold, #c4a35a) 35%, transparent);
  background: color-mix(in oklab, var(--color-gold, #c4a35a) 8%, transparent);
}
.welcome-pack__kicker {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted, #6b6560);
}
.welcome-pack__title {
  margin: 0.35rem 0 0.4rem;
  font-size: 1.15rem;
}
.welcome-pack__lead,
.welcome-pack__meta {
  margin: 0;
  color: var(--color-ink-muted, #6b6560);
  font-size: 0.92rem;
}
.welcome-pack__list {
  margin: 0.75rem 0;
  padding-left: 1.1rem;
  font-size: 0.95rem;
}
.welcome-pack__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}
</style>

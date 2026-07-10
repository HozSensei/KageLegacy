<script setup>
import { useI18n } from 'vue-i18n'
import { useEliteStore } from '../../stores/elite'

defineOptions({ name: 'EliteCheckoutBanner' })

const { t } = useI18n()
const elite = useEliteStore()
</script>

<template>
  <div
    v-if="elite.checkoutNotice"
    class="elite-checkout-banner"
    data-testid="elite-checkout-banner"
    role="status"
  >
    <p
      v-if="elite.checkoutNotice === 'confirming'"
      class="text-sm text-ink-muted"
      data-testid="elite-checkout-confirming"
    >
      {{ t('elitePack.checkoutConfirming') }}
    </p>

    <template v-else-if="elite.checkoutNotice === 'success'">
      <p class="font-display text-lg text-accent" data-testid="elite-checkout-success">
        {{ t('elitePack.checkoutSuccess') }}
      </p>
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        {{ t('elitePack.checkoutThanks') }}
      </p>
    </template>

    <p
      v-else-if="elite.checkoutNotice === 'canceled'"
      class="text-sm text-ink-muted"
      data-testid="elite-checkout-canceled"
    >
      {{ t('elitePack.checkoutCanceled') }}
    </p>

    <p
      v-else-if="elite.checkoutNotice === 'error'"
      class="text-sm text-fire"
      data-testid="elite-checkout-error"
    >
      {{ elite.checkoutError }}
    </p>

    <button
      v-if="elite.checkoutNotice !== 'confirming'"
      type="button"
      class="elite-checkout-banner__dismiss"
      :aria-label="t('common.dismiss')"
      @click="elite.clearCheckoutNotice()"
    >
      ×
    </button>
  </div>
</template>

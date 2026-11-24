<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ShopBalances from './ShopBalances.vue'
defineOptions({ name: 'BattlePassOffer' })
defineProps({
  offer: { type: Object, default: null },
  purchasing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  canStub: { type: Boolean, default: false },
  stripeEnabled: { type: Boolean, default: false },
  paymentsEnabled: { type: Boolean, default: true },
})
const emit = defineEmits(['unlock'])
const { t } = useI18n()
const router = useRouter()
function goToBattlePass(href) { router.push(href || '/battle-pass') }
</script>

<template>
  <div class="bp-offer" data-testid="battle-pass-offer">
    <ShopBalances v-if="offer?.balances" :balances="offer.balances" />
    <div v-if="!offer?.available" class="shop-tile shop-tile--muted bp-offer__card">
      <p class="shop-tile__kicker">{{ t('shop.battlePass.kicker') }}</p>
      <h3 class="shop-tile__name">{{ t('shop.battlePass.unavailableTitle') }}</h3>
      <p class="shop-tile__desc">{{ t('shop.battlePass.unavailableLead') }}</p>
      <div>
        <button type="button" class="btn-secondary" @click="goToBattlePass(offer?.href)">
          {{ t('shop.battlePass.openPage') }}
        </button>
      </div>
    </div>
    <div v-else class="shop-tile bp-offer__card" data-tone="gold">
      <span class="shop-tile__shape shop-tile__shape--lozenge" aria-hidden="true" />
      <p class="shop-tile__kicker">{{ t('shop.battlePass.kicker') }}</p>
      <h3 class="shop-tile__name bp-offer__name">{{ offer.season?.name || t('shop.battlePass.title') }}</h3>
      <p class="shop-tile__desc">{{ t('shop.battlePass.lead') }}</p>
      <p>
        <span class="badge" :class="offer.isPremium ? 'badge--solid' : ''" :data-tone="offer.isPremium ? 'leaf' : 'neutral'">
          {{ offer.isPremium ? t('shop.battlePass.premiumActive') : t('shop.battlePass.premiumLocked') }}
        </span>
      </p>
      <p v-if="offer.stripeNote" class="shop-tile__meta">{{ offer.stripeNote }}</p>
      <div class="bp-offer__actions">
        <button
          v-if="!offer.isPremium && !paymentsEnabled"
          type="button"
          class="btn-primary"
          disabled
          data-testid="shop-bp-coming-soon"
        >
          {{ t('shop.comingSoon') }}
        </button>
        <button
          v-else-if="!offer.isPremium && stripeEnabled"
          type="button"
          class="btn-primary"
          :disabled="disabled || purchasing"
          data-testid="shop-bp-unlock-stripe"
          @click="emit('unlock', 'stripe')"
        >
          {{ purchasing ? t('shop.purchasing') : t('shop.battlePass.unlockStripe', { n: offer.premiumPriceEur || 5 }) }}
        </button>
        <button
          v-if="!offer.isPremium"
          type="button"
          :class="stripeEnabled || !paymentsEnabled ? 'btn-secondary' : 'btn-primary'"
          :disabled="disabled || purchasing"
          data-testid="shop-bp-unlock-coins"
          @click="emit('unlock', 'kage_coins')"
        >
          {{ purchasing ? t('shop.purchasing') : t('shop.battlePass.unlockCoins', { n: offer.premiumCostKageCoins || 500 }) }}
        </button>
        <button
          v-if="!offer.isPremium && canStub"
          type="button"
          class="btn-ghost"
          :disabled="disabled || purchasing"
          data-testid="shop-bp-unlock-stub"
          @click="emit('unlock', 'stub')"
        >
          {{ t('shop.battlePass.unlockStub') }}
        </button>
        <button type="button" class="btn-ghost" data-testid="shop-bp-open-page" @click="goToBattlePass(offer.href)">
          {{ t('shop.battlePass.openPage') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bp-offer__card {
  max-width: 40rem;
  padding: 1.75rem 1.5rem 1.5rem;
}

.bp-offer__name {
  max-width: 18ch;
  font-size: clamp(1.75rem, 1.4rem + 1.4vw, 2.5rem);
}

.bp-offer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>

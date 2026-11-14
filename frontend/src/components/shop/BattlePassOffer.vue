<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

defineOptions({ name: 'BattlePassOffer' })

defineProps({
  offer: { type: Object, default: null },
  purchasing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  canStub: { type: Boolean, default: false },
})

const emit = defineEmits(['unlock'])

const { t } = useI18n()
const router = useRouter()

function goToBattlePass(href) {
  router.push(href || '/battle-pass')
}
</script>

<template>
  <div class="bp-offer" data-testid="battle-pass-offer">
    <div v-if="offer?.balances" class="shop-balances">
      <span>{{ t('shop.balanceRyos', { n: (offer.balances.ryos || 0).toLocaleString() }) }}</span>
      <span>{{
        t('shop.balanceCoins', { n: (offer.balances.kageCoins || 0).toLocaleString() })
      }}</span>
    </div>

    <div v-if="!offer?.available" class="shop-tile bp-offer__card">
      <p class="shop-tile__kicker">{{ t('shop.battlePass.kicker') }}</p>
      <h3 class="shop-tile__name">{{ t('shop.battlePass.unavailableTitle') }}</h3>
      <p class="shop-tile__desc">{{ t('shop.battlePass.unavailableLead') }}</p>
      <button type="button" class="btn-ghost text-xs" @click="goToBattlePass(offer?.href)">
        {{ t('shop.battlePass.openPage') }}
      </button>
    </div>

    <div v-else class="shop-tile bp-offer__card bp-offer__card--active">
      <p class="shop-tile__kicker">{{ t('shop.battlePass.kicker') }}</p>
      <h3 class="shop-tile__name">
        {{ offer.season?.name || t('shop.battlePass.title') }}
      </h3>
      <p class="shop-tile__desc">{{ t('shop.battlePass.lead') }}</p>

      <p
        class="shop-tile__meta"
        :class="offer.isPremium ? 'text-win' : ''"
      >
        {{
          offer.isPremium
            ? t('shop.battlePass.premiumActive')
            : t('shop.battlePass.premiumLocked')
        }}
      </p>

      <p v-if="offer.stripeNote" class="bp-offer__note">{{ offer.stripeNote }}</p>

      <div class="bp-offer__actions">
        <button
          v-if="!offer.isPremium"
          type="button"
          class="btn-primary text-xs"
          :disabled="disabled || purchasing"
          data-testid="shop-bp-unlock-coins"
          @click="emit('unlock', 'kage_coins')"
        >
          {{
            purchasing
              ? t('shop.purchasing')
              : t('shop.battlePass.unlockCoins', {
                  n: offer.premiumCostKageCoins || 500,
                })
          }}
        </button>
        <button
          v-if="!offer.isPremium && canStub"
          type="button"
          class="btn-ghost text-xs"
          :disabled="disabled || purchasing"
          data-testid="shop-bp-unlock-stub"
          @click="emit('unlock', 'stub')"
        >
          {{ t('shop.battlePass.unlockStub') }}
        </button>
        <button
          type="button"
          class="btn-ghost text-xs"
          data-testid="shop-bp-open-page"
          @click="goToBattlePass(offer.href)"
        >
          {{ t('shop.battlePass.openPage') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bp-offer__card {
  max-width: 36rem;
}

.bp-offer__card--active {
  border-color: color-mix(in srgb, var(--kl-accent) 45%, transparent);
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--kl-bg-card) 88%, transparent), var(--kl-bg-soft)),
    radial-gradient(ellipse at top right, color-mix(in srgb, var(--kl-accent) 16%, transparent), transparent 55%);
}

.bp-offer__note {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
  margin: 0.35rem 0 0;
}

.bp-offer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
</style>

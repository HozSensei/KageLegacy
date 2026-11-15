<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ShopBalances from './ShopBalances.vue'
import { rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'CosmeticCatalog' })

const props = defineProps({
  items: { type: Array, default: () => [] },
  balances: { type: Object, default: () => ({}) },
  purchasing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['purchase', 'equip'])

const { t, locale } = useI18n()

const groups = computed(() => {
  const order = ['avatar_frame', 'card_back', 'title']
  return order.map((type) => ({
    type,
    items: props.items.filter((i) => i.cosmeticType === type),
  }))
})

const TYPE_SHAPES = { avatar_frame: 'circle', card_back: 'square', title: 'lozenge' }

function nameOf(item) {
  return locale.value === 'en' ? item.nameEn : item.nameFr
}

function descOf(item) {
  return locale.value === 'en' ? item.descriptionEn : item.descriptionFr
}

function costLabel(item) {
  const parts = []
  if (item.cost?.ryos) parts.push(t('shop.costRyos', { n: item.cost.ryos }))
  if (item.cost?.kageCoins) parts.push(t('shop.costCoins', { n: item.cost.kageCoins }))
  return parts.join(' · ') || t('shop.costFree')
}

function canAfford(item) {
  const ryos = props.balances.ryos || 0
  const coins = props.balances.kageCoins || 0
  return ryos >= (item.cost?.ryos || 0) && coins >= (item.cost?.kageCoins || 0)
}
</script>

<template>
  <div class="cosmetic-catalog" data-testid="cosmetic-catalog">
    <ShopBalances :balances="balances" />

    <section v-for="(group, gi) in groups" :key="group.type" class="cosmetic-group">
      <div class="section-head">
        <span class="section-head__index">{{ String(gi + 1).padStart(2, '0') }}</span>
        <h2 class="section-head__title">{{ t(`shop.cosmetics.types.${group.type}`) }}</h2>
        <span class="section-head__rule" aria-hidden="true" />
      </div>
      <ul class="shop-grid stagger">
        <li
          v-for="item in group.items"
          :key="item.key"
          class="shop-tile"
          :class="{ 'shop-tile--owned': item.owned, 'shop-tile--active': item.equipped }"
          :data-tone="rarityVisual(item.rarity).tone"
          :data-testid="`cosmetic-${item.key}`"
        >
          <span
            class="shop-tile__shape"
            :class="`shop-tile__shape--${TYPE_SHAPES[group.type]}`"
            aria-hidden="true"
          />
          <p class="shop-tile__kicker">
            {{ t(`cards.rarities.${item.rarity}`, item.rarity) }}
            <span v-if="item.equipped"> · {{ t('shop.cosmetics.equipped') }}</span>
            <span v-else-if="item.owned"> · {{ t('shop.cosmetics.owned') }}</span>
          </p>
          <h3 class="shop-tile__name">{{ nameOf(item) }}</h3>
          <p class="shop-tile__desc">{{ descOf(item) }}</p>
          <p class="shop-tile__cost">{{ costLabel(item) }}</p>

          <button
            v-if="!item.owned"
            type="button"
            class="btn-primary btn-block"
            :disabled="disabled || purchasing || !canAfford(item)"
            data-testid="cosmetic-buy-btn"
            @click="emit('purchase', item.key)"
          >
            {{
              purchasing
                ? t('shop.purchasing')
                : canAfford(item)
                  ? t('shop.cosmetics.buy')
                  : t('shop.insufficientFunds')
            }}
          </button>
          <button
            v-else-if="!item.equipped"
            type="button"
            class="btn-secondary btn-block"
            :disabled="disabled || purchasing"
            data-testid="cosmetic-equip-btn"
            @click="emit('equip', item.key)"
          >
            {{ t('shop.cosmetics.equip') }}
          </button>
          <p v-else class="shop-tile__meta">{{ t('shop.cosmetics.equippedHint') }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.cosmetic-group {
  margin-bottom: 2.5rem;
}

.cosmetic-group .section-head {
  margin-bottom: 1rem;
}
</style>

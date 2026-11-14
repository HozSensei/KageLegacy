<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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
    <div class="shop-balances">
      <span>{{ t('shop.balanceRyos', { n: (balances.ryos || 0).toLocaleString() }) }}</span>
      <span>{{ t('shop.balanceCoins', { n: (balances.kageCoins || 0).toLocaleString() }) }}</span>
    </div>

    <section v-for="group in groups" :key="group.type" class="cosmetic-group">
      <h2 class="cosmetic-group__title">
        {{ t(`shop.cosmetics.types.${group.type}`) }}
      </h2>
      <ul class="shop-grid">
        <li
          v-for="(item, idx) in group.items"
          :key="item.key"
          class="shop-tile"
          :class="{ 'shop-tile--owned': item.owned, 'shop-tile--equipped': item.equipped }"
          :style="{ animationDelay: `${0.04 + idx * 0.05}s` }"
          :data-testid="`cosmetic-${item.key}`"
        >
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
            class="btn-primary text-xs w-full"
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
            class="btn-ghost text-xs w-full"
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
  margin-bottom: 2rem;
}

.cosmetic-group__title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--color-ink);
  margin-bottom: 0.85rem;
}

.shop-tile--owned {
  border-color: color-mix(in srgb, var(--kl-water) 40%, transparent);
}

.shop-tile--equipped {
  border-color: color-mix(in srgb, var(--kl-accent) 55%, transparent);
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatRyos } from '../composables/useFormatRyos'
import { useCategoryCollapse } from '../composables/useCategoryCollapse.js'
import { formatBonusRange } from '../utils/techniqueCardBonus.js'

const { t, locale } = useI18n()
const { formatRyos } = useFormatRyos()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const market = ref(null)
const buyingId = ref(null)
const categoryFilter = ref('all')

const CATEGORY_FILTERS = ['all', 'bureau', 'cycle']
const categoryOrder = ['bureau', 'cycle']
const { toggle: toggleCategory, isCollapsed } = useCategoryCollapse(
  [...categoryOrder, 'tacticCards']
)

const itemName = (item) => (locale.value === 'en' ? item.nameEn : item.nameFr)
const itemDesc = (item) => (locale.value === 'en' ? item.descriptionEn : item.descriptionFr)
const cardName = (card) => (locale.value === 'en' ? card.nameEn : card.nameFr)
const cardDesc = (card) => (locale.value === 'en' ? card.descriptionEn : card.descriptionFr)

const categoryLabel = (cat) => t(`market.categories.${cat}`)

function usageLabel(item) {
  if (item.category === 'bureau') return t('market.bureauOnce')
  if (item.category === 'cycle') return t('market.cycleItem')
  if (item.category === 'match') return t('market.consumableOnce')
  const limit = item.usageLimits?.[0]
  if (!limit) return ''
  return t('market.usesPerMatch', { count: limit.uses })
}

const groupedItems = computed(() => {
  if (!market.value?.items) return {}
  return market.value.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
})

const visibleCategories = computed(() =>
  categoryOrder.filter((cat) => {
    const count = groupedItems.value[cat]?.length ?? 0
    if (!count) return false
    if (categoryFilter.value === 'all') return true
    return categoryFilter.value === cat
  })
)

const promoItems = computed(() => market.value?.items?.filter((item) => item.onPromo) || [])

function itemCountForCategory(category) {
  const items = market.value?.items || []
  if (category === 'all') return items.length
  return items.filter((item) => item.category === category).length
}

function itemElement(item) {
  const effects = item.effects || {}
  if (effects.match?.trigger === 'element_resist' && effects.match?.element) {
    return effects.match.element
  }
  const modifiers = effects.modifiers || effects.match?.modifiers || []
  const list = Array.isArray(modifiers) ? modifiers : []
  const resist = list.find((mod) => mod?.kind === 'element_resist')
  return resist?.element || null
}

onMounted(fetchMarket)

async function fetchMarket() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/market`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function buy(stockId) {
  buyingId.value = stockId
  try {
    const res = await fetch(`${API_BASE}/api/market/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    buyingId.value = null
  }
}

async function buyCard(stockId) {
  buyingId.value = stockId
  try {
    const res = await fetch(`${API_BASE}/api/market/buy-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    buyingId.value = null
  }
}

const canBuy = computed(() => (item) =>
  !item.soldOut &&
  !market.value?.debtBlocksSpending &&
  (market.value?.ryos ?? 0) >= item.finalPrice
)

const canBuyCard = computed(() => (card) =>
  !card.soldOut &&
  !market.value?.debtBlocksSpending &&
  (market.value?.ryos ?? 0) >= card.finalPrice
)
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="market-page">
    <header>
      <p class="page-lead">{{ t('market.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('market.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <div v-else-if="market" data-testid="market-catalog">
      <div class="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-ink-muted">
        <p>{{ t('market.balance', { ryos: market.ryos.toLocaleString() }) }}</p>
        <p>
          {{ t('market.restock', { cycles: market.cyclesUntilRestock, every: market.restockEveryCycles }) }}
        </p>
        <p v-if="market.promoCount">{{ t('market.promoActive', { count: market.promoCount }) }}</p>
      </div>
      <p v-if="market.debtBlocksSpending" class="mt-4 text-sm text-fire">{{ t('market.debtBlocked') }}</p>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          v-for="cat in CATEGORY_FILTERS"
          :key="`market-cat-${cat}`"
          type="button"
          class="rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition"
          :class="
            categoryFilter === cat
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line text-ink-faint hover:border-ink-faint'
          "
          @click="categoryFilter = cat"
        >
          {{ t(`inventory.filterCategory.${cat}`) }}
          <span class="ml-1 opacity-70">({{ itemCountForCategory(cat) }})</span>
        </button>
      </div>

      <section v-if="promoItems.length" class="mt-10 border border-fire/30 bg-fire/5 p-5" data-testid="market-promos">
        <p class="section-label text-fire">{{ t('market.promoSectionTitle') }}</p>
        <p class="mt-2 text-xs text-ink-muted">{{ t('market.promoSectionHint', { count: promoItems.length }) }}</p>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
          <li
            v-for="item in promoItems"
            :key="`promo-${item.stockId}`"
            class="flex flex-wrap items-baseline justify-between gap-2 border border-line/60 bg-bg-card px-4 py-3 text-sm"
          >
            <span class="font-medium text-ink">{{ itemName(item) }}</span>
            <span class="flex items-baseline gap-2">
              <span class="text-ink-faint line-through">{{ formatRyos(item.basePrice) }}</span>
              <span class="font-semibold text-fire">{{ formatRyos(item.finalPrice) }}</span>
              <span class="text-[10px] uppercase tracking-wider text-fire">
                {{ t('market.promo', { pct: item.discountPct }) }}
              </span>
            </span>
          </li>
        </ul>
      </section>

      <section
        v-for="cat in visibleCategories"
        :key="cat"
        class="mt-14"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 text-left"
          :aria-expanded="!isCollapsed(cat)"
          @click="toggleCategory(cat)"
        >
          <svg
            class="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200"
            :class="{ '-rotate-90': isCollapsed(cat) }"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="section-label">{{ categoryLabel(cat) }}</span>
          <span class="text-[10px] text-ink-faint">({{ groupedItems[cat]?.length ?? 0 }})</span>
          <span class="sr-only">
            {{ isCollapsed(cat) ? t('common.expandSection') : t('common.collapseSection') }}
          </span>
        </button>

        <div v-show="!isCollapsed(cat)" class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in groupedItems[cat] || []"
            :key="item.stockId"
            class="border bg-bg-soft p-6"
            :class="[
              item.soldOut ? 'border-line opacity-60' : 'border-line',
              item.onPromo && !item.soldOut ? 'ring-1 ring-fire/35' : '',
            ]"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
                {{ categoryLabel(item.category) }}
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="itemElement(item)"
                  class="text-[10px] uppercase tracking-[0.12em] text-ink-muted"
                >
                  {{ itemElement(item) }}
                </span>
                <span
                  v-if="item.onHeritageDiscount"
                  class="rounded-sm bg-accent/15 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-accent"
                >
                  {{ t('market.heritageDiscount', { pct: item.heritageDiscountPct }) }}
                </span>
                <span
                  v-if="item.onPromo"
                  class="rounded-sm bg-fire/15 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-fire"
                >
                  {{ t('market.promo', { pct: item.discountPct }) }}
                </span>
              </div>
            </div>
            <h2 class="mt-3 font-display text-xl text-ink">{{ itemName(item) }}</h2>
            <p class="mt-3 text-sm leading-relaxed text-ink-muted">{{ itemDesc(item) }}</p>
            <p class="mt-2 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {{ t('market.situational') }} · {{ usageLabel(item) }}
            </p>
            <p class="mt-4 text-xs text-ink-faint">
              {{ t('market.stock', { remaining: item.stockRemaining, initial: item.stockInitial }) }}
            </p>
            <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <template v-if="item.onPromo">
                <span class="text-sm text-ink-faint line-through">
                  {{ formatRyos(item.basePrice) }}
                </span>
                <span class="text-base font-semibold text-fire">
                  {{ formatRyos(item.finalPrice) }}
                </span>
              </template>
              <template v-else>
                <span class="text-base font-medium text-ink">
                  {{ formatRyos(item.finalPrice) }}
                </span>
              </template>
            </div>

            <button
              type="button"
              class="btn-ghost mt-6 w-full disabled:opacity-40"
              :disabled="item.soldOut || !canBuy(item) || buyingId === item.stockId"
              @click="buy(item.stockId)"
            >
              {{
                item.soldOut
                  ? t('market.soldOut')
                  : buyingId === item.stockId
                    ? t('market.buying')
                    : t('market.buy')
              }}
            </button>
          </article>
        </div>
      </section>

      <section
        v-if="market.tacticCards?.length && categoryFilter === 'all'"
        class="mt-14"
        data-testid="market-tactic-cards"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 text-left"
          :aria-expanded="!isCollapsed('tacticCards')"
          @click="toggleCategory('tacticCards')"
        >
          <svg
            class="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200"
            :class="{ '-rotate-90': isCollapsed('tacticCards') }"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="section-label">{{ t('market.tacticCardsTitle') }}</span>
          <span class="text-[10px] text-ink-faint">({{ market.tacticCards.length }})</span>
        </button>
        <p class="mt-2 text-xs text-ink-muted">{{ t('market.tacticCardsHint') }}</p>

        <div v-show="!isCollapsed('tacticCards')" class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="card in market.tacticCards"
            :key="card.stockId"
            class="border bg-bg-soft p-6"
            :class="card.soldOut ? 'border-line opacity-60' : 'border-line'"
          >
            <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
              {{ t(`inventory.cardRarity.${card.rarity}`) }}
            </p>
            <h2 class="mt-3 font-display text-xl text-ink">{{ cardName(card) }}</h2>
            <p class="mt-3 text-sm leading-relaxed text-ink-muted">{{ cardDesc(card) }}</p>
            <p class="mt-2 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {{ t('market.cardBonusRange', { range: formatBonusRange(card, locale) }) }}
              · {{ t('market.cardChargesShop', { count: 5 }) }}
            </p>
            <p class="mt-4 text-xs text-ink-faint">
              {{ t('market.stock', { remaining: card.stockRemaining, initial: 1 }) }}
            </p>
            <p class="mt-4 text-base font-medium text-ink">{{ formatRyos(card.finalPrice) }}</p>
            <button
              type="button"
              class="btn-ghost mt-6 w-full disabled:opacity-40"
              :disabled="card.soldOut || !canBuyCard(card) || buyingId === card.stockId"
              @click="buyCard(card.stockId)"
            >
              {{
                card.soldOut
                  ? t('market.soldOut')
                  : buyingId === card.stockId
                    ? t('market.buying')
                    : t('market.buy')
              }}
            </button>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

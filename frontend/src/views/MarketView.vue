<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const market = ref(null)
const buyingId = ref(null)

const itemName = (item) => (locale.value === 'en' ? item.nameEn : item.nameFr)
const itemDesc = (item) => (locale.value === 'en' ? item.descriptionEn : item.descriptionFr)

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

const categoryOrder = ['bureau', 'match', 'cycle']

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

const canBuy = computed(() => (item) =>
  !item.soldOut &&
  !market.value?.debtBlocksSpending &&
  (market.value?.ryos ?? 0) >= item.finalPrice
)
</script>

<template>
  <div class="page-shell" data-testid="market-page">
    <header>
      <p class="page-kicker">{{ t('market.kicker') }}</p>
      <h1 class="page-title mt-3">{{ t('nav.market') }}</h1>
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

      <section
        v-for="cat in categoryOrder"
        :key="cat"
        class="mt-14"
      >
        <p class="section-label">{{ categoryLabel(cat) }}</p>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in groupedItems[cat] || []"
            :key="item.stockId"
            class="border border-line bg-bg-soft p-6"
            :class="{ 'opacity-60': item.soldOut }"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
                {{ categoryLabel(item.category) }}
              </p>
              <span
                v-if="item.onPromo"
                class="text-[10px] uppercase tracking-[0.12em] text-fire"
              >
                {{ t('market.promo', { pct: item.discountPct }) }}
              </span>
            </div>
            <h2 class="mt-3 font-display text-xl text-ink">{{ itemName(item) }}</h2>
            <p class="mt-3 text-sm leading-relaxed text-ink-muted">{{ itemDesc(item) }}</p>
            <p class="mt-2 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {{ t('market.situational') }} · {{ usageLabel(item) }}
            </p>
            <p class="mt-4 text-xs text-ink-faint">
              {{ t('market.stock', { remaining: item.stockRemaining, initial: item.stockInitial }) }}
            </p>
            <div class="mt-4 flex flex-wrap items-baseline gap-2">
              <p
                class="text-sm text-ink"
                :class="{ 'line-through text-ink-faint': item.onPromo }"
              >
                {{ item.basePrice.toLocaleString() }} Ryos
              </p>
              <p v-if="item.onPromo" class="text-sm font-medium text-fire">
                {{ item.finalPrice.toLocaleString() }} Ryos
              </p>
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
    </div>
  </div>
</template>

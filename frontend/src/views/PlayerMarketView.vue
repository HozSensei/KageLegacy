<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const market = ref(null)
const actingId = ref(null)

const itemName = (item) => (locale.value === 'en' ? item.nameEn : item.nameFr)
const categoryLabel = (cat) => t(`market.categories.${cat}`)

onMounted(fetchMarket)

async function fetchMarket() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/player-market`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function buy(listingId) {
  actingId.value = listingId
  try {
    const res = await fetch(`${API_BASE}/api/player-market/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    actingId.value = null
  }
}

async function cancel(listingId) {
  actingId.value = listingId
  try {
    const res = await fetch(`${API_BASE}/api/player-market/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    actingId.value = null
  }
}

function canBuy(listing) {
  return market.value?.windowOpen && (market.value?.ryos ?? 0) >= listing.price
}
</script>

<template>
  <div class="page-shell">
    <header>
      <p class="page-kicker">{{ t('exchanges.kicker') }}</p>
      <h1 class="page-title mt-3">{{ t('nav.exchanges') }}</h1>
      <p class="page-lead">{{ t('exchanges.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('exchanges.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="market">
      <div class="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-ink-muted">
        <p>{{ t('market.balance', { ryos: market.ryos.toLocaleString() }) }}</p>
        <p>{{ t('exchanges.commission', { pct: market.commissionPct }) }}</p>
        <p v-if="!market.windowOpen" class="text-fire">{{ t('exchanges.closed') }}</p>
      </div>

      <section class="mt-14">
        <p class="section-label">{{ t('exchanges.myListings') }}</p>
        <p class="mt-2 text-xs text-ink-faint">
          {{ t('exchanges.listingLimit', { current: market.myListings.length, max: market.maxListings }) }}
        </p>
        <ul class="mt-6 space-y-3">
          <li
            v-for="listing in market.myListings"
            :key="listing.id"
            class="flex flex-wrap items-center justify-between gap-4 border border-line p-4"
          >
            <div>
              <p class="text-sm text-ink">{{ itemName(listing) }}</p>
              <p class="mt-1 text-xs text-ink-faint">
                {{ categoryLabel(listing.category) }} · {{ listing.price.toLocaleString() }} Ryos
              </p>
            </div>
            <button
              type="button"
              class="btn-ghost"
              :disabled="actingId === listing.id"
              @click="cancel(listing.id)"
            >
              {{ actingId === listing.id ? t('exchanges.cancelling') : t('exchanges.cancel') }}
            </button>
          </li>
          <li v-if="!market.myListings.length" class="text-sm text-ink-muted">
            {{ t('exchanges.noMyListings') }}
          </li>
        </ul>
      </section>

      <section class="mt-14">
        <p class="section-label">{{ t('exchanges.poolListings') }}</p>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="listing in market.listings"
            :key="listing.id"
            class="border border-line bg-bg-soft p-6"
          >
            <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
              {{ categoryLabel(listing.category) }}
            </p>
            <h2 class="mt-3 font-display text-xl text-ink">{{ itemName(listing) }}</h2>
            <p class="mt-3 text-xs text-ink-faint">
              {{ t('exchanges.seller', { name: listing.sellerName }) }}
            </p>
            <p class="mt-4 text-sm text-ink">{{ listing.price.toLocaleString() }} Ryos</p>
            <p class="mt-1 text-xs text-ink-faint">
              {{ t('exchanges.catalogRef', { price: listing.catalogPrice.toLocaleString() }) }}
            </p>
            <button
              type="button"
              class="btn-ghost mt-6 w-full disabled:opacity-40"
              :disabled="!canBuy(listing) || actingId === listing.id"
              @click="buy(listing.id)"
            >
              {{
                actingId === listing.id
                  ? t('exchanges.buying')
                  : !market.windowOpen
                    ? t('exchanges.closed')
                    : t('exchanges.buy')
              }}
            </button>
          </article>
          <p v-if="!market.listings.length" class="text-sm text-ink-muted sm:col-span-2 lg:col-span-3">
            {{ t('exchanges.empty') }}
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

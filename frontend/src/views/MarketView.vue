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

async function buy(offerId) {
  buyingId.value = offerId
  try {
    const res = await fetch(`${API_BASE}/api/market/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    market.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    buyingId.value = null
  }
}

const canBuy = computed(() => (offer) => !offer.purchased && (market.value?.ryos ?? 0) >= offer.price)
</script>

<template>
  <div class="page-shell">
    <header>
      <p class="page-kicker">{{ t('market.kicker') }}</p>
      <h1 class="page-title mt-3">{{ t('nav.market') }}</h1>
      <p class="page-lead">{{ t('market.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('market.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="market">
      <p class="mt-10 text-sm text-ink-muted">
        {{ t('market.balance', { ryos: market.ryos.toLocaleString() }) }}
      </p>

      <div class="mt-12 grid gap-6 md:grid-cols-3">
        <article
          v-for="offer in market.offers"
          :key="offer.id"
          class="border border-line bg-bg-soft p-6"
          :class="{ 'opacity-60': offer.purchased }"
        >
          <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
            {{ categoryLabel(offer.category) }}
          </p>
          <h2 class="mt-3 font-display text-xl text-ink">{{ itemName(offer) }}</h2>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">{{ itemDesc(offer) }}</p>
          <p class="mt-6 text-sm text-ink">{{ offer.price.toLocaleString() }} Ryos</p>

          <button
            type="button"
            class="btn-ghost mt-6 w-full disabled:opacity-40"
            :disabled="offer.purchased || !canBuy(offer) || buyingId === offer.id"
            @click="buy(offer.id)"
          >
            {{
              offer.purchased
                ? t('market.purchased')
                : buyingId === offer.id
                  ? t('market.buying')
                  : t('market.buy')
            }}
          </button>
        </article>
      </div>
    </template>
  </div>
</template>

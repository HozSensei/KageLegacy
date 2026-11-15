<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatRyos } from '../composables/useFormatRyos'
import { formatBonusRange, formatInstanceBonusPct } from '../utils/techniqueCardBonus.js'

const { t, locale } = useI18n()
const { formatRyos } = useFormatRyos()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const payload = ref(null)
const selectedId = ref(null)
const refiningId = ref(null)
const lastResult = ref(null)

const cardName = (card) => (locale.value === 'en' ? card.nameEn : card.nameFr)
const cardDesc = (card) => (locale.value === 'en' ? card.descriptionEn : card.descriptionFr)

const eligibleCards = computed(() =>
  (payload.value?.tacticCards || []).filter((card) => card.canRefine)
)

const selectedCard = computed(() =>
  eligibleCards.value.find((card) => card.userTacticCardId === selectedId.value) ?? null
)

function canRefineCard(card) {
  if (!card?.canRefine) return false
  if (payload.value?.debtBlocksSpending) return false
  return (payload.value?.ryos ?? 0) >= (card.refineCost ?? 0)
}

function selectCard(card) {
  if (!card.canRefine) return
  selectedId.value = card.userTacticCardId
  lastResult.value = null
}

function formatPctValue(pct) {
  if (pct == null) return '—'
  return `+${Math.round(pct * 100)}%`
}

onMounted(fetchPayload)

async function fetchPayload() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/technique-refinement`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    payload.value = await res.json()
    if (!selectedId.value && eligibleCards.value.length) {
      selectedId.value = eligibleCards.value[0].userTacticCardId
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function refineSelected() {
  const card = selectedCard.value
  if (!card || !canRefineCard(card)) return

  refiningId.value = card.userTacticCardId
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/technique-refinement/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userTacticCardId: card.userTacticCardId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    payload.value = data
    lastResult.value = data.refinement
    selectedId.value = data.refinement?.userTacticCardId ?? card.userTacticCardId
  } catch (e) {
    error.value = e.message
  } finally {
    refiningId.value = null
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="refinement-page">
    <header>
      <p class="text-[10px] uppercase tracking-[0.14em] text-accent">{{ t('techniqueRefinement.subtitle') }}</p>
      <p class="page-lead mt-2">{{ t('techniqueRefinement.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('techniqueRefinement.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <div v-else-if="payload">
      <div class="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-ink-muted">
        <p>{{ t('techniqueRefinement.balance', { ryos: payload.ryos.toLocaleString() }) }}</p>
        <p v-if="payload.heritageDiscountPct">
          {{ t('techniqueRefinement.heritageDiscount', { pct: payload.heritageDiscountPct }) }}
        </p>
      </div>
      <p v-if="payload.debtBlocksSpending" class="mt-4 text-sm text-fire">
        {{ t('techniqueRefinement.debtBlocked') }}
      </p>

      <p v-if="!eligibleCards.length" class="mt-10 text-sm text-ink-muted">
        {{ t('techniqueRefinement.empty') }}
      </p>

      <div v-else class="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul class="space-y-3">
          <li
            v-for="card in payload.tacticCards"
            :key="card.userTacticCardId"
            class="border p-4 transition"
            :class="[
              card.userTacticCardId === selectedId
                ? 'border-accent bg-bg-soft'
                : card.canRefine
                  ? 'cursor-pointer border-line hover:border-ink-faint'
                  : 'border-line/80 bg-bg-soft/50 opacity-70',
            ]"
            @click="selectCard(card)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-sm text-ink">{{ cardName(card) }}</p>
              <span
                v-if="card.isListed"
                class="shrink-0 rounded-sm border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-faint"
              >
                {{ t('inventory.listed') }}
              </span>
            </div>
            <p class="mt-1 text-xs text-ink-faint">
              {{ t(`inventory.cardRarity.${card.rarity}`) }}
              · {{ t('inventory.cardCharges', { count: card.chargesRemaining }) }}
              · {{ t('techniqueRefinement.bonusKept', { bonus: formatInstanceBonusPct(card) }) }}
            </p>
            <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ cardDesc(card) }}</p>
            <p class="mt-2 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {{ t('techniqueRefinement.bonusRange', { range: formatBonusRange(card, locale) }) }}
            </p>
            <p v-if="card.canRefine" class="mt-2 text-xs text-ink-muted">
              {{ t('techniqueRefinement.cost', { price: formatRyos(card.refineCost) }) }}
            </p>
            <p v-else class="mt-2 text-xs text-fire">{{ t('techniqueRefinement.listedBlocked') }}</p>
          </li>
        </ul>

        <aside
          v-if="selectedCard"
          class="h-fit border border-accent/30 bg-accent/5 p-6"
          data-testid="refinement-panel"
        >
          <p class="section-label">{{ cardName(selectedCard) }}</p>
          <p class="mt-3 text-sm text-ink-muted">
            {{ t('techniqueRefinement.bonusKept', { bonus: formatInstanceBonusPct(selectedCard) }) }}
          </p>
          <p class="mt-1 text-xs text-ink-faint">
            {{ t('techniqueRefinement.bonusRange', { range: formatBonusRange(selectedCard, locale) }) }}
          </p>
          <p class="mt-4 text-base font-medium text-ink">
            {{ t('techniqueRefinement.cost', { price: formatRyos(selectedCard.refineCost) }) }}
          </p>
          <button
            type="button"
            class="btn-primary mt-6 w-full disabled:opacity-40"
            :disabled="!canRefineCard(selectedCard) || refiningId === selectedCard.userTacticCardId"
            data-testid="refinement-submit"
            @click="refineSelected"
          >
            {{
              refiningId === selectedCard.userTacticCardId
                ? t('techniqueRefinement.refining')
                : t('techniqueRefinement.action')
            }}
          </button>
          <p
            v-if="lastResult && lastResult.userTacticCardId === selectedCard.userTacticCardId"
            class="mt-4 text-sm text-accent"
            data-testid="refinement-result"
          >
            {{
              t('techniqueRefinement.success', {
                previous: formatPctValue(lastResult.previousBonusPct),
                next: formatPctValue(lastResult.newBonusPct),
              })
            }}
          </p>
        </aside>
      </div>
    </div>
  </div>
</template>

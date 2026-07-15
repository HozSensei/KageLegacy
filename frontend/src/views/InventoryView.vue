<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import NinjaListIdentity from '../components/ninja/NinjaListIdentity.vue'
import { useCategoryCollapse } from '../composables/useCategoryCollapse.js'
import { formatInstanceBonusPct } from '../utils/techniqueCardBonus.js'

import { useSquadStore } from '../stores/squad'

const { t, locale } = useI18n()
const squadStore = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const inventory = ref(null)
const selectedItemId = ref(null)
const selectedCardId = ref(null)
const saving = ref(false)
const sellItemId = ref(null)
const sellCardId = ref(null)
const sellPrice = ref('')
const selling = ref(false)
const useMessage = ref(null)
const deckActionMessage = ref(null)
const itemStatusFilter = ref('all')
const cardStatusFilter = ref('all')

const INVENTORY_CATEGORIES = ['bureau']
const ITEM_STATUS_FILTERS = ['all', 'available', 'listed']
const CARD_STATUS_FILTERS = ['all', 'available', 'listed']

const { toggle: toggleCategory, isCollapsed } = useCategoryCollapse(
  [...INVENTORY_CATEGORIES, 'tacticCards']
)

const itemName = (item) => (locale.value === 'en' ? item.name_en : item.name_fr)
const itemDesc = (item) => (locale.value === 'en' ? item.description_en : item.description_fr)
const cardName = (card) => (locale.value === 'en' ? card.nameEn : card.nameFr)
const cardDesc = (card) => (locale.value === 'en' ? card.descriptionEn : card.descriptionFr)

function usageLabel(item) {
  if (item.category === 'bureau') return t('market.bureauOnce')
  const limit = item.usageLimits?.[0]
  if (!limit) return t('market.consumableOnce')
  return t('market.usesPerMatch', { count: limit.uses })
}

function cardInstanceId(card) {
  const raw = card?.userTacticCardId ?? card?.id
  return raw == null ? null : Number(raw)
}

function isCardSelected(card) {
  return selectedCardId.value != null && cardInstanceId(card) === selectedCardId.value
}

function selectCard(card) {
  selectedCardId.value = cardInstanceId(card)
  selectedItemId.value = null
  deckActionMessage.value = null
}

const selectedCard = computed(() =>
  (inventory.value?.tacticCards || []).find((card) => isCardSelected(card)) ?? null
)

function cardChargesLabel(card) {
  return t('inventory.cardCharges', { count: card.chargesRemaining })
}

function cardBonusLabel(card) {
  if (card.pliBonusPct == null) return ''
  return t('inventory.cardBonusRolled', { bonus: formatInstanceBonusPct(card) })
}

function normalizeInventory(payload) {
  if (!payload) return payload
  return {
    ...payload,
    tacticCards: (payload.tacticCards || []).map((card) => {
      const userTacticCardId = cardInstanceId(card)
      return { ...card, id: userTacticCardId, userTacticCardId }
    }),
  }
}

function applyInventory(payload) {
  inventory.value = normalizeInventory(payload)
}

function isGlobalBureauItem(item) {
  return item?.slug === 'carte-secteur' || item?.slug === 'sceau-chakra'
}

const selectedItem = computed(
  () => inventory.value?.items.find((item) => item.id === selectedItemId.value) ?? null
)

function bureauEligibilityFor(ninja, itemId = selectedItemId.value) {
  if (!ninja?.bureauEligibility || itemId == null) return null
  return ninja.bureauEligibility[itemId] ?? null
}

function globalBureauEligibility(itemId = selectedItemId.value) {
  if (!inventory.value?.globalBureauEligibility || itemId == null) return null
  return inventory.value.globalBureauEligibility[itemId] ?? null
}

function useBlockedMessage(eligibility) {
  if (!eligibility?.reasonCode) return null
  const key = `inventory.useBlocked.${eligibility.reasonCode}`
  const translated = t(key)
  return translated === key ? eligibility.reason : translated
}

function canUseOnNinja(ninja) {
  const eligibility = bureauEligibilityFor(ninja)
  return eligibility?.eligible === true
}

const canUseGlobalBureau = computed(() => globalBureauEligibility()?.eligible === true)

const globalUseBlockedMessage = computed(() => useBlockedMessage(globalBureauEligibility()))

const selectedItemEligibleNinjaCount = computed(() => {
  if (!selectedItemId.value || !inventory.value?.ninjas) return 0
  return inventory.value.ninjas.filter((ninja) => canUseOnNinja(ninja)).length
})

function isBureauItem(item) {
  return item?.category === 'bureau'
}

function canSellItem(item) {
  return item && !item.isListed && !item.nonVendable
}

function canSellCard(card) {
  return card && !card.isListed
}

function matchesItemStatus(item, status) {
  if (status === 'available') return !item.isListed
  if (status === 'listed') return Boolean(item.isListed)
  return true
}

function matchesCardStatus(card, status) {
  if (status === 'available') return !card.isListed
  if (status === 'listed') return Boolean(card.isListed)
  return true
}

const filteredItems = computed(() => {
  const items = inventory.value?.items || []
  return items.filter((item) => matchesItemStatus(item, itemStatusFilter.value))
})

const visibleItemCategories = computed(() =>
  INVENTORY_CATEGORIES.filter((category) =>
    filteredItems.value.some((item) => item.category === category)
  )
)

function itemsForCategory(category) {
  return filteredItems.value.filter((item) => item.category === category)
}

const filteredCards = computed(() => {
  const cards = inventory.value?.tacticCards || []
  return cards.filter((card) => matchesCardStatus(card, cardStatusFilter.value))
})

function itemCountForStatus(status) {
  return (inventory.value?.items || []).filter((item) => matchesItemStatus(item, status)).length
}

function cardCountForStatus(status) {
  return (inventory.value?.tacticCards || []).filter((card) => matchesCardStatus(card, status)).length
}

function sellPriceBounds(catalogPrice) {
  const catalog = catalogPrice ?? 0
  return {
    floor: Math.floor((catalog * 50) / 100),
    ceiling: Math.ceil((catalog * 200) / 100),
  }
}

function openSell(item) {
  sellItemId.value = item.id
  sellCardId.value = null
  const { floor } = sellPriceBounds(item.catalog_price)
  sellPrice.value = String(floor || 1)
  selectedItemId.value = null
  selectedCardId.value = null
}

function openSellCard(card) {
  sellCardId.value = cardInstanceId(card)
  sellItemId.value = null
  const { floor } = sellPriceBounds(card.catalogPrice)
  sellPrice.value = String(floor || 1)
  selectedItemId.value = null
  selectedCardId.value = null
}

function closeSell() {
  sellItemId.value = null
  sellCardId.value = null
  sellPrice.value = ''
}

async function submitSell() {
  selling.value = true
  error.value = null
  try {
    const isCard = Boolean(sellCardId.value)
    const res = await fetch(
      `${API_BASE}/api/player-market/${isCard ? 'list-card' : 'list'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCard
            ? { userTacticCardId: sellCardId.value, price: Number(sellPrice.value) }
            : { userItemId: sellItemId.value, price: Number(sellPrice.value) }
        ),
      }
    )
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    closeSell()
    await fetchInventory()
  } catch (e) {
    error.value = e.message
  } finally {
    selling.value = false
  }
}

function sellItem() {
  return inventory.value?.items.find((i) => i.id === sellItemId.value)
}

function sellCard() {
  return inventory.value?.tacticCards?.find((c) => cardInstanceId(c) === sellCardId.value)
}

onMounted(fetchInventory)

async function fetchInventory() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    applyInventory(await res.json())
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatUseResult(result) {
  if (!result) return null
  if (result.effect === 'dispensary_heal' || result.effect === 'forme_upgrade') {
    return t('inventory.useFormeResult', {
      from: t(`formes.${result.previousForme || result.from}`),
      to: t(`formes.${result.newForme || result.to}`),
    })
  }
  if (result.effect === 'pv_heal') {
    return t('inventory.usePvHealResult', { amount: result.healed })
  }
  if (result.effect === 'training_boost') {
    return t('inventory.useTrainingBoostResult')
  }
  return t('inventory.useSuccess')
}

async function useOnNinja(ninjaId) {
  if (!selectedItemId.value) return
  const ninja = inventory.value?.ninjas.find((row) => row.id === ninjaId)
  const eligibility = bureauEligibilityFor(ninja)
  if (!eligibility?.eligible) {
    error.value = useBlockedMessage(eligibility) || t('inventory.useBlocked.unsupportedItem')
    return
  }
  saving.value = true
  error.value = null
  useMessage.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId, userItemId: selectedItemId.value }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    const data = await res.json()
    applyInventory(data)
    useMessage.value = formatUseResult(data.result)
    selectedItemId.value = null
    if (squadStore.sensei) await squadStore.fetchSquad()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function useGlobalBureau() {
  if (!selectedItemId.value) return
  const eligibility = globalBureauEligibility()
  if (!eligibility?.eligible) {
    error.value = useBlockedMessage(eligibility) || t('inventory.useBlocked.unsupportedItem')
    return
  }
  saving.value = true
  error.value = null
  useMessage.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userItemId: selectedItemId.value }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    applyInventory(await res.json())
    selectedItemId.value = null
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="inventory-page">
    <header>
      <p class="page-lead">{{ t('inventory.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('inventory.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>
    <p v-else-if="useMessage" class="mt-12 text-sm text-accent">{{ useMessage }}</p>

    <div v-else-if="inventory" class="mt-12 lg:grid lg:grid-cols-12 lg:gap-10" data-testid="inventory-content">
      <section class="lg:col-span-5">
        <p class="section-label">{{ t('inventory.items') }}</p>
        <p v-if="selectedItemId" class="mt-2 text-xs text-accent">{{ t('inventory.selectNinja') }}</p>
        <p
          v-if="selectedItem && isBureauItem(selectedItem) && !isGlobalBureauItem(selectedItem) && selectedItemEligibleNinjaCount === 0"
          class="mt-2 text-xs text-fire"
        >
          {{ t('inventory.noEligibleNinja') }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="status in ITEM_STATUS_FILTERS"
            :key="`status-${status}`"
            type="button"
            class="rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition"
            :class="
              itemStatusFilter === status
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-ink-faint hover:border-ink-faint'
            "
            @click="itemStatusFilter = status"
          >
            {{ t(`inventory.filterStatus.${status}`) }}
            <span class="ml-1 opacity-70">({{ itemCountForStatus(status) }})</span>
          </button>
        </div>

        <div
          v-for="category in visibleItemCategories"
          :key="`inv-cat-${category}`"
          class="mt-6"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 text-left"
            :aria-expanded="!isCollapsed(category)"
            @click="toggleCategory(category)"
          >
            <svg
              class="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200"
              :class="{ '-rotate-90': isCollapsed(category) }"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="section-label">{{ t(`market.categories.${category}`) }}</span>
            <span class="text-[10px] text-ink-faint">({{ itemsForCategory(category).length }})</span>
          </button>

          <ul v-show="!isCollapsed(category)" class="mt-4 space-y-3">
            <li
              v-for="item in itemsForCategory(category)"
              :key="item.id"
              class="cursor-pointer border p-4 transition"
              :class="[
                selectedItemId === item.id
                  ? 'border-accent bg-bg-soft'
                  : item.isListed
                    ? 'border-line/80 bg-bg-soft/50 hover:border-ink-faint'
                    : 'border-line hover:border-ink-faint',
              ]"
              @click="selectedItemId = item.id; selectedCardId = null"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <p class="text-sm text-ink">{{ itemName(item) }}</p>
                <span
                  v-if="item.isListed"
                  class="shrink-0 rounded-sm border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-faint"
                >
                  {{ t('inventory.listed') }}
                </span>
              </div>
              <p v-if="itemDesc(item)" class="mt-2 text-xs leading-relaxed text-ink-muted">
                {{ itemDesc(item) }}
              </p>
              <p class="mt-2 text-xs text-ink-faint">
                {{ t(`market.categories.${item.category}`) }} · {{ usageLabel(item) }}
              </p>
              <p v-if="item.nonVendable && !item.isListed" class="mt-1 text-xs text-ink-faint">
                {{ t('inventory.nonVendable') }}
              </p>
              <button
                v-if="canSellItem(item)"
                type="button"
                class="btn-ghost mt-3 text-xs"
                @click.stop="openSell(item)"
              >
                {{ t('inventory.sell') }}
              </button>
            </li>
          </ul>
        </div>

        <p v-if="!filteredItems.length" class="mt-6 text-sm text-ink-muted">
          {{ inventory.items.length ? t('inventory.emptyFilter') : t('inventory.empty') }}
        </p>

        <div class="mt-6">
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
            <span class="section-label">{{ t('inventory.tacticCards') }}</span>
            <span class="text-[10px] text-ink-faint">({{ filteredCards.length }})</span>
          </button>
        </div>
        <p v-if="selectedCardId" class="mt-2 text-xs leading-relaxed text-ink-muted">
          {{ t('inventory.cardDeckHint') }}
        </p>
        <div
          v-if="selectedCard && !selectedCard.isListed"
          class="mt-4 flex flex-wrap items-center gap-3 border border-accent/30 bg-accent/5 p-4"
        >
          <RouterLink to="/squad" class="btn-primary text-xs" data-testid="inventory-open-squad-deck">
            {{ t('inventory.openSquadDeck') }}
          </RouterLink>
          <RouterLink to="/refinement" class="btn-ghost text-xs" data-testid="inventory-open-refinement">
            {{ t('nav.refinement') }}
          </RouterLink>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="status in CARD_STATUS_FILTERS"
            :key="`card-${status}`"
            type="button"
            class="rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition"
            :class="
              cardStatusFilter === status
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-ink-faint hover:border-ink-faint'
            "
            @click="cardStatusFilter = status"
          >
            {{ t(`inventory.filterStatus.${status}`) }}
            <span class="ml-1 opacity-70">({{ cardCountForStatus(status) }})</span>
          </button>
        </div>

        <ul v-show="!isCollapsed('tacticCards')" class="mt-6 space-y-3">
          <li
            v-for="card in filteredCards"
            :key="`card-${cardInstanceId(card)}`"
            class="cursor-pointer border p-4 transition"
            :class="[
              isCardSelected(card)
                ? 'border-accent bg-bg-soft'
                : card.isListed
                  ? 'border-line/80 bg-bg-soft/50 hover:border-ink-faint'
                  : 'border-line hover:border-ink-faint',
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
              {{ t(`inventory.cardRarity.${card.rarity}`) }} · {{ cardChargesLabel(card) }}
              <span v-if="cardBonusLabel(card)"> · {{ cardBonusLabel(card) }}</span>
            </p>
            <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ cardDesc(card) }}</p>
            <p v-if="!card.isListed" class="mt-1 text-xs text-ink-faint">
              {{ t('inventory.deckPoolHint') }}
            </p>
            <button
              v-if="canSellCard(card)"
              type="button"
              class="btn-ghost mt-3 text-xs"
              @click.stop="openSellCard(card)"
            >
              {{ t('inventory.sell') }}
            </button>
          </li>
          <li v-if="!filteredCards.length" class="text-sm text-ink-muted">
            {{ inventory.tacticCards?.length ? t('inventory.emptyFilter') : t('inventory.emptyCards') }}
          </li>
        </ul>

        <button
          v-if="selectedItemId && isGlobalBureauItem(selectedItem)"
          type="button"
          class="btn-primary mt-6"
          :disabled="saving || !canUseGlobalBureau"
          @click="useGlobalBureau"
        >
          {{ t('inventory.use') }}
        </button>
        <p v-if="selectedItemId && isGlobalBureauItem(selectedItem) && globalUseBlockedMessage" class="mt-2 text-xs text-fire">
          {{ globalUseBlockedMessage }}
        </p>
      </section>

      <section class="mt-10 border-t border-line pt-10 lg:col-span-7 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
        <p class="section-label">{{ t('inventory.ninjas') }}</p>
        <ul class="mt-6 space-y-4">
          <li
            v-for="ninja in inventory.ninjas"
            :key="ninja.id"
            class="border border-line p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <NinjaListIdentity :ninja="ninja" />
                <p class="mt-2 text-xs text-ink-faint">
                  {{ ninja.squad_position ? t('inventory.active') : t('inventory.bench') }}
                  · {{ t(`formes.${ninja.weekly_forme || 'Passable'}`) }}
                  <span v-if="Number(ninja.forme_lock_cycles) > 0" class="text-fire">
                    — {{ t('inventory.medLock') }}
                  </span>
                </p>
              </div>
              <div class="flex min-w-[8rem] flex-col items-end gap-1">
                <template v-if="selectedItemId && isBureauItem(selectedItem) && !isGlobalBureauItem(selectedItem)">
                  <button
                    type="button"
                    class="btn-ghost"
                    :disabled="saving || !canUseOnNinja(ninja)"
                    @click="useOnNinja(ninja.id)"
                  >
                    {{ t('inventory.use') }}
                  </button>
                  <p
                    v-if="bureauEligibilityFor(ninja) && !bureauEligibilityFor(ninja).eligible"
                    class="max-w-xs text-right text-[10px] leading-snug text-fire"
                  >
                    {{ useBlockedMessage(bureauEligibilityFor(ninja)) }}
                  </p>
                </template>
              </div>
            </div>
            <p
              v-if="ninja.training_buff === 'strategy_book'"
              class="mt-2 text-xs text-accent"
            >
              {{ t('ninja.strategyBookBuff') }}
            </p>
            <p
              v-else-if="ninja.training_buff === 'training_weights'"
              class="mt-2 text-xs text-accent"
            >
              {{ t('ninja.trainingWeightsBuff') }}
            </p>
          </li>
        </ul>
      </section>
    </div>

    <div
      v-if="(sellItemId && sellItem()) || (sellCardId && sellCard())"
      class="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm"
      @click.self="closeSell"
    >
      <div class="w-full max-w-md border border-line bg-bg p-6 shadow-lg">
        <p class="section-label">{{ t('inventory.sellTitle') }}</p>
        <p class="mt-3 text-sm text-ink">
          {{ sellCard() ? cardName(sellCard()) : itemName(sellItem()) }}
        </p>
        <p class="mt-2 text-xs text-ink-faint">
          {{
            t(
              'inventory.sellHint',
              sellPriceBounds(sellCard()?.catalogPrice ?? sellItem()?.catalog_price)
            )
          }}
        </p>
        <label class="mt-6 block text-xs uppercase tracking-[0.12em] text-ink-faint">
          {{ t('inventory.sellPrice') }}
          <input
            v-model="sellPrice"
            type="number"
            class="mt-2 w-full border border-line bg-bg-soft px-3 py-2 text-sm text-ink"
            :min="sellPriceBounds(sellCard()?.catalogPrice ?? sellItem()?.catalog_price).floor"
            :max="sellPriceBounds(sellCard()?.catalogPrice ?? sellItem()?.catalog_price).ceiling"
          />
        </label>
        <div class="mt-6 flex gap-3">
          <button type="button" class="btn-ghost flex-1" :disabled="selling" @click="closeSell">
            {{ t('inventory.sellCancel') }}
          </button>
          <button type="button" class="btn-primary flex-1" :disabled="selling" @click="submitSell">
            {{ selling ? t('inventory.selling') : t('inventory.sellConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

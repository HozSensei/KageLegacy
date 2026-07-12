<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NinjaListIdentity from '../components/ninja/NinjaListIdentity.vue'
import { useCategoryCollapse } from '../composables/useCategoryCollapse.js'

const { t, locale } = useI18n()
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
const itemCategoryFilter = ref('all')
const itemStatusFilter = ref('all')
const cardStatusFilter = ref('all')

const ITEM_CATEGORY_FILTERS = ['all', 'bureau', 'match', 'cycle']
const ITEM_STATUS_FILTERS = ['all', 'equipped', 'available', 'listed']
const CARD_STATUS_FILTERS = ['all', 'equipped', 'available', 'listed']
const INVENTORY_CATEGORIES = ['bureau', 'match', 'cycle']

const { toggle: toggleCategory, isCollapsed } = useCategoryCollapse(
  [...INVENTORY_CATEGORIES, 'tacticCards']
)

const itemName = (item) => (locale.value === 'en' ? item.name_en : item.name_fr)
const itemDesc = (item) => (locale.value === 'en' ? item.description_en : item.description_fr)
const cardName = (card) => (locale.value === 'en' ? card.nameEn : card.nameFr)
const cardDesc = (card) => (locale.value === 'en' ? card.descriptionEn : card.descriptionFr)

function usageLabel(item) {
  if (item.category === 'bureau') return t('market.bureauOnce')
  if (item.category === 'cycle') return t('market.cycleItem')
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
}

function cardChargesLabel(card) {
  return t('inventory.cardCharges', { count: card.chargesRemaining })
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
  return item?.slug === 'carte-secteur'
}

function isBureauItem(item) {
  return item?.category === 'bureau'
}

function canEquipItem(item) {
  return item?.category === 'match' || item?.category === 'cycle'
}

function canSellItem(item) {
  return item && !item.equipped_ninja_name && !item.isListed && !item.nonVendable
}

function canSellCard(card) {
  return card && !card.equippedNinjaId && !card.isListed
}

function isItemEquipped(item) {
  return Boolean(item?.equipped_ninja_name)
}

function isCardEquipped(card) {
  return Boolean(card?.equippedNinjaName)
}

function matchesItemStatus(item, status) {
  if (status === 'equipped') return isItemEquipped(item)
  if (status === 'available') return !isItemEquipped(item) && !item.isListed
  if (status === 'listed') return Boolean(item.isListed)
  return true
}

function matchesCardStatus(card, status) {
  if (status === 'equipped') return isCardEquipped(card)
  if (status === 'available') return !isCardEquipped(card) && !card.isListed
  if (status === 'listed') return Boolean(card.isListed)
  return true
}

const filteredItems = computed(() => {
  const items = inventory.value?.items || []
  return items.filter((item) => {
    if (itemCategoryFilter.value !== 'all' && item.category !== itemCategoryFilter.value) {
      return false
    }
    return matchesItemStatus(item, itemStatusFilter.value)
  })
})

const visibleItemCategories = computed(() =>
  INVENTORY_CATEGORIES.filter((category) => {
    if (itemCategoryFilter.value !== 'all' && itemCategoryFilter.value !== category) {
      return false
    }
    return filteredItems.value.some((item) => item.category === category)
  })
)

function itemsForCategory(category) {
  return filteredItems.value.filter((item) => item.category === category)
}

const filteredCards = computed(() => {
  const cards = inventory.value?.tacticCards || []
  return cards.filter((card) => matchesCardStatus(card, cardStatusFilter.value))
})

function itemCountForCategory(category) {
  const items = inventory.value?.items || []
  if (category === 'all') return items.length
  return items.filter((item) => item.category === category).length
}

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

async function equip(ninjaId) {
  if (!selectedItemId.value) return
  saving.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId, userItemId: selectedItemId.value }),
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

async function equipCard(ninjaId) {
  if (!selectedCardId.value) return
  saving.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/equip-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId, userTacticCardId: selectedCardId.value }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    applyInventory(await res.json())
    selectedCardId.value = null
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function useOnNinja(ninjaId) {
  if (!selectedItemId.value) return
  saving.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId, userItemId: selectedItemId.value }),
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

async function useGlobalBureau() {
  if (!selectedItemId.value) return
  saving.value = true
  error.value = null
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

async function unequip(ninjaId, slot) {
  saving.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/unequip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId, slot }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    applyInventory(await res.json())
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function unequipCard(ninjaId) {
  saving.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory/unequip-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    applyInventory(await res.json())
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

    <div v-else-if="inventory" class="mt-12 lg:grid lg:grid-cols-12 lg:gap-10" data-testid="inventory-content">
      <section class="lg:col-span-5">
        <p class="section-label">{{ t('inventory.items') }}</p>
        <p v-if="selectedItemId" class="mt-2 text-xs text-accent">{{ t('inventory.selectNinja') }}</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="cat in ITEM_CATEGORY_FILTERS"
            :key="`cat-${cat}`"
            type="button"
            class="rounded-sm border px-2.5 py-1 text-xs uppercase tracking-[0.12em] transition"
            :class="
              itemCategoryFilter === cat
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-ink-faint hover:border-ink-faint'
            "
            @click="itemCategoryFilter = cat"
          >
            {{ t(`inventory.filterCategory.${cat}`) }}
            <span class="ml-1 opacity-70">({{ itemCountForCategory(cat) }})</span>
          </button>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="status in ITEM_STATUS_FILTERS"
            :key="`status-${status}`"
            type="button"
            class="rounded-sm border px-2.5 py-1 text-xs uppercase tracking-[0.12em] transition"
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
            <span class="text-xs text-ink-faint">({{ itemsForCategory(category).length }})</span>
          </button>

          <ul v-show="!isCollapsed(category)" class="mt-4 space-y-3">
            <li
              v-for="item in itemsForCategory(category)"
              :key="item.id"
              class="cursor-pointer border p-4 transition"
              :class="[
                selectedItemId === item.id
                  ? 'border-accent bg-bg-soft'
                  : isItemEquipped(item)
                    ? 'border-accent/40 border-l-4 bg-accent/5 hover:border-accent/60'
                    : item.isListed
                      ? 'border-line/80 bg-bg-soft/50 hover:border-ink-faint'
                      : 'border-line hover:border-ink-faint',
              ]"
              @click="selectedItemId = item.id; selectedCardId = null"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <p class="text-sm text-ink">{{ itemName(item) }}</p>
                <span
                  v-if="isItemEquipped(item)"
                  class="shrink-0 rounded-sm border border-accent/50 bg-accent/15 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-accent"
                >
                  {{ t('inventory.equippedBadge', { name: item.equipped_ninja_name }) }}
                </span>
                <span
                  v-else-if="item.isListed"
                  class="shrink-0 rounded-sm border border-line px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-ink-faint"
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
              <p v-if="item.nonVendable && !isItemEquipped(item) && !item.isListed" class="mt-1 text-xs text-ink-faint">
                {{ t('inventory.nonVendable') }}
              </p>
              <p v-else-if="!isItemEquipped(item) && !item.isListed && !item.nonVendable" class="mt-1 text-xs text-ink-faint">
                {{ t('inventory.unequipped') }}
              </p>
              <button
                v-if="canSellItem(item)"
                type="button"
                class="btn-ghost mt-3"
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
            <span class="text-xs text-ink-faint">({{ filteredCards.length }})</span>
          </button>
        </div>
        <p v-if="selectedCardId" class="mt-2 text-xs text-accent">{{ t('inventory.selectNinjaCard') }}</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="status in CARD_STATUS_FILTERS"
            :key="`card-${status}`"
            type="button"
            class="rounded-sm border px-2.5 py-1 text-xs uppercase tracking-[0.12em] transition"
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
                : isCardEquipped(card)
                  ? 'border-accent/40 border-l-4 bg-accent/5 hover:border-accent/60'
                  : card.isListed
                    ? 'border-line/80 bg-bg-soft/50 hover:border-ink-faint'
                    : 'border-line hover:border-ink-faint',
            ]"
            @click="selectCard(card)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-sm text-ink">{{ cardName(card) }}</p>
              <span
                v-if="isCardEquipped(card)"
                class="shrink-0 rounded-sm border border-accent/50 bg-accent/15 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-accent"
              >
                {{ t('inventory.equippedBadge', { name: card.equippedNinjaName }) }}
              </span>
              <span
                v-else-if="card.isListed"
                class="shrink-0 rounded-sm border border-line px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-ink-faint"
              >
                {{ t('inventory.listed') }}
              </span>
            </div>
            <p class="mt-1 text-xs text-ink-faint">
              {{ t(`inventory.cardRarity.${card.rarity}`) }} · {{ cardChargesLabel(card) }}
            </p>
            <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ cardDesc(card) }}</p>
            <p v-if="!isCardEquipped(card) && !card.isListed" class="mt-1 text-xs text-ink-faint">
              {{ t('inventory.unequipped') }}
            </p>
            <button
              v-if="canSellCard(card)"
              type="button"
              class="btn-ghost mt-3"
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
          v-if="selectedItemId && isGlobalBureauItem(inventory.items.find((i) => i.id === selectedItemId))"
          type="button"
          class="btn-primary mt-6"
          :disabled="saving"
          @click="useGlobalBureau"
        >
          {{ t('inventory.use') }}
        </button>
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
                </p>
              </div>
              <button
                v-if="selectedItemId && canEquipItem(inventory.items.find((i) => i.id === selectedItemId))"
                type="button"
                class="btn-ghost"
                :disabled="saving"
                @click="equip(ninja.id)"
              >
                {{ t('inventory.equip') }}
              </button>
              <button
                v-else-if="selectedCardId"
                type="button"
                class="btn-ghost"
                :disabled="saving"
                @click="equipCard(ninja.id)"
              >
                {{ t('inventory.equipCard') }}
              </button>
              <button
                v-else-if="
                  selectedItemId &&
                  isBureauItem(inventory.items.find((i) => i.id === selectedItemId)) &&
                  !isGlobalBureauItem(inventory.items.find((i) => i.id === selectedItemId))
                "
                type="button"
                class="btn-ghost"
                :disabled="saving"
                @click="useOnNinja(ninja.id)"
              >
                {{ t('inventory.use') }}
              </button>
            </div>
            <dl class="mt-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
              <div>
                <dt>{{ t('inventory.slotMatch') }}</dt>
                <dd class="mt-1 text-ink">
                  {{ ninja.match_name_fr ? (locale === 'en' ? ninja.match_name_en : ninja.match_name_fr) : '—' }}
                  <button
                    v-if="ninja.match_item_id"
                    type="button"
                    class="ml-2 text-fire"
                    @click="unequip(ninja.id, 'match')"
                  >×</button>
                </dd>
              </div>
              <div>
                <dt>{{ t('inventory.slotCycle') }}</dt>
                <dd class="mt-1 text-ink">
                  {{ ninja.cycle_name_fr ? (locale === 'en' ? ninja.cycle_name_en : ninja.cycle_name_fr) : '—' }}
                  <button
                    v-if="ninja.cycle_item_id"
                    type="button"
                    class="ml-2 text-fire"
                    @click="unequip(ninja.id, 'cycle')"
                  >×</button>
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt>{{ t('inventory.slotCard') }}</dt>
                <dd class="mt-1 text-ink">
                  <template v-if="ninja.tactic_card_name_fr">
                    {{ locale === 'en' ? ninja.tactic_card_name_en : ninja.tactic_card_name_fr }}
                    <span class="text-ink-faint">({{ t('inventory.cardCharges', { count: ninja.tactic_card_charges }) }})</span>
                    <button
                      type="button"
                      class="ml-2 text-fire"
                      @click="unequipCard(ninja.id)"
                    >×</button>
                  </template>
                  <template v-else>—</template>
                </dd>
              </div>
            </dl>
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

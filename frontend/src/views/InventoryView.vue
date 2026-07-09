<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const inventory = ref(null)
const selectedItemId = ref(null)
const saving = ref(false)
const sellItemId = ref(null)
const sellPrice = ref('')
const selling = ref(false)

const itemName = (item) => (locale.value === 'en' ? item.name_en : item.name_fr)

function usageLabel(item) {
  if (item.category === 'bureau') return t('market.bureauOnce')
  if (item.category === 'cycle') return t('market.cycleItem')
  const limit = item.usageLimits?.[0]
  if (!limit) return t('market.consumableOnce')
  return t('market.usesPerMatch', { count: limit.uses })
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

function sellPriceBounds(item) {
  const catalog = item?.catalog_price ?? 0
  return {
    floor: Math.floor((catalog * 50) / 100),
    ceiling: Math.ceil((catalog * 200) / 100),
  }
}

function openSell(item) {
  sellItemId.value = item.id
  const { floor } = sellPriceBounds(item)
  sellPrice.value = String(floor || 1)
  selectedItemId.value = null
}

function closeSell() {
  sellItemId.value = null
  sellPrice.value = ''
}

async function submitSell() {
  if (!sellItemId.value) return
  selling.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/player-market/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userItemId: sellItemId.value, price: Number(sellPrice.value) }),
    })
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

onMounted(fetchInventory)

async function fetchInventory() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/inventory`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    inventory.value = await res.json()
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
    inventory.value = await res.json()
    selectedItemId.value = null
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
    inventory.value = await res.json()
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
    inventory.value = await res.json()
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
    inventory.value = await res.json()
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
        <ul class="mt-6 space-y-3">
          <li
            v-for="item in inventory.items"
            :key="item.id"
            class="cursor-pointer border p-4 transition"
            :class="
              selectedItemId === item.id
                ? 'border-accent bg-bg-soft'
                : 'border-line hover:border-ink-faint'
            "
            @click="selectedItemId = item.id"
          >
            <p class="text-sm text-ink">{{ itemName(item) }}</p>
            <p class="mt-1 text-xs text-ink-faint">
              {{ t(`market.categories.${item.category}`) }} · {{ usageLabel(item) }}
            </p>
            <p class="mt-1 text-xs text-ink-faint">
              <template v-if="item.isListed">{{ t('inventory.listed') }}</template>
              <template v-else-if="item.nonVendable">{{ t('inventory.nonVendable') }}</template>
              <template v-else-if="item.equipped_ninja_name">{{ t('inventory.equippedOn', { name: item.equipped_ninja_name }) }}</template>
              <template v-else>{{ t('inventory.unequipped') }}</template>
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
          <li v-if="!inventory.items.length" class="text-sm text-ink-muted">
            {{ t('inventory.empty') }}
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
                <p class="text-ink">{{ ninja.name }}</p>
                <p class="mt-1 text-xs text-ink-faint">
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
            </dl>
          </li>
        </ul>
      </section>
    </div>

    <div
      v-if="sellItemId && sellItem()"
      class="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm"
      @click.self="closeSell"
    >
      <div class="w-full max-w-md border border-line bg-bg p-6 shadow-lg">
        <p class="section-label">{{ t('inventory.sellTitle') }}</p>
        <p class="mt-3 text-sm text-ink">{{ itemName(sellItem()) }}</p>
        <p class="mt-2 text-xs text-ink-faint">
          {{ t('inventory.sellHint', sellPriceBounds(sellItem())) }}
        </p>
        <label class="mt-6 block text-xs uppercase tracking-[0.12em] text-ink-faint">
          {{ t('inventory.sellPrice') }}
          <input
            v-model="sellPrice"
            type="number"
            class="mt-2 w-full border border-line bg-bg-soft px-3 py-2 text-sm text-ink"
            :min="sellPriceBounds(sellItem()).floor"
            :max="sellPriceBounds(sellItem()).ceiling"
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

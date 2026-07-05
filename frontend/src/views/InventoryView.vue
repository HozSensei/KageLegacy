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

const itemName = (item) => (locale.value === 'en' ? item.name_en : item.name_fr)

function usageLabel(item) {
  if (item.category === 'consumable') return t('market.consumableOnce')
  const limit = item.usageLimits?.[0]
  if (!limit) return ''
  return t('market.usesPerMatch', { count: limit.uses })
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
  <div class="page-shell">
    <header>
      <p class="page-kicker">{{ t('inventory.kicker') }}</p>
      <h1 class="page-title mt-3">{{ t('nav.inventory') }}</h1>
      <p class="page-lead">{{ t('inventory.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('inventory.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <div v-else-if="inventory" class="mt-12 lg:grid lg:grid-cols-12 lg:gap-10">
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
            <p class="mt-1 text-xs text-ink-faint">{{ usageLabel(item) }}</p>
            <p class="mt-1 text-xs text-ink-faint">
              {{ item.equipped_ninja_name ? t('inventory.equippedOn', { name: item.equipped_ninja_name }) : t('inventory.unequipped') }}
            </p>
          </li>
          <li v-if="!inventory.items.length" class="text-sm text-ink-muted">
            {{ t('inventory.empty') }}
          </li>
        </ul>
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
                v-if="selectedItemId"
                type="button"
                class="btn-ghost"
                :disabled="saving"
                @click="equip(ninja.id)"
              >
                {{ t('inventory.equip') }}
              </button>
            </div>
            <dl class="mt-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
              <div>
                <dt>{{ t('inventory.slotGear') }}</dt>
                <dd class="mt-1 text-ink">
                  {{ ninja.gear_name_fr ? (locale === 'en' ? ninja.gear_name_en : ninja.gear_name_fr) : '—' }}
                  <button
                    v-if="ninja.gear_item_id"
                    type="button"
                    class="ml-2 text-fire"
                    @click="unequip(ninja.id, 'gear')"
                  >×</button>
                </dd>
              </div>
              <div>
                <dt>{{ t('inventory.slotConsumable') }}</dt>
                <dd class="mt-1 text-ink">
                  {{ ninja.cons_name_fr ? (locale === 'en' ? ninja.cons_name_en : ninja.cons_name_fr) : '—' }}
                  <button
                    v-if="ninja.cons_item_id"
                    type="button"
                    class="ml-2 text-fire"
                    @click="unequip(ninja.id, 'consumable')"
                  >×</button>
                </dd>
              </div>
            </dl>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

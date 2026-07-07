<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaFlipCard from '../components/ninja/NinjaFlipCard.vue'

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''
const editingStrategy = ref(false)
const saving = ref(false)
const saveError = ref(null)
const swapPending = ref(null)
const sellNinjaId = ref(null)
const sellPrice = ref('')
const selling = ref(false)
const sellError = ref(null)

const STRATEGY_KEYS = ['Normal', 'Tank', 'Protect', 'Offensive']
const strategies = reactive({})
const protectTargets = reactive({})

const canCompose = computed(() => !store.tacticsLocked())

const slots = ref([null, null, null])
const localBench = ref([])

const teamSpeed = computed(() =>
  slots.value.filter(Boolean).reduce((acc, n) => acc + n.vitesse + n.intelligence, 0)
)

const benchNinjas = computed(() => {
  const activeIds = new Set(slots.value.filter(Boolean).map((n) => n.id))
  const merged = [...store.bench, ...localBench.value]
  const seen = new Set()
  return merged.filter((n) => {
    if (activeIds.has(n.id) || seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
})

const displayEntries = computed(() => {
  const entries = slots.value.map((ninja, index) => ({
    ninja,
    position: index + 1,
  }))

  const filled = entries.filter((e) => e.ninja)
  if (filled.length !== 3) return entries

  const chunin = filled.find((e) => e.ninja.grade === 'Chunin')
  const others = filled.filter((e) => e.ninja.grade !== 'Chunin')
  if (chunin && others.length === 2) {
    return [others[0], chunin, others[1]]
  }
  return entries
})

function syncSlotsFromStore() {
  const ordered = [1, 2, 3].map(
    (pos) => store.activeSquad.find((n) => n.squad_position === pos) || null
  )
  slots.value = ordered
  localBench.value = []
}

function initStrategies() {
  for (const n of store.activeSquad) {
    strategies[n.id] = n.battle_strategy || 'Normal'
    protectTargets[n.id] = n.protect_target_ninja_id || null
  }
}

function protectAlliesFor(ninjaId) {
  return slots.value.filter((n) => n && n.id !== ninjaId)
}

function canSellNinja(ninja) {
  return (
    canCompose.value &&
    !ninja.isListed &&
    !ninja.chunin_exam_requested &&
    !ninja.bird_flight_requested
  )
}

function openSell(ninja) {
  sellNinjaId.value = ninja.id
  sellPrice.value = ''
  sellError.value = null
}

function closeSell() {
  sellNinjaId.value = null
  sellPrice.value = ''
  sellError.value = null
}

const sellNinja = computed(() =>
  benchNinjas.value.find((n) => n.id === sellNinjaId.value) || null
)

async function submitSell() {
  if (!sellNinjaId.value) return
  selling.value = true
  sellError.value = null
  try {
    const res = await fetch(`${API_BASE}/api/player-market/list-ninja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId: sellNinjaId.value, price: Number(sellPrice.value) }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    closeSell()
    await store.fetchSquad()
  } catch (e) {
    sellError.value = e.message
  } finally {
    selling.value = false
  }
}

async function persistSlots() {
  const ordered = slots.value.filter(Boolean)
  if (ordered.length !== 3) return

  saving.value = true
  saveError.value = null
  try {
    await store.saveComposition(ordered)
    swapPending.value = null
    localBench.value = []
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

function slotIndexFor(position) {
  return position - 1
}

async function swapActiveWithBench(position, benchNinja) {
  const idx = slotIndexFor(position)
  const next = [...slots.value]
  next[idx] = benchNinja
  slots.value = next
  localBench.value = localBench.value.filter((n) => n.id !== benchNinja.id)

  swapPending.value = null
  await persistSlots()
}

async function removeFromActive(position) {
  const idx = slotIndexFor(position)
  const outgoing = slots.value[idx]
  if (!outgoing) return

  const next = [...slots.value]
  next[idx] = null
  slots.value = next
  swapPending.value = null

  if (!localBench.value.some((n) => n.id === outgoing.id)) {
    localBench.value.push(outgoing)
  }
}

function onActiveSwap(position) {
  if (!canCompose.value || saving.value) return

  if (swapPending.value?.kind === 'bench') {
    const benchNinja = benchNinjas.value.find((n) => n.id === swapPending.value.ninjaId)
    if (benchNinja) swapActiveWithBench(position, benchNinja)
    return
  }

  swapPending.value = { kind: 'active', position }
}

function onActiveRemove(position) {
  if (!canCompose.value || saving.value) return
  removeFromActive(position)
}

function onBenchSwap(ninjaId) {
  if (!canCompose.value || saving.value) return

  if (swapPending.value?.kind === 'active') {
    const benchNinja = benchNinjas.value.find((n) => n.id === ninjaId)
    if (benchNinja) swapActiveWithBench(swapPending.value.position, benchNinja)
    return
  }

  const emptyIdx = slots.value.findIndex((n) => !n)
  if (emptyIdx >= 0) {
    const benchNinja = benchNinjas.value.find((n) => n.id === ninjaId)
    if (benchNinja) swapActiveWithBench(emptyIdx + 1, benchNinja)
    return
  }

  swapPending.value = { kind: 'bench', ninjaId }
}

function isSwapSource(position) {
  return swapPending.value?.kind === 'active' && swapPending.value.position === position
}

function isBenchSwapSource(ninjaId) {
  return swapPending.value?.kind === 'bench' && swapPending.value.ninjaId === ninjaId
}

function isSwapTarget(position) {
  return swapPending.value?.kind === 'bench' && slots.value[slotIndexFor(position)]
}

function isBenchSwapTarget(ninjaId) {
  return swapPending.value?.kind === 'active'
}

async function toggleStrategyEdit() {
  if (editingStrategy.value) {
    saving.value = true
    saveError.value = null
    try {
      for (const n of store.activeSquad) {
        if (strategies[n.id] === 'Protect' && !protectTargets[n.id]) {
          const ally = protectAlliesFor(n.id)[0]
          if (ally) protectTargets[n.id] = ally.id
        }
      }
      await store.saveStrategies({ ...strategies }, { ...protectTargets })
      editingStrategy.value = false
    } catch (e) {
      saveError.value = e.message
    } finally {
      saving.value = false
    }
    return
  }
  if (!store.tacticsLocked()) {
    swapPending.value = null
    editingStrategy.value = true
  }
}

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
  syncSlotsFromStore()
})

watch(() => store.activeSquad, () => {
  syncSlotsFromStore()
  initStrategies()
}, { immediate: true, deep: true })
</script>

<template>
  <div class="page-shell" data-testid="squad-page">
    <header>
      <p class="page-kicker">Composition</p>
      <h1 class="page-title mt-3">{{ t('nav.squad') }}</h1>
      <p class="page-lead">{{ t('squad.lead') }}</p>
    </header>

    <template v-if="store.sensei">
      <p
        v-if="store.tacticsLocked()"
        class="mt-8 border-l-2 border-accent pl-4 text-sm text-ink-muted"
      >
        {{ t('squad.tacticsLocked') }}
      </p>

      <div class="mt-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <dl class="metric-row flex-1 border-0 py-0">
          <div class="metric-item">
            <dd class="metric-value">{{ teamSpeed }}</dd>
            <dt class="metric-label">{{ t('squad.tacticalSpeed') }}</dt>
          </div>
          <div class="metric-item">
            <dd class="metric-value">{{ slots.filter(Boolean).length }}</dd>
            <dt class="metric-label">{{ t('squad.activeCount') }}</dt>
          </div>
          <div class="metric-item">
            <dd class="metric-value">{{ store.bench.length }}</dd>
            <dt class="metric-label">{{ t('squad.benchCount') }}</dt>
          </div>
        </dl>

        <button
          type="button"
          class="btn-ghost shrink-0 disabled:opacity-40"
          :disabled="(!editingStrategy && store.tacticsLocked()) || saving"
          @click="toggleStrategyEdit"
        >
          {{
            saving && editingStrategy
              ? t('squad.saving')
              : editingStrategy
                ? t('squad.doneStrategy')
                : t('squad.editStrategy')
          }}
        </button>
      </div>

      <p v-if="swapPending" class="mt-4 text-sm text-accent">
        {{ t('squad.swapPending') }}
      </p>

      <p v-if="slots.some((s) => !s)" class="mt-4 text-sm text-fire">
        {{ t('squad.slotEmpty') }}
      </p>

      <p v-if="saveError" class="mt-4 text-sm text-fire">{{ saveError }}</p>

      <section class="mt-14" data-testid="squad-composition">
        <p class="section-label">{{ t('squad.activeSquad') }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-10 lg:justify-start lg:gap-12">
          <div
            v-for="entry in displayEntries"
            :key="entry.position"
            class="squad-card-slot flex flex-col items-center"
            :class="{
              'squad-card-slot--pending': isSwapSource(entry.position),
              'squad-card-slot--target': isSwapTarget(entry.position),
            }"
          >
            <div
              v-if="entry.ninja"
              class="squad-card-wrap group relative"
            >
              <div
                v-if="canCompose"
                class="squad-card-actions"
              >
                <button
                  type="button"
                  class="squad-card-action"
                  :title="t('squad.swapAction')"
                  :disabled="saving"
                  @click.stop="onActiveSwap(entry.position)"
                >
                  <svg
                    class="squad-card-action__icon squad-card-action__icon--swap"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M20 4v5h-5M4 20v-5h5M20 4a8 8 0 0 0-13.5 3M4 20a8 8 0 0 0 13.5-3"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="squad-card-action squad-card-action--remove"
                  :title="t('squad.removeAction')"
                  :disabled="saving"
                  @click.stop="onActiveRemove(entry.position)"
                >
                  <svg
                    class="squad-card-action__icon squad-card-action__icon--swap"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-width="1.75"
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                </button>
              </div>
              <NinjaFlipCard :ninja="entry.ninja" size="md" />
            </div>

            <div
              v-else
              class="squad-card-empty flex h-[17.5rem] w-[11.5rem] items-center justify-center rounded-[20px] border border-dashed border-line/60 text-sm text-ink-faint"
            >
              {{ t('squad.emptySlot') }}
            </div>

            <select
              v-if="editingStrategy && entry.ninja"
              v-model="strategies[entry.ninja.id]"
              class="strategy-select max-w-[11.5rem]"
            >
              <option v-for="key in STRATEGY_KEYS" :key="key" :value="key">
                {{ t(`squad.strategies.${key}`) }}
              </option>
            </select>
            <select
              v-if="editingStrategy && entry.ninja && strategies[entry.ninja.id] === 'Protect'"
              v-model="protectTargets[entry.ninja.id]"
              class="strategy-select mt-2 max-w-[11.5rem]"
            >
              <option :value="null" disabled>{{ t('squad.protectTarget') }}</option>
              <option
                v-for="ally in protectAlliesFor(entry.ninja.id)"
                :key="ally.id"
                :value="ally.id"
              >
                {{ ally.name.split(' ')[0] }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section class="mt-16 border-t border-line pt-10">
        <p class="section-label">{{ t('squad.bench') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ t('squad.benchHint') }}</p>
        <div class="bench-stack mt-2">
          <div
            v-for="ninja in benchNinjas"
            :key="ninja.id"
            class="bench-stack__item squad-card-slot"
            :class="{
              'squad-card-slot--pending': isBenchSwapSource(ninja.id),
              'squad-card-slot--target': isBenchSwapTarget(ninja.id),
            }"
          >
            <div class="squad-card-wrap group relative">
              <p
                v-if="ninja.isListed"
                class="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-bg px-2 text-[10px] uppercase tracking-wider text-accent"
              >
                {{ t('squad.listed') }}
              </p>
              <div
                v-if="canCompose"
                class="squad-card-actions squad-card-actions--bench"
              >
                <button
                  v-if="canSellNinja(ninja)"
                  type="button"
                  class="squad-card-action"
                  :title="t('squad.sellNinja')"
                  :disabled="saving"
                  @click.stop="openSell(ninja)"
                >
                  <span class="text-[10px] font-medium uppercase tracking-wider text-accent">¥</span>
                </button>
                <button
                  type="button"
                  class="squad-card-action"
                  :title="t('squad.swapAction')"
                  :disabled="saving"
                  @click.stop="onBenchSwap(ninja.id)"
                >
                  <svg
                    class="squad-card-action__icon squad-card-action__icon--swap"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M20 4v5h-5M4 20v-5h5M20 4a8 8 0 0 0-13.5 3M4 20a8 8 0 0 0 13.5-3"
                    />
                  </svg>
                </button>
              </div>
              <NinjaFlipCard :ninja="ninja" size="xs" />
            </div>
          </div>
        </div>
      </section>

      <div
        v-if="sellNinja"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6"
        @click.self="closeSell"
      >
        <div class="w-full max-w-md border border-line bg-bg-card p-8">
          <p class="section-label">{{ t('squad.sellNinja') }}</p>
          <p class="mt-3 font-display text-xl text-ink">{{ sellNinja.name }}</p>
          <p class="mt-2 text-xs text-ink-faint">{{ t('squad.sellFreePrice') }}</p>
          <label class="mt-6 block text-sm">
            <span class="text-ink-muted">{{ t('inventory.sellPrice') }}</span>
            <input
              v-model="sellPrice"
              type="number"
              min="1"
              required
              class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <p v-if="sellError" class="mt-4 text-sm text-fire">{{ sellError }}</p>
          <div class="mt-6 flex gap-3">
            <button type="button" class="btn-ghost flex-1" @click="closeSell">
              {{ t('inventory.sellCancel') }}
            </button>
            <button
              type="button"
              class="btn-ghost flex-1 border-accent text-accent"
              :disabled="selling"
              @click="submitSell"
            >
              {{ selling ? t('inventory.selling') : t('inventory.sellConfirm') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

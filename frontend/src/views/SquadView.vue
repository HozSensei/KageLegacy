<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaFlipCard from '../components/ninja/NinjaFlipCard.vue'

const { t } = useI18n()
const store = useSquadStore()
const editingStrategy = ref(false)
const saving = ref(false)
const saveError = ref(null)
const swapPending = ref(null)

const STRATEGY_KEYS = ['Normal', 'Tank', 'Protect', 'Offensive']
const strategies = reactive({})

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
      await store.saveStrategies({ ...strategies })
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
  <div class="page-shell">
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

      <section class="mt-14">
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
              <div
                v-if="canCompose"
                class="squad-card-actions squad-card-actions--bench"
              >
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
    </template>
  </div>
</template>

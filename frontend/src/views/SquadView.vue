<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaFlipCard from '../components/ninja/NinjaFlipCard.vue'

const { t } = useI18n()
const store = useSquadStore()
const editingStrategy = ref(false)
const editingComposition = ref(false)
const saving = ref(false)
const saveError = ref(null)
const dragNinjaId = ref(null)
const selectedNinjaId = ref(null)

const STRATEGY_KEYS = ['Normal', 'Tank', 'Protect', 'Offensive']
const strategies = reactive({})
const draftSlots = ref([null, null, null])
const draftBench = ref([])

const teamSpeed = computed(() => {
  const squad = editingComposition.value
    ? draftSlots.value.filter(Boolean)
    : store.activeSquad
  return squad.reduce((acc, n) => acc + n.vitesse + n.intelligence, 0)
})

const displaySquad = computed(() => {
  const squad = editingComposition.value
    ? draftSlots.value.filter(Boolean)
    : [...store.activeSquad]
  const chunin = squad.find((n) => n.grade === 'Chunin')
  const others = squad.filter((n) => n.grade !== 'Chunin')
  if (chunin && others.length === 2) return [others[0], chunin, others[1]]
  return squad
})

const benchList = computed(() =>
  editingComposition.value ? draftBench.value : store.bench
)

function initStrategies() {
  for (const n of store.activeSquad) {
    strategies[n.id] = n.battle_strategy || 'Normal'
  }
}

function initCompositionDraft() {
  const active = [...store.activeSquad].sort((a, b) => a.squad_position - b.squad_position)
  draftSlots.value = [active[0] || null, active[1] || null, active[2] || null]
  draftBench.value = [...store.bench]
}

function takeNinja(ninjaId) {
  for (let i = 0; i < 3; i += 1) {
    if (draftSlots.value[i]?.id === ninjaId) {
      const ninja = draftSlots.value[i]
      draftSlots.value[i] = null
      return ninja
    }
  }
  const benchIdx = draftBench.value.findIndex((n) => n.id === ninjaId)
  if (benchIdx >= 0) {
    const [ninja] = draftBench.value.splice(benchIdx, 1)
    return ninja
  }
  return null
}

function placeInSlot(slotIndex, ninja) {
  const outgoing = draftSlots.value[slotIndex]
  draftSlots.value[slotIndex] = ninja
  if (outgoing && outgoing.id !== ninja.id) {
    draftBench.value.push(outgoing)
  }
}

function onDragStart(ninjaId) {
  dragNinjaId.value = ninjaId
}

function onDragEnd() {
  dragNinjaId.value = null
}

function onDropSlot(slotIndex) {
  if (!dragNinjaId.value) return
  const ninja = takeNinja(dragNinjaId.value)
  if (ninja) placeInSlot(slotIndex, ninja)
  dragNinjaId.value = null
}

function onDropBench() {
  if (!dragNinjaId.value) return
  const ninja = takeNinja(dragNinjaId.value)
  if (ninja) draftBench.value.push(ninja)
  dragNinjaId.value = null
}

function onCardClick(ninjaId) {
  if (!editingComposition.value) return

  if (!selectedNinjaId.value) {
    selectedNinjaId.value = ninjaId
    return
  }

  if (selectedNinjaId.value === ninjaId) {
    selectedNinjaId.value = null
    return
  }

  const fromSlot = draftSlots.value.findIndex((n) => n?.id === selectedNinjaId.value)
  const toSlot = draftSlots.value.findIndex((n) => n?.id === ninjaId)
  const fromBench = draftBench.value.some((n) => n.id === selectedNinjaId.value)
  const toBench = draftBench.value.some((n) => n.id === ninjaId)

  if (fromSlot >= 0 && toSlot >= 0) {
    const tmp = draftSlots.value[fromSlot]
    draftSlots.value[fromSlot] = draftSlots.value[toSlot]
    draftSlots.value[toSlot] = tmp
  } else if (fromSlot >= 0 && toBench) {
    const benchNinja = takeNinja(ninjaId)
    placeInSlot(fromSlot, benchNinja)
  } else if (fromBench && toSlot >= 0) {
    const activeNinja = takeNinja(selectedNinjaId.value)
    if (activeNinja) placeInSlot(toSlot, activeNinja)
  }

  selectedNinjaId.value = null
}

async function toggleCompositionEdit() {
  if (editingComposition.value) {
    saving.value = true
    saveError.value = null
    try {
      const ordered = draftSlots.value.filter(Boolean)
      if (ordered.length !== 3) {
        throw new Error(t('squad.compositionIncomplete'))
      }
      await store.saveComposition(ordered)
      editingComposition.value = false
      selectedNinjaId.value = null
    } catch (e) {
      saveError.value = e.message
    } finally {
      saving.value = false
    }
    return
  }
  if (!store.tacticsLocked()) {
    editingStrategy.value = false
    initCompositionDraft()
    editingComposition.value = true
  }
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
    editingComposition.value = false
    editingStrategy.value = true
  }
}

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
})

watch(() => store.activeSquad, initStrategies, { immediate: true, deep: true })
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
            <dd class="metric-value">{{ store.activeSquad.length }}</dd>
            <dt class="metric-label">{{ t('squad.activeCount') }}</dt>
          </div>
          <div class="metric-item">
            <dd class="metric-value">{{ store.bench.length }}</dd>
            <dt class="metric-label">{{ t('squad.benchCount') }}</dt>
          </div>
        </dl>

        <div class="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            class="btn-ghost disabled:opacity-40"
            :disabled="(!editingComposition && store.tacticsLocked()) || saving"
            @click="toggleCompositionEdit"
          >
            {{
              saving && editingComposition
                ? t('squad.saving')
                : editingComposition
                  ? t('squad.doneComposition')
                  : t('squad.editComposition')
            }}
          </button>
          <button
            type="button"
            class="btn-ghost disabled:opacity-40"
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
      </div>

      <p v-if="editingComposition" class="mt-4 text-sm text-ink-muted">
        {{ t('squad.compositionHint') }}
      </p>

      <p v-if="saveError" class="mt-4 text-sm text-fire">{{ saveError }}</p>

      <section class="mt-14">
        <p class="section-label">{{ t('squad.activeSquad') }}</p>

        <div
          v-if="editingComposition"
          class="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-3"
        >
          <div
            v-for="slotIndex in 3"
            :key="slotIndex"
            class="composition-slot flex flex-col items-center"
            :class="{ 'composition-slot--empty': !draftSlots[slotIndex - 1] }"
            @dragover.prevent
            @drop.prevent="onDropSlot(slotIndex - 1)"
          >
            <div
              v-if="draftSlots[slotIndex - 1]"
              :draggable="true"
              :class="{
                'composition-slot--drag': dragNinjaId === draftSlots[slotIndex - 1].id,
                'composition-slot--selected': selectedNinjaId === draftSlots[slotIndex - 1].id,
              }"
              @dragstart="onDragStart(draftSlots[slotIndex - 1].id)"
              @dragend="onDragEnd"
              @click="onCardClick(draftSlots[slotIndex - 1].id)"
            >
              <NinjaFlipCard :ninja="draftSlots[slotIndex - 1]" size="md" />
            </div>
            <p v-else class="composition-slot__placeholder text-sm text-ink-faint">
              {{ t('squad.dropHere') }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="mt-8 flex flex-wrap justify-center gap-10 lg:justify-start lg:gap-12"
        >
          <div
            v-for="ninja in displaySquad"
            :key="ninja.id"
            class="flex flex-col items-center"
          >
            <NinjaFlipCard :ninja="ninja" size="md" />
            <select
              v-if="editingStrategy"
              v-model="strategies[ninja.id]"
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
        <p class="mt-2 text-sm text-ink-muted">
          {{ editingComposition ? t('squad.benchSwapHint') : t('squad.benchHint') }}
        </p>
        <div
          class="bench-stack mt-2"
          :class="{ 'composition-bench--drop': editingComposition }"
          @dragover.prevent="editingComposition"
          @drop.prevent="onDropBench"
        >
          <div
            v-for="ninja in benchList"
            :key="ninja.id"
            class="bench-stack__item"
            :class="{
              'composition-slot--drag': editingComposition && dragNinjaId === ninja.id,
              'composition-slot--selected': editingComposition && selectedNinjaId === ninja.id,
            }"
          >
            <div
              :draggable="editingComposition"
              @dragstart="onDragStart(ninja.id)"
              @dragend="onDragEnd"
              @click="onCardClick(ninja.id)"
            >
              <NinjaFlipCard :ninja="ninja" size="xs" />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

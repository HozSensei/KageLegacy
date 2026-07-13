<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatInstanceBonusPct } from '../../utils/techniqueCardBonus.js'

const SLOTS_PER_NINJA = 3

const props = defineProps({
  deck: { type: Object, default: null },
  activeSquad: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['save-deck'])

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''
const availableCards = ref([])
const techniqueSlots = ref({})
const saving = ref(false)

const canEdit = computed(() => props.deck && !props.deck.tacticsLocked)

function cardLabel(card) {
  const bonus = card.pliBonusPct != null ? ` ${formatInstanceBonusPct(card)}` : ''
  const element = card.elementAffinity ? ` · ${card.elementAffinity}` : ''
  return `${card.nameFr}${bonus}${element}`
}

function cardsForNinja(ninja) {
  const usedElsewhere = new Set(
    Object.entries(techniqueSlots.value).flatMap(([ninjaId, ids]) =>
      String(ninjaId) === String(ninja.id) ? [] : ids || []
    )
  )
  return availableCards.value.filter((card) => {
    if (usedElsewhere.has(card.userTacticCardId)) return false
    if (!card.elementAffinity) return true
    return card.elementAffinity === ninja.element_affinity
  })
}

function syncFromDeck() {
  if (!props.deck) return
  techniqueSlots.value = { ...(props.deck.techniqueSlotsByNinjaId || {}) }
}

watch(
  () => props.deck,
  () => syncFromDeck(),
  { immediate: true }
)

async function loadCards() {
  const res = await fetch(`${API_BASE}/api/inventory`)
  if (!res.ok) return
  const data = await res.json()
  availableCards.value = (data.tacticCards || []).filter((c) => c.chargesRemaining > 0)
}

function ensureSlots(ninjaId) {
  if (!techniqueSlots.value[ninjaId]) {
    techniqueSlots.value[ninjaId] = []
  }
  return techniqueSlots.value[ninjaId]
}

function slotValue(ninjaId, index) {
  return ensureSlots(ninjaId)[index] ?? ''
}

function setSlot(ninjaId, index, rawValue) {
  const ids = [...ensureSlots(ninjaId)]
  const value = rawValue ? Number(rawValue) : null
  ids[index] = value
  techniqueSlots.value[ninjaId] = ids.filter(Boolean).slice(0, SLOTS_PER_NINJA)
}

async function save() {
  if (!canEdit.value) return
  saving.value = true
  try {
    emit('save-deck', {
      techniqueSlotsByNinjaId: techniqueSlots.value,
    })
  } finally {
    saving.value = false
  }
}

function assignedCardsForNinja(ninjaId) {
  const cardsById = Object.fromEntries(
    (props.deck?.techniqueCards || []).map((c) => [c.userTacticCardId, c])
  )
  return (props.deck?.techniqueSlotsByNinjaId?.[ninjaId] || [])
    .map((id) => cardsById[id])
    .filter(Boolean)
}

onMounted(loadCards)
</script>

<template>
  <section
    v-if="deck"
    class="mt-10 border border-line bg-bg-soft p-6"
    data-testid="operation-deck"
  >
    <p class="section-label">{{ t('squad.deck.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('squad.deck.lead') }}</p>

    <div v-if="activeSquad.length" class="mt-8">
      <p class="text-xs uppercase tracking-[0.14em] text-ink-faint">
        {{ t('squad.deck.techniquesTitle') }}
      </p>
      <ul class="mt-4 space-y-4">
        <li
          v-for="ninja in activeSquad"
          :key="ninja.id"
          class="border border-line/60 p-4 text-sm"
        >
          <p class="font-medium text-ink">
            {{ ninja.name }}
            <span v-if="ninja.element_affinity" class="text-xs text-ink-muted">
              · {{ ninja.element_affinity }}
            </span>
          </p>

          <div v-if="canEdit" class="mt-3 space-y-2">
            <label
              v-for="slotIndex in SLOTS_PER_NINJA"
              :key="`${ninja.id}-${slotIndex}`"
              class="block text-xs text-ink-muted"
            >
              {{ t('squad.deck.techniqueSlot', { n: slotIndex }) }}
              <select
                :value="slotValue(ninja.id, slotIndex - 1) || ''"
                class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm"
                @change="setSlot(ninja.id, slotIndex - 1, $event.target.value)"
              >
                <option value="">{{ t('squad.deck.emptySlot') }}</option>
                <option
                  v-for="card in cardsForNinja(ninja)"
                  :key="`card-${ninja.id}-${card.userTacticCardId}`"
                  :value="card.userTacticCardId"
                >
                  {{ cardLabel(card) }}
                </option>
              </select>
            </label>
          </div>

          <ul v-else class="mt-2 space-y-1 text-xs text-ink-muted">
            <li v-for="card in assignedCardsForNinja(ninja.id)" :key="card.userTacticCardId">
              {{ cardLabel(card) }} · {{ card.chargesRemaining }} {{ t('squad.deck.charges') }}
            </li>
            <li v-if="!assignedCardsForNinja(ninja.id).length" class="text-ink-faint">
              {{ t('squad.deck.autoFill') }}
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <button
      v-if="canEdit"
      type="button"
      class="mt-6 text-sm text-accent"
      :disabled="saving"
      data-testid="deck-save"
      @click="save"
    >
      {{ t('squad.deck.save') }}
    </button>

    <p v-if="deck.tacticsLocked" class="mt-4 text-xs text-ink-faint">{{ t('squad.deck.locked') }}</p>
  </section>
</template>

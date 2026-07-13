<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { formatInstanceBonusPct } from '../../utils/techniqueCardBonus.js'

const DOMAIN_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine']
const AUTO_SAVE_MS = 450

const props = defineProps({
  deck: { type: Object, default: null },
  activeSquad: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['deck-saved'])

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''
const availableCards = ref([])
const techniqueSlots = ref({})
const techniques = ref({})
const saving = ref(false)
const saveState = ref('idle')
const skipAutoSave = ref(false)
let saveTimer = null

const canEdit = computed(() => props.deck && !props.deck.tacticsLocked)

function domainLabel(key) {
  return t(`squad.deck.domains.${key}`, key)
}

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
  skipAutoSave.value = true
  techniqueSlots.value = { ...(props.deck.techniqueSlotsByNinjaId || {}) }
  techniques.value = { ...(props.deck.techniquesByNinjaId || {}) }
  nextTick(() => {
    skipAutoSave.value = false
  })
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

function ensureTechnique(ninjaId) {
  if (!techniques.value[ninjaId]) {
    techniques.value[ninjaId] = { primary: 'taijutsu', secondary: 'ninjutsu' }
  }
  return techniques.value[ninjaId]
}

function ensureSlots(ninjaId) {
  if (!techniqueSlots.value[ninjaId]) {
    techniqueSlots.value[ninjaId] = []
  }
  return techniqueSlots.value[ninjaId]
}

function techniqueSlotValue(ninjaId) {
  return ensureSlots(ninjaId)[0] ?? ''
}

function setTechniqueSlot(ninjaId, rawValue) {
  const value = rawValue ? Number(rawValue) : null
  techniqueSlots.value[ninjaId] = value ? [value] : []
}

function buildPayload() {
  return {
    techniquesByNinjaId: techniques.value,
    techniqueSlotsByNinjaId: techniqueSlots.value,
  }
}

function scheduleAutoSave() {
  if (!canEdit.value || skipAutoSave.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveState.value = 'pending'
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persistDeck()
  }, AUTO_SAVE_MS)
}

async function persistDeck() {
  if (!canEdit.value || skipAutoSave.value) return
  saving.value = true
  saveState.value = 'saving'
  try {
    await store.saveOperationDeck(buildPayload())
    saveState.value = 'saved'
    emit('deck-saved')
  } catch {
    saveState.value = 'error'
  } finally {
    saving.value = false
  }
}

watch([techniqueSlots, techniques], scheduleAutoSave, { deep: true })

function assignedTechniqueCard(ninjaId) {
  const cardsById = Object.fromEntries(
    (props.deck?.techniqueCards || []).map((c) => [c.userTacticCardId, c])
  )
  const id = (props.deck?.techniqueSlotsByNinjaId?.[ninjaId] || [])[0]
  return id ? cardsById[id] : null
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
        {{ t('squad.deck.perNinjaTitle') }}
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

          <div v-if="canEdit" class="mt-3 space-y-3">
            <label class="block text-xs text-ink-muted">
              {{ t('squad.deck.techniqueSlot') }}
              <select
                :value="techniqueSlotValue(ninja.id) || ''"
                class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm"
                data-testid="deck-technique-slot"
                @change="setTechniqueSlot(ninja.id, $event.target.value)"
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

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="text-xs text-ink-muted">
                {{ t('squad.deck.primary') }}
                <select
                  v-model="ensureTechnique(ninja.id).primary"
                  class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm"
                  data-testid="deck-primary-domain"
                >
                  <option v-for="key in DOMAIN_KEYS" :key="`p-${ninja.id}-${key}`" :value="key">
                    {{ domainLabel(key) }}
                  </option>
                </select>
              </label>
              <label class="text-xs text-ink-muted">
                {{ t('squad.deck.secondary') }}
                <select
                  v-model="ensureTechnique(ninja.id).secondary"
                  class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm"
                  data-testid="deck-secondary-domain"
                >
                  <option v-for="key in DOMAIN_KEYS" :key="`s-${ninja.id}-${key}`" :value="key">
                    {{ domainLabel(key) }}
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div v-else class="mt-2 space-y-1 text-xs text-ink-muted">
            <p v-if="assignedTechniqueCard(ninja.id)">
              {{ cardLabel(assignedTechniqueCard(ninja.id)) }}
              · {{ assignedTechniqueCard(ninja.id).chargesRemaining }} {{ t('squad.deck.charges') }}
            </p>
            <p v-else class="text-ink-faint">{{ t('squad.deck.autoFillTechnique') }}</p>
            <p>
              {{ domainLabel(deck.techniquesByNinjaId?.[ninja.id]?.primary) }}
              /
              {{ domainLabel(deck.techniquesByNinjaId?.[ninja.id]?.secondary) }}
            </p>
          </div>
        </li>
      </ul>
    </div>

    <p
      v-if="canEdit && saveState !== 'idle'"
      class="mt-4 text-[11px] text-ink-faint"
      data-testid="deck-save-status"
      aria-live="polite"
    >
      <span v-if="saveState === 'pending' || saveState === 'saving'">{{ t('squad.deck.saving') }}</span>
      <span v-else-if="saveState === 'saved'">{{ t('squad.deck.saved') }}</span>
      <span v-else-if="saveState === 'error'">{{ t('squad.deck.saveFailed') }}</span>
    </p>

    <p v-if="deck.tacticsLocked" class="mt-4 text-xs text-ink-faint">{{ t('squad.deck.locked') }}</p>
  </section>
</template>

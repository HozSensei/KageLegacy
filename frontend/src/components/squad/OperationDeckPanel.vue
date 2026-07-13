<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const DOMAIN_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine']

const props = defineProps({
  deck: { type: Object, default: null },
  activeSquad: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['save-deck'])

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''
const availableCards = ref([])
const selectedIds = ref([])
const techniques = ref({})
const saving = ref(false)

const canEdit = computed(() => props.deck && !props.deck.tacticsLocked)

function domainLabel(key) {
  return t(`squad.deck.domains.${key}`, key)
}

function syncFromDeck() {
  if (!props.deck) return
  selectedIds.value = [...(props.deck.elementCardIds || [])]
  techniques.value = { ...(props.deck.techniquesByNinjaId || {}) }
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

function toggleCard(id) {
  if (!canEdit.value) return
  const set = new Set(selectedIds.value)
  if (set.has(id)) set.delete(id)
  else if (set.size < 5) set.add(id)
  selectedIds.value = [...set]
}

function ensureTechnique(ninjaId) {
  if (!techniques.value[ninjaId]) {
    techniques.value[ninjaId] = { primary: 'taijutsu', secondary: 'ninjutsu' }
  }
  return techniques.value[ninjaId]
}

async function save() {
  if (!canEdit.value) return
  saving.value = true
  try {
    emit('save-deck', {
      elementCardIds: selectedIds.value,
      techniquesByNinjaId: techniques.value,
    })
  } finally {
    saving.value = false
  }
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
          <p class="font-medium text-ink">{{ ninja.name }}</p>
          <div v-if="canEdit" class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-xs text-ink-muted">
              {{ t('squad.deck.primary') }}
              <select
                v-model="ensureTechnique(ninja.id).primary"
                class="mt-1 block w-full border border-line bg-bg px-2 py-1.5 text-sm"
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
              >
                <option v-for="key in DOMAIN_KEYS" :key="`s-${ninja.id}-${key}`" :value="key">
                  {{ domainLabel(key) }}
                </option>
              </select>
            </label>
          </div>
          <p v-else class="mt-2 text-xs text-ink-muted">
            {{ domainLabel(deck.techniquesByNinjaId?.[ninja.id]?.primary) }}
            /
            {{ domainLabel(deck.techniquesByNinjaId?.[ninja.id]?.secondary) }}
          </p>
        </li>
      </ul>
    </div>

    <p class="mt-8 text-xs uppercase tracking-[0.14em] text-ink-faint">
      {{ t('squad.deck.elementsTitle', { count: 5 }) }}
    </p>
    <ul class="mt-3 space-y-2 text-sm text-ink">
      <li v-for="card in deck.elementCards" :key="card.userTacticCardId">
        {{ card.nameFr }} · {{ card.chargesRemaining }} charges
      </li>
      <li v-if="!deck.elementCards?.length" class="text-ink-faint">{{ t('squad.deck.autoFill') }}</li>
    </ul>

    <div v-if="canEdit && availableCards.length" class="mt-6">
      <p class="text-xs text-ink-muted">{{ t('squad.deck.pickHint') }}</p>
      <ul class="mt-3 flex flex-wrap gap-2">
        <li v-for="card in availableCards" :key="card.userTacticCardId">
          <button
            type="button"
            class="border px-3 py-1 text-xs"
            :class="
              selectedIds.includes(card.userTacticCardId)
                ? 'border-accent text-accent'
                : 'border-line text-ink-muted'
            "
            @click="toggleCard(card.userTacticCardId)"
          >
            {{ card.nameFr }}
          </button>
        </li>
      </ul>
      <button
        type="button"
        class="mt-4 text-sm text-accent"
        :disabled="saving"
        data-testid="deck-save"
        @click="save"
      >
        {{ t('squad.deck.save') }}
      </button>
    </div>

    <p v-if="deck.tacticsLocked" class="mt-4 text-xs text-ink-faint">{{ t('squad.deck.locked') }}</p>
  </section>
</template>

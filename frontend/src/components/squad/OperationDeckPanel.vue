<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  deck: { type: Object, default: null },
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

    <p class="mt-6 text-xs uppercase tracking-[0.14em] text-ink-faint">
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
        @click="save"
      >
        {{ t('squad.deck.save') }}
      </button>
    </div>

    <p v-if="deck.tacticsLocked" class="mt-4 text-xs text-ink-faint">{{ t('squad.deck.locked') }}</p>
  </section>
</template>

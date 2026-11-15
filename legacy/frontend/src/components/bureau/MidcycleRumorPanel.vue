<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { readApiError } from '../../utils/http.js'

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''
const buying = ref(false)
const error = ref(null)
const lastRumor = ref(null)

const midcycle = computed(() => store.midcycle)

async function buyRumor() {
  buying.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/gameplay/midcycle/rumor`, { method: 'POST' })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    lastRumor.value = data.rumor
    store.applySquadMutation(data)
  } catch (e) {
    error.value = e.message
  } finally {
    buying.value = false
  }
}
</script>

<template>
  <section
    v-if="midcycle?.windowOpen || lastRumor"
    class="mt-10 border border-line px-5 py-4"
    data-testid="midcycle-rumor"
  >
    <p class="section-label">{{ t('midcycle.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('midcycle.lead') }}</p>

    <p v-if="lastRumor?.line" class="mt-4 text-sm text-ink">{{ lastRumor.line }}</p>
    <p v-else-if="midcycle?.alreadyUsed" class="mt-4 text-sm text-ink-muted">
      {{ t('midcycle.alreadyUsed') }}
    </p>

    <p v-if="error" class="mt-3 text-xs text-fire">{{ error }}</p>

    <button
      v-if="midcycle?.available"
      type="button"
      class="btn-ghost mt-4 text-xs"
      :disabled="buying || !midcycle.canAfford"
      data-testid="midcycle-rumor-buy"
      @click="buyRumor"
    >
      {{ buying ? t('common.loading') : t('midcycle.buy', { cost: midcycle.cost }) }}
    </button>
    <p v-else-if="midcycle?.windowOpen && !midcycle.canAfford" class="mt-3 text-xs text-fire">
      {{ t('midcycle.cannotAfford') }}
    </p>
  </section>
</template>

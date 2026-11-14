<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CombatArena from '../components/combat/CombatArena.vue'
import { useCombatStore } from '../stores/combat'

defineOptions({ name: 'CombatView' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const combat = useCombatStore()

const combatId = computed(() => route.params.id)

onMounted(async () => {
  if (combatId.value) {
    if (!combat.combat || combat.combat.id !== combatId.value) {
      await combat.fetchState(combatId.value)
    }
  }
})

watch(combatId, async (id) => {
  if (id) await combat.fetchState(id)
})

function onSelect(card) {
  combat.selectedInstanceId = card?.instanceId || null
}

async function onPlay(card) {
  const id = card?.instanceId || combat.selectedInstanceId
  if (!id) return
  try {
    await combat.playCard(id)
  } catch {
    /* error surfaced via store */
  }
}

async function onEndTurn() {
  try {
    await combat.endTurn()
  } catch {
    /* store */
  }
}

async function onDiscardChakra() {
  if (!combat.selectedInstanceId) return
  try {
    await combat.discardForChakra(combat.selectedInstanceId)
  } catch {
    /* store */
  }
}

async function onForfeit() {
  try {
    await combat.forfeit()
  } catch {
    /* store */
  }
}

function backToMissions() {
  combat.clear()
  router.push({ name: 'missions' })
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="combat-page">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="page-kicker">{{ t('combat.kicker') }}</p>
        <h1 class="page-title mt-2">{{ t('combat.title') }}</h1>
      </div>
      <button type="button" class="btn-ghost text-xs" @click="backToMissions">
        {{ t('combat.backToMissions') }}
      </button>
    </div>

    <p v-if="combat.error" class="mt-4 text-sm text-fire">{{ combat.error }}</p>
    <p v-if="combat.loading && !combat.combat" class="mt-8 text-ink-muted">
      {{ t('combat.loading') }}
    </p>

    <CombatArena
      v-if="combat.combat"
      class="mt-4"
      :combat="combat.combat"
      :logs="combat.recentLogs"
      :selected-id="combat.selectedInstanceId"
      :busy="combat.actionLoading"
      @select-card="onSelect"
      @play-card="onPlay"
      @end-turn="onEndTurn"
      @discard-chakra="onDiscardChakra"
      @forfeit="onForfeit"
    />
  </div>
</template>

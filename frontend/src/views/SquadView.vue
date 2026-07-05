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

const STRATEGY_KEYS = ['Normal', 'Tank', 'Protect', 'Offensive']
const strategies = reactive({})

const teamSpeed = computed(() =>
  store.activeSquad.reduce((acc, n) => acc + n.vitesse + n.intelligence, 0)
)

const displaySquad = computed(() => {
  const squad = [...store.activeSquad]
  const chunin = squad.find((n) => n.grade === 'Chunin')
  const others = squad.filter((n) => n.grade !== 'Chunin')
  if (chunin && others.length === 2) return [others[0], chunin, others[1]]
  return squad
})

function initStrategies() {
  for (const n of store.activeSquad) {
    strategies[n.id] = n.battle_strategy || 'Normal'
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

        <button
          type="button"
          class="btn-ghost shrink-0 disabled:opacity-40"
          :disabled="!editingStrategy && store.tacticsLocked()"
          @click="toggleStrategyEdit"
        >
          {{
            saving
              ? t('squad.saving')
              : editingStrategy
                ? t('squad.doneStrategy')
                : t('squad.editStrategy')
          }}
        </button>
      </div>

      <p v-if="saveError" class="mt-4 text-sm text-fire">{{ saveError }}</p>

      <section class="mt-14">
        <p class="section-label">{{ t('squad.activeSquad') }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-10 lg:justify-start lg:gap-12">
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
        <p class="mt-2 text-sm text-ink-muted">{{ t('squad.benchHint') }}</p>
        <div class="bench-stack mt-2">
          <div
            v-for="ninja in store.bench"
            :key="ninja.id"
            class="bench-stack__item"
          >
            <NinjaFlipCard :ninja="ninja" size="xs" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

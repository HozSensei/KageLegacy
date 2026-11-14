<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMissionsStore } from '../stores/missions'
import { useCombatStore } from '../stores/combat'
import VictoryRewards from '../components/combat/VictoryRewards.vue'

defineOptions({ name: 'MissionRunView' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const missions = useMissionsStore()
const combat = useCombatStore()

const localError = ref(null)

const runId = computed(() => route.params.id)

onMounted(async () => {
  if (runId.value) await missions.fetchRun(runId.value)
})

const run = computed(() => missions.currentRun)
const player = computed(() => run.value?.player || {})
const nodes = computed(() => run.value?.nodes || [])
const isOver = computed(() =>
  ['victory', 'defeat', 'abandoned'].includes(run.value?.state)
)
const missionTitle = computed(() => {
  const m = run.value?.mission
  if (!m) return t('combat.runTitle')
  return locale.value === 'en' ? m.nameEn : m.nameFr
})

function nodeLabel(node) {
  if (node.type === 'combat') {
    if (node.boss) return t('combat.nodeBoss')
    return t('combat.nodeCombat')
  }
  return locale.value === 'en' ? node.nameEn : node.nameFr
}

function nodeHint(node) {
  if (node.type === 'event') {
    return locale.value === 'en' ? node.descriptionEn : node.descriptionFr
  }
  return node.templateId || ''
}

async function onEnter() {
  localError.value = null
  try {
    const result = await missions.enterNode(runId.value)
    if (result.combat?.id) {
      combat.hydrateFrom(result.combat)
      await router.push({ name: 'combat', params: { id: result.combat.id } })
      return
    }
    // event exposed via store.currentEvent
  } catch (e) {
    localError.value = e.message
  }
}

async function onChoice(choiceId) {
  localError.value = null
  try {
    await missions.resolveEvent(runId.value, choiceId)
  } catch (e) {
    localError.value = e.message
  }
}

async function onAbandon() {
  localError.value = null
  try {
    await missions.abandonRun(runId.value)
  } catch (e) {
    localError.value = e.message
  }
}

function backToMissions() {
  missions.clearRun()
  combat.clear()
  router.push({ name: 'missions' })
}

const eventChoices = computed(() => missions.currentEvent?.choices || [])
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="mission-run-page">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="page-kicker">{{ t('combat.runKicker') }}</p>
        <h1 class="page-title mt-2">{{ missionTitle }}</h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('combat.runLead') }}</p>
      </div>
      <button type="button" class="btn-ghost text-xs" @click="backToMissions">
        {{ t('combat.backToMissions') }}
      </button>
    </div>

    <p v-if="missions.error || localError" class="mt-4 text-sm text-fire">
      {{ localError || missions.error }}
    </p>

    <p v-if="missions.loading && !run" class="mt-8 text-ink-muted">
      {{ t('combat.loading') }}
    </p>

    <template v-if="run">
      <div class="run-status mt-6" data-testid="run-status">
        <div class="run-status__hp">
          <span class="run-status__label">{{ t('combat.runHp') }}</span>
          <div class="run-status__bar">
            <div
              class="run-status__fill"
              :style="{ width: `${Math.round((player.hp / (player.maxHp || 1)) * 100)}%` }"
            />
          </div>
          <span class="run-status__num">{{ player.hp }} / {{ player.maxHp }}</span>
        </div>
        <p class="run-status__scrap">
          {{ t('combat.runScrap', { n: player.scrap || 0 }) }}
        </p>
      </div>

      <VictoryRewards
        v-if="isOver"
        class="mt-8 max-w-md mx-auto"
        :state="run.state === 'victory' ? 'victory' : run.state === 'abandoned' ? 'forfeited' : 'defeat'"
        :rewards="run.rewards"
        :continue-label="t('combat.backToMissions')"
        @dismiss="backToMissions"
      />

      <ol v-else class="run-path mt-8" data-testid="run-path">
        <li
          v-for="(node, i) in nodes"
          :key="node.id"
          class="run-node"
          :class="[
            `run-node--${node.status}`,
            `run-node--${node.type}`,
            { 'run-node--boss': node.boss },
          ]"
          :data-testid="`run-node-${i}`"
        >
          <div class="run-node__index">{{ i + 1 }}</div>
          <div class="run-node__body">
            <p class="run-node__title">
              {{ nodeLabel(node) }}
              <span v-if="node.boss" class="run-node__boss">{{ t('combat.bossTag') }}</span>
            </p>
            <p class="run-node__hint">{{ nodeHint(node) }}</p>
          </div>
          <span class="run-node__status">{{ t(`combat.nodeStatus.${node.status}`) }}</span>
        </li>
      </ol>

      <section
        v-if="!isOver && missions.currentEvent"
        class="run-event mt-8"
        data-testid="run-event"
      >
        <h2 class="run-event__title">
          {{
            locale === 'en'
              ? missions.currentEvent.nameEn
              : missions.currentEvent.nameFr
          }}
        </h2>
        <p class="run-event__desc">
          {{
            locale === 'en'
              ? missions.currentEvent.descriptionEn
              : missions.currentEvent.descriptionFr
          }}
        </p>
        <div class="run-event__choices">
          <button
            v-for="choice in eventChoices"
            :key="choice.id"
            type="button"
            class="btn-secondary text-xs"
            :disabled="missions.actionLoading || choice.disabled"
            @click="onChoice(choice.id)"
          >
            {{ locale === 'en' ? choice.labelEn : choice.labelFr }}
          </button>
        </div>
      </section>

      <div v-if="!isOver" class="run-actions mt-8">
        <button
          v-if="!missions.currentEvent"
          type="button"
          class="btn-primary text-xs"
          data-testid="run-enter-btn"
          :disabled="missions.actionLoading"
          @click="onEnter"
        >
          {{
            missions.actionLoading ? t('combat.starting') : t('combat.enterNode')
          }}
        </button>
        <button
          type="button"
          class="btn-ghost text-xs"
          :disabled="missions.actionLoading"
          @click="onAbandon"
        >
          {{ t('combat.abandonRun') }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.run-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem 2rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-line) 70%, transparent);
}

.run-status__hp {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 1;
  min-width: 12rem;
}

.run-status__label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.run-status__bar {
  flex: 1;
  height: 0.45rem;
  max-width: 14rem;
  background: color-mix(in srgb, var(--color-bg-soft) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-line) 60%, transparent);
  overflow: hidden;
}

.run-status__fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-fire) 70%, transparent),
    color-mix(in srgb, var(--color-accent) 80%, transparent)
  );
  transition: width 0.45s ease;
}

.run-status__num {
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
}

.run-status__scrap {
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.run-path {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  position: relative;
}

.run-path::before {
  content: '';
  position: absolute;
  left: 1.15rem;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in srgb, var(--color-accent-soft) 40%, transparent),
    transparent
  );
  pointer-events: none;
}

.run-node {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.85rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border: 1px solid color-mix(in srgb, var(--color-line) 75%, transparent);
  background: color-mix(in srgb, var(--color-bg-card) 70%, transparent);
  opacity: 0.55;
  transition: opacity 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.run-node--available {
  opacity: 1;
  border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  transform: translateX(4px);
  animation: node-pulse 2.4s ease-in-out infinite;
}

.run-node--cleared {
  opacity: 0.75;
}

.run-node--failed {
  opacity: 0.7;
  border-color: color-mix(in srgb, var(--color-fire) 40%, transparent);
}

.run-node--boss.run-node--available,
.run-node--boss.run-node--locked {
  border-color: color-mix(in srgb, var(--color-fire) 35%, transparent);
}

.run-node__index {
  position: relative;
  z-index: 1;
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-family: var(--font-display);
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  background: var(--color-bg);
}

.run-node--available .run-node__index {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.run-node__title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  line-height: 1.2;
}

.run-node__boss {
  margin-left: 0.4rem;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-fire);
  vertical-align: middle;
}

.run-node__hint {
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--color-ink-muted);
  line-height: 1.35;
}

.run-node__status {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.run-event {
  padding: 1.25rem 1.35rem;
  border: 1px solid color-mix(in srgb, var(--color-accent-soft) 40%, transparent);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-bg-soft) 90%, transparent),
      color-mix(in srgb, var(--color-bg) 95%, transparent)
    );
  animation: event-in 0.4s ease;
}

.run-event__title {
  font-family: var(--font-display);
  font-size: 1.35rem;
}

.run-event__desc {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-ink-muted);
  line-height: 1.45;
  max-width: 36rem;
}

.run-event__choices {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
}

.run-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

@keyframes node-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }
}

@keyframes event-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMissionsStore } from '../stores/missions'
import { useCombatStore } from '../stores/combat'
import VictoryRewards from '../components/combat/VictoryRewards.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import PerspectiveCardGrid from '../components/ui/PerspectiveCardGrid.vue'
import { missionHeroTiles } from '../utils/heroTiles'
import AppIcon from '../components/ui/AppIcon.vue'
import { missionRankTone } from '../utils/missionVisuals'
import {
  localizedDescription,
  localizedField,
  localizedName,
} from '../utils/localeContent.js'

defineOptions({ name: 'MissionRunView' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const missions = useMissionsStore()
const combat = useCombatStore()

const localError = ref(null)
const runTiles = missionHeroTiles(6)

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
  return localizedName(m, locale.value, t('combat.runTitle'))
})

function nodeLabel(node) {
  if (node.type === 'combat') {
    if (node.boss) return t('combat.nodeBoss')
    return t('combat.nodeCombat')
  }
  return localizedName(node, locale.value)
}

function nodeHint(node) {
  if (node.type === 'event') {
    return localizedDescription(node, locale.value)
  }
  const enemy = (missions.enemies || []).find((e) => e.id === node.templateId)
  if (enemy) return localizedName(enemy, locale.value)
  return node.templateId || ''
}

function nodeShape(node) {
  if (node.boss) return 'lozenge'
  return node.type === 'event' ? 'circle' : 'square'
}

const hpPct = computed(() =>
  Math.max(0, Math.min(100, Math.round((player.value.hp / (player.value.maxHp || 1)) * 100)))
)

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
  <div class="page-shell" data-testid="mission-run-page">
    <PageHeader
      index="07"
      layout="stage"
      :tone="run?.mission?.rank ? missionRankTone(run.mission.rank) : 'leaf'"
      :kicker="t('combat.runKicker')"
      :title="missionTitle"
      :lead="t('combat.runLead')"
    >
      <template #aside>
        <PerspectiveCardGrid :tiles="runTiles" intensity="soft" :count="6" />
      </template>
      <template #actions>
        <button type="button" class="btn-ghost" @click="backToMissions">
          <AppIcon name="arrow-left" size="1rem" />
          {{ t('combat.backToMissions') }}
        </button>
      </template>
    </PageHeader>

    <p v-if="missions.error || localError" class="alert alert--error mt-4">
      {{ localError || missions.error }}
    </p>

    <p v-if="missions.loading && !run" class="mt-8 text-ink-muted">
      {{ t('combat.loading') }}
    </p>

    <template v-if="run">
      <div class="run-status" data-testid="run-status">
        <div class="run-status__hp">
          <div class="run-status__hp-row">
            <span class="run-status__label">{{ t('combat.runHp') }}</span>
            <span class="run-status__num">
              <strong>{{ player.hp }}</strong> / {{ player.maxHp }}
            </span>
          </div>
          <div class="run-status__bar">
            <div class="run-status__fill" :style="{ width: `${hpPct}%` }" />
          </div>
        </div>
        <p class="run-status__scrap">
          {{ t('combat.runScrap', { n: player.scrap || 0 }) }}
        </p>
      </div>

      <VictoryRewards
        v-if="isOver"
        class="mt-8 max-w-xl"
        :state="run.state === 'victory' ? 'victory' : run.state === 'abandoned' ? 'forfeited' : 'defeat'"
        :rewards="run.rewards"
        :continue-label="t('combat.backToMissions')"
        @dismiss="backToMissions"
      />

      <ol v-else class="run-path" data-testid="run-path">
        <li
          v-for="(node, i) in nodes"
          :key="node.id"
          class="run-node"
          :class="[
            `run-node--${node.status}`,
            `run-node--${node.type}`,
            { 'run-node--boss': node.boss },
          ]"
          :data-tone="node.boss ? 'vermilion' : node.type === 'event' ? 'sky' : 'indigo'"
          :data-testid="`run-node-${i}`"
        >
          <div class="run-node__marker">
            <span class="run-node__index" :class="`run-node__index--${nodeShape(node)}`">
              <span>{{ i + 1 }}</span>
            </span>
          </div>
          <div class="run-node__body">
            <p class="run-node__title">
              {{ nodeLabel(node) }}
              <span v-if="node.boss" class="badge badge--solid run-node__boss" data-tone="vermilion">
                {{ t('combat.bossTag') }}
              </span>
            </p>
            <p class="run-node__hint">{{ nodeHint(node) }}</p>
          </div>
          <span class="run-node__status">
            <AppIcon v-if="node.status === 'cleared'" name="check" size="0.95rem" :stroke-width="2.5" />
            <AppIcon v-else-if="node.status === 'locked'" name="lock" size="0.9rem" />
            {{ t(`combat.nodeStatus.${node.status}`) }}
          </span>
        </li>
      </ol>

      <section
        v-if="!isOver && missions.currentEvent"
        class="run-event"
        data-tone="sky"
        data-testid="run-event"
      >
        <span class="run-event__shape" aria-hidden="true" />
        <h2 class="run-event__title">
          {{ localizedName(missions.currentEvent, locale) }}
        </h2>
        <p class="run-event__desc">
          {{ localizedDescription(missions.currentEvent, locale) }}
        </p>
        <div class="run-event__choices">
          <button
            v-for="choice in eventChoices"
            :key="choice.id"
            type="button"
            class="btn-secondary"
            :disabled="missions.actionLoading || choice.disabled"
            @click="onChoice(choice.id)"
          >
            {{ localizedField(choice, 'label', locale) }}
          </button>
        </div>
      </section>

      <div v-if="!isOver" class="run-actions">
        <button
          v-if="!missions.currentEvent"
          type="button"
          class="btn-primary btn-lg"
          data-testid="run-enter-btn"
          :disabled="missions.actionLoading"
          @click="onEnter"
        >
          {{
            missions.actionLoading ? t('combat.starting') : t('combat.enterNode')
          }}
          <AppIcon name="arrow-right" size="1.1rem" />
        </button>
        <button
          type="button"
          class="btn-ghost"
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
  align-items: flex-end;
  gap: 1rem 2.5rem;
  margin-top: 1.75rem;
  padding: 1rem 1.25rem;
  background: var(--color-bg-card);
}

.run-status__hp {
  min-width: 14rem;
  max-width: 28rem;
  flex: 1;
}

.run-status__hp-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.4rem;
}

.run-status__label {
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.run-status__num {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
}

.run-status__num strong {
  font-size: 2.25rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  color: var(--color-ink);
}

.run-status__bar {
  height: 0.75rem;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-ink) 10%, transparent);
}

.run-status__fill {
  height: 100%;
  background: var(--color-vermilion);
  transition: width var(--dur-slow) var(--ease-out-quint);
}

.run-status__scrap {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.run-path {
  display: flex;
  flex-direction: column;
  max-width: 44rem;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}

.run-node {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  min-height: 4.5rem;
  padding: 0.5rem 1rem 0.5rem 0;
  transition:
    background var(--dur-base) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.run-node__marker {
  position: relative;
  display: grid;
  align-self: stretch;
  place-items: center;
}

.run-node__marker::before {
  content: '';
  position: absolute;
  top: -0.5rem;
  bottom: -0.5rem;
  left: 50%;
  width: 4px;
  background: var(--color-line);
  transform: translateX(-50%);
}

.run-node:first-child .run-node__marker::before {
  top: 50%;
}

.run-node:last-child .run-node__marker::before {
  bottom: 50%;
}

.run-node--cleared .run-node__marker::before {
  background: var(--color-leaf-fill);
}

.run-node__index {
  position: relative;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  background: var(--color-bg);
  box-shadow: inset 0 0 0 2px var(--color-line-strong);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-faint);
}

.run-node__index--circle {
  border-radius: 999px;
}

.run-node__index--lozenge {
  width: 2.1rem;
  height: 2.1rem;
  transform: rotate(45deg);
}

.run-node__index--lozenge > span {
  transform: rotate(-45deg);
}

.run-node--available {
  background: var(--color-bg-card);
  transform: translateX(6px);
}

.run-node--available .run-node__index {
  background: var(--tone-fill);
  box-shadow: none;
  color: var(--tone-on);
  animation: pulse-ring 1.8s ease-out infinite;
}

.run-node--cleared .run-node__index {
  background: var(--color-leaf-fill);
  box-shadow: none;
  color: var(--color-on-leaf);
}

.run-node--failed .run-node__index {
  background: var(--color-ink);
  box-shadow: none;
  color: var(--color-on-ink);
}

.run-node__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.1;
  color: var(--color-ink);
}

.run-node--locked .run-node__title {
  color: var(--color-ink-muted);
}

.run-node__hint {
  margin-top: 0.2rem;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.run-node__status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.run-node--available .run-node__status {
  color: var(--tone);
}

.run-node--cleared .run-node__status {
  color: var(--color-leaf);
}

.run-node--failed .run-node__status {
  color: var(--color-vermilion);
}

.run-event {
  position: relative;
  max-width: 44rem;
  overflow: hidden;
  margin-top: 2rem;
  padding: 1.5rem 1.5rem 1.5rem 1.75rem;
  border-left: 6px solid var(--tone-fill);
  background: var(--tone-tint);
  animation: rise-in 420ms var(--ease-out-quint) both;
}

.run-event__shape {
  position: absolute;
  top: -2.5rem;
  right: -2.5rem;
  width: 7rem;
  height: 7rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tone-fill) 28%, transparent);
}

.run-event__title {
  position: relative;
  font-family: var(--font-display);
  font-size: 1.625rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.05;
}

.run-event__desc {
  position: relative;
  max-width: 36rem;
  margin-top: 0.6rem;
  line-height: 1.5;
  color: var(--color-ink);
}

.run-event__choices {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.1rem;
}

.run-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

@media (max-width: 479px) {
  .run-node {
    grid-template-columns: 3.25rem minmax(0, 1fr);
  }

  .run-node__status {
    grid-column: 2;
    margin-top: -0.3rem;
  }
}
</style>

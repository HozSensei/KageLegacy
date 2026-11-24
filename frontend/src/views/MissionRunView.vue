<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMissionsStore } from '../stores/missions'
import { useCombatStore } from '../stores/combat'
import VictoryRewards from '../components/combat/VictoryRewards.vue'
import MissionPathTree from '../components/missions/MissionPathTree.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import { missionRankTone } from '../utils/missionVisuals'
import forestImage from '../assets/illustrations/forest-path.webp'
import {
  localizedDescription,
  localizedField,
  localizedName,
} from '../utils/localeContent.js'
import { useNotificationsStore } from '../stores/notifications.js'

defineOptions({ name: 'MissionRunView' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const missions = useMissionsStore()
const combat = useCombatStore()
const notifications = useNotificationsStore()

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

watch(
  () => [run.value?.state, run.value?.rewards, run.value?.id],
  ([state, rewards, id]) => {
    if (state === 'victory' && rewards && id != null) {
      void notifications.fetchNotifications()
    }
  }
)
const missionTitle = computed(() => {
  const m = run.value?.mission
  if (!m) return t('combat.runTitle')
  return localizedName(m, locale.value, t('combat.runTitle'))
})

const missionLead = computed(() => {
  const m = run.value?.mission
  if (!m) return t('combat.runLead')
  const brief = localizedField(m, 'brief', locale.value)
  const chapter = localizedField(m, 'chapter', locale.value)
  if (brief && chapter) return `${chapter} — ${brief}`
  return brief || t('combat.runLead')
})

const missionEpilogue = computed(() => {
  const m = run.value?.mission
  if (!m || run.value?.state !== 'victory') return ''
  return localizedField(m, 'epilogue', locale.value)
})

function nodeLabel(node) {
  if (node.type === 'mystery' && !node.revealed) {
    return t('combat.nodeMystery')
  }
  if (node.type === 'combat') {
    if (node.boss) return t('combat.nodeBoss')
    if (node.fromMystery) return t('combat.nodeMysteryCombat')
    return t('combat.nodeCombat')
  }
  if (node.type === 'shop' || node.type === 'merchant') return t('combat.nodeShop')
  if (node.type === 'rest') return t('combat.nodeRest')
  if (node.type === 'branch') return t('combat.nodeBranch')
  return localizedName(node, locale.value) || t('combat.nodeEvent')
}

function nodeHint(node) {
  if (node.status === 'skipped') return t('combat.nodeSkippedHint')
  if (node.type === 'mystery' && !node.revealed) {
    return t('combat.nodeMysteryHint')
  }
  if (node.type === 'shop' || node.type === 'merchant') return t('combat.nodeShopHint')
  if (node.type === 'rest') return t('combat.nodeRestHint')
  if (node.type === 'branch') return t('combat.nodeBranchHint')
  if (node.type === 'event' || (node.type === 'mystery' && node.revealed)) {
    return localizedDescription(node, locale.value)
  }
  const enemy = (missions.enemies || []).find((e) => e.id === node.templateId)
  if (enemy) return localizedName(enemy, locale.value)
  return node.templateId || ''
}

function nodeShape(node) {
  if (node.boss) return 'lozenge'
  if (node.type === 'shop' || node.type === 'merchant') return 'hexagon'
  if (node.type === 'branch') return 'diamond'
  if (node.type === 'rest' || node.type === 'mystery' || node.type === 'event') return 'circle'
  return 'square'
}

function nodeTone(node) {
  if (node.boss) return 'vermilion'
  if (node.type === 'shop' || node.type === 'merchant') return 'gold'
  if (node.type === 'branch' || node.type === 'rest' || node.type === 'mystery') return 'sky'
  return 'indigo'
}

/** Aperçu synchronisé avec le survol des boutons de choix d’événement. */
const focusChoiceId = ref(null)

const inventory = computed(() => {
  const slots = player.value.inventory
  if (Array.isArray(slots) && slots.length) return slots
  return [0, 1, 2, 3].map((slot) => ({ slot, itemId: null, qty: 0 }))
})
const isShopEvent = computed(() => missions.currentEvent?.eventType === 'shop')
const shopOffer = computed(() => missions.currentEvent?.offer || [])
const replaceSlot = ref(null)

function itemLabel(item) {
  return localizedField(item, 'name', locale.value) || item.id
}

function itemDesc(item) {
  return localizedField(item, 'description', locale.value) || ''
}

function slotLabel(slot) {
  if (!slot?.itemId) return t('combat.inventoryEmpty')
  return t(`combat.shopItems.${slot.itemId}`, slot.itemId)
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
      missions.activeCombat = {
        id: result.combat.id,
        missionRunId: result.combat.missionRunId || runId.value,
      }
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
    if (missions.currentEvent?.eventType === 'branch') {
      await missions.chooseBranch(runId.value, choiceId)
      return
    }
    await missions.resolveEvent(runId.value, choiceId)
  } catch (e) {
    localError.value = e.message
  }
}

async function onBuy(itemId) {
  localError.value = null
  try {
    await missions.shopBuy(runId.value, itemId, replaceSlot.value)
  } catch (e) {
    localError.value = e.message
  }
}

async function onUseSlot(slot) {
  localError.value = null
  try {
    await missions.inventoryUse(runId.value, slot)
  } catch (e) {
    localError.value = e.message
  }
}

async function onDiscardSlot(slot) {
  localError.value = null
  try {
    await missions.inventoryDiscard(runId.value, slot)
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
      :tone="run?.mission?.rank ? missionRankTone(run.mission.rank) : 'leaf'"
      :kicker="t('combat.runKicker')"
      :title="missionTitle"
      :lead="missionLead"
      :image="forestImage"
      image-position="40% 60%"
    >
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
        <p
          v-if="run?.hardMode || player.hardMode"
          class="run-status__hard"
          data-testid="run-hard-mode"
        >
          {{ t('combat.hardModeActive') }}
        </p>
        <p class="run-status__purse" data-testid="run-purse">
          {{ t('combat.runPurse', { n: player.purse ?? player.contraband ?? 0 }) }}
        </p>
      </div>

      <section
        v-if="!isOver"
        class="run-inventory"
        data-testid="run-inventory"
      >
        <h2 class="run-inventory__title">{{ t('combat.inventoryTitle') }}</h2>
        <p class="run-inventory__hint">{{ t('combat.inventoryHint') }}</p>
        <ul class="run-inventory__slots">
          <li
            v-for="slot in inventory"
            :key="slot.slot"
            class="run-inventory__slot"
            :class="{ 'run-inventory__slot--filled': slot.itemId }"
            :data-testid="`run-inv-slot-${slot.slot}`"
          >
            <p class="run-inventory__slot-label">{{ slotLabel(slot) }}</p>
            <div v-if="slot.itemId" class="run-inventory__slot-actions">
              <button
                type="button"
                class="btn-secondary btn-sm"
                :disabled="missions.actionLoading"
                @click="onUseSlot(slot.slot)"
              >
                {{ t('combat.inventoryUse') }}
              </button>
              <button
                type="button"
                class="btn-ghost btn-sm"
                :disabled="missions.actionLoading"
                @click="onDiscardSlot(slot.slot)"
              >
                {{ t('combat.inventoryDiscard') }}
              </button>
              <label class="run-inventory__replace">
                <input
                  v-model="replaceSlot"
                  type="radio"
                  name="replace-slot"
                  :value="slot.slot"
                >
                {{ t('combat.inventoryReplaceTarget') }}
              </label>
            </div>
          </li>
        </ul>
      </section>

      <p
        v-if="isOver && missionEpilogue"
        class="run-epilogue mt-6 max-w-xl"
        data-testid="run-epilogue"
      >
        <span class="run-epilogue__label">{{ t('combat.missionEpilogue') }}</span>
        {{ missionEpilogue }}
      </p>

      <VictoryRewards
        v-if="isOver"
        class="mt-8 max-w-xl"
        :state="run.state === 'victory' ? 'victory' : run.state === 'abandoned' ? 'forfeited' : 'defeat'"
        :rewards="run.rewards"
        :continue-label="t('combat.backToMissions')"
        @dismiss="backToMissions"
      />

      <MissionPathTree
        v-else
        class="mt-8"
        :nodes="nodes"
        :node-label="nodeLabel"
        :node-hint="nodeHint"
        :node-shape="nodeShape"
        :node-tone="nodeTone"
        :focus-choice-id="focusChoiceId"
      />

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

        <div v-if="isShopEvent" class="run-shop" data-testid="run-shop">
          <p class="run-shop__purse">
            {{ t('combat.runPurse', { n: missions.currentEvent.purse ?? player.purse ?? 0 }) }}
          </p>
          <ul class="run-shop__offer">
            <li v-for="item in shopOffer" :key="item.id" class="run-shop__item">
              <div>
                <p class="run-shop__name">{{ itemLabel(item) }}</p>
                <p class="run-shop__desc">{{ itemDesc(item) }}</p>
                <p class="run-shop__price">{{ t('combat.shopPrice', { n: item.price }) }}</p>
              </div>
              <button
                type="button"
                class="btn-secondary btn-sm"
                :disabled="
                  missions.actionLoading ||
                  (item.stock ?? 1) <= 0 ||
                  (missions.currentEvent.purse ?? player.purse ?? 0) < item.price
                "
                @click="onBuy(item.id)"
              >
                {{
                  (item.stock ?? 1) <= 0
                    ? t('combat.shopSoldOut')
                    : t('combat.shopBuy')
                }}
              </button>
            </li>
          </ul>
        </div>

        <div class="run-event__choices">
          <button
            v-for="choice in eventChoices"
            :key="choice.id"
            type="button"
            class="btn-secondary"
            :class="{
              'run-event__choice--preview':
                missions.currentEvent?.eventType === 'branch' && focusChoiceId === choice.id,
            }"
            :disabled="missions.actionLoading || choice.disabled"
            @mouseenter="
              missions.currentEvent?.eventType === 'branch' && (focusChoiceId = choice.id)
            "
            @focus="
              missions.currentEvent?.eventType === 'branch' && (focusChoiceId = choice.id)
            "
            @click="onChoice(choice.id)"
          >
            {{ localizedField(choice, 'label', locale) }}
            <span v-if="choice.xpMult" class="run-event__xp">
              {{ t('combat.branchXpTag', { n: choice.xpMult }) }}
            </span>
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
.run-epilogue {
  padding: 1rem 1.15rem;
  border-left: 4px solid var(--color-vermilion);
  background: color-mix(in srgb, var(--color-vermilion) 8%, var(--color-bg-card));
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--color-ink);
}

.run-epilogue__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-vermilion);
}

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

.run-status__hard {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-ink);
}

.run-status__purse {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.run-inventory {
  margin-top: 1.25rem;
  padding: 1rem 1.15rem;
  background: var(--color-bg-card);
  max-width: 44rem;
}

.run-inventory__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
}

.run-inventory__hint {
  margin: 0.35rem 0 0.85rem;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.run-inventory__slots {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.run-inventory__slot {
  display: grid;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
  border: 1px dashed var(--color-line);
}

.run-inventory__slot--filled {
  border-style: solid;
}

.run-inventory__slot-label {
  margin: 0;
  font-weight: 700;
}

.run-inventory__slot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.run-inventory__replace {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}

.run-shop {
  margin: 1rem 0;
}

.run-shop__purse {
  margin: 0 0 0.75rem;
  font-weight: 700;
}

.run-shop__offer {
  display: grid;
  gap: 0.65rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.run-shop__item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-bg-card) 80%, transparent);
}

.run-shop__name {
  margin: 0;
  font-weight: 800;
}

.run-shop__desc,
.run-shop__price {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.run-event__xp {
  margin-left: 0.35rem;
  font-size: 0.8rem;
  opacity: 0.85;
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

.run-event__choice--preview {
  box-shadow: inset 0 0 0 2px var(--color-sky-fill, #3b82a8);
}

.run-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

</style>

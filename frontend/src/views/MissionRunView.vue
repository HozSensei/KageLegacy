<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMissionsStore } from '../stores/missions'
import { useCombatStore } from '../stores/combat'
import VictoryRewards from '../components/combat/VictoryRewards.vue'
import ItemBlock from '../components/inventory/ItemBlock.vue'
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
import { isSealedScroll, shopItemEffect, shopItemName } from '../utils/missionShopItems.js'
import { buildActiveRunEffects } from '../utils/missionRunEffects.js'
import { useNotificationsStore } from '../stores/notifications.js'
import { useShopStore } from '../stores/shop.js'

defineOptions({ name: 'MissionRunView' })

const { t, locale, n } = useI18n()
const route = useRoute()
const router = useRouter()
const missions = useMissionsStore()
const combat = useCombatStore()
const notifications = useNotificationsStore()
const shop = useShopStore()

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
const purseAmount = computed(
  () => Number(player.value.purse ?? player.value.contraband ?? 0) || 0
)

watch(
  () => [run.value?.state, run.value?.rewards, run.value?.id],
  ([state, rewards, id]) => {
    if (state === 'victory' && rewards && id != null) {
      void notifications.fetchNotifications()
      // Filet si la notif de gain n’est pas encore visible / déjà connue.
      if (Number(rewards.ryos) > 0) void shop.fetchBalances()
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

const inventory = computed(() => {
  const slots = player.value.inventory
  if (Array.isArray(slots) && slots.length) return slots
  return [0, 1, 2, 3].map((slot) => ({ slot, itemId: null, qty: 0 }))
})
const isShopEvent = computed(() => missions.currentEvent?.eventType === 'shop')
const shopOffer = computed(() => missions.currentEvent?.offer || [])
const replaceSlot = ref(null)

const activeEffects = computed(() =>
  buildActiveRunEffects(player.value, {
    hardMode: Boolean(run.value?.hardMode),
    t,
  })
)

function onReplaceToggle(slot, checked) {
  if (checked) {
    replaceSlot.value = slot
    return
  }
  if (replaceSlot.value === slot) replaceSlot.value = null
}

function itemLabel(item) {
  return shopItemName(item, { t, locale: locale.value })
}

function itemDesc(item) {
  return shopItemEffect(item, { t, locale: locale.value })
}

function slotLabel(slot) {
  return shopItemName(slot?.itemId ? slot : null, { t, locale: locale.value })
}

function slotEffect(slot) {
  if (!slot?.itemId) return ''
  return shopItemEffect(slot, { t, locale: locale.value })
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
    replaceSlot.value = null
  } catch (e) {
    localError.value = e.message
  }
}

async function onUseSlot(slot) {
  localError.value = null
  const item = inventory.value.find((s) => s.slot === slot)
  if (isSealedScroll(item)) {
    localError.value = t('combat.inventorySealedHint')
    return
  }
  try {
    await missions.inventoryUse(runId.value, slot)
  } catch (e) {
    localError.value = e.message
  }
}

async function onDiscardSlot(slot) {
  localError.value = null
  const item = inventory.value.find((s) => s.slot === slot)
  if (isSealedScroll(item)) {
    const ok = window.confirm(t('combat.inventoryDiscardSealedConfirm'))
    if (!ok) return
  }
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

function backToMissions(payload) {
  missions.clearRun()
  combat.clear()
  router.push(payload?.to || { name: 'missions' })
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
      <div v-if="isOver" class="run-ending">
        <p
          v-if="missionEpilogue"
          class="run-epilogue"
          data-testid="run-epilogue"
        >
          <span class="run-epilogue__label">{{ t('combat.missionEpilogue') }}</span>
          {{ missionEpilogue }}
        </p>

        <VictoryRewards
          :state="run.state === 'victory' ? 'victory' : run.state === 'abandoned' ? 'forfeited' : 'defeat'"
          :rewards="run.rewards"
          :continue-label="t('combat.backToMissions')"
          @dismiss="backToMissions"
        />
      </div>

      <div v-else class="run-layout" data-testid="run-layout">
        <aside class="run-sidebar" data-testid="run-sidebar">
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

            <div
              v-if="activeEffects.length"
              class="run-status__effects"
              data-testid="run-effects"
            >
              <p class="run-status__effects-label">{{ t('combat.runEffectsTitle') }}</p>
              <ul class="run-status__effects-list">
                <li
                  v-for="effect in activeEffects"
                  :key="effect.key"
                  class="run-status__effect"
                  :data-testid="effect.key === 'hardMode' ? 'run-hard-mode' : undefined"
                >
                  {{ effect.label }}
                </li>
              </ul>
            </div>

            <div class="run-status__actions" data-testid="run-actions">
              <button
                v-if="!missions.currentEvent"
                type="button"
                class="btn-primary"
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
          </div>

          <section class="run-inventory" data-testid="run-inventory">
            <div class="run-inventory__head">
              <h2 class="run-inventory__title">{{ t('combat.inventoryTitle') }}</h2>
              <div
                class="run-ryos"
                data-testid="run-purse"
                :title="t('resources.ryos', { n: n(purseAmount) })"
              >
                <AppIcon name="ryos" size="1rem" aria-hidden="true" />
                <span class="run-ryos__label">{{ t('resources.names.ryos') }}</span>
                <span class="run-ryos__amount">{{ n(purseAmount) }}</span>
              </div>
            </div>
            <p class="run-inventory__hint">{{ t('combat.inventoryHint') }}</p>
            <ul class="run-inventory__slots">
              <li
                v-for="slot in inventory"
                :key="slot.slot"
                class="run-inventory__slot"
                :data-testid="`run-inv-slot-${slot.slot}`"
              >
                <ItemBlock
                  compact
                  :empty="!slot.itemId"
                  :item="slot.itemId ? slot : null"
                  :name="slotLabel(slot)"
                  :description="slotEffect(slot)"
                  :quantity="slot.itemId ? slot.qty || 1 : null"
                >
                  <template v-if="slot.itemId" #actions>
                    <button
                      v-if="!isSealedScroll(slot)"
                      type="button"
                      class="btn-secondary btn-sm"
                      :disabled="missions.actionLoading"
                      @click="onUseSlot(slot.slot)"
                    >
                      {{ t('combat.inventoryUse') }}
                    </button>
                    <p v-else class="run-inventory__sealed">
                      {{ t('combat.inventorySealedBadge') }}
                    </p>
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
                        type="checkbox"
                        name="replace-slot"
                        :checked="replaceSlot === slot.slot"
                        @change="onReplaceToggle(slot.slot, $event.target.checked)"
                      >
                      {{ t('combat.inventoryReplaceTarget') }}
                    </label>
                  </template>
                </ItemBlock>
              </li>
            </ul>
          </section>

          <section
            v-if="missions.currentEvent"
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
              <ul class="run-shop__offer">
                <li v-for="item in shopOffer" :key="item.id" class="run-shop__item">
                  <ItemBlock
                    compact
                    :item="item"
                    :name="itemLabel(item)"
                    :description="itemDesc(item)"
                    :quantity="item.stock ?? 1"
                    :meta="t('combat.shopPrice', { n: item.price })"
                  >
                    <template #actions>
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
                    </template>
                  </ItemBlock>
                </li>
              </ul>
            </div>

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
                <span v-if="choice.xpMult" class="run-event__xp">
                  {{ t('combat.branchXpTag', { n: choice.xpMult }) }}
                </span>
              </button>
            </div>
          </section>
        </aside>

        <div class="run-path" data-testid="run-stage">
          <MissionPathTree
            :nodes="nodes"
            :node-label="nodeLabel"
            :node-hint="nodeHint"
            :node-shape="nodeShape"
            :node-tone="nodeTone"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.run-ending {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.75rem;
  width: 100%;
}

.run-epilogue {
  margin: 0;
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

/* Mobile : PV → inventaire → étape active → parcours */
.run-layout {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.75rem;
  width: 100%;
}

.run-sidebar {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}

.run-path {
  min-width: 0;
}

.run-path :deep(.path-tree) {
  max-width: none;
}

@media (min-width: 960px) {
  .run-layout {
    grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
    align-items: start;
    gap: 1.5rem 2rem;
  }

  .run-sidebar {
    position: sticky;
    top: 1rem;
  }
}

.run-status {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.15rem;
  background: var(--color-bg-card);
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

.run-status__effects {
  display: grid;
  gap: 0.4rem;
}

.run-status__effects-label {
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.run-status__effects-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.run-status__effect {
  margin: 0;
  padding: 0.3rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);
  background: color-mix(in srgb, var(--color-ink) 4%, transparent);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-ink);
}

.run-status__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.run-inventory {
  padding: 1rem 1.15rem;
  background: var(--color-bg-card);
}

.run-inventory__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
}

.run-inventory__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
}

.run-ryos {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 7.5rem;
  padding: 0.4rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  background: color-mix(in srgb, var(--color-ink) 6%, var(--color-bg-card));
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.run-ryos__label {
  flex: 1;
  min-width: 0;
  opacity: 0.92;
}

.run-ryos__amount {
  font-variant-numeric: tabular-nums;
}

.run-inventory__hint {
  margin: 0.45rem 0 0.85rem;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.run-inventory__slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) and (max-width: 959px) {
  .run-inventory__slots {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.run-inventory__slot {
  min-width: 0;
  list-style: none;
}

.run-inventory__sealed {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-wood);
}

.run-inventory__replace {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  cursor: pointer;
}

.run-shop {
  margin: 1rem 0 0;
}

.run-shop__offer {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.65rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.run-shop__item {
  min-width: 0;
  list-style: none;
}

.run-event__xp {
  margin-left: 0.35rem;
  font-size: 0.8rem;
  opacity: 0.85;
}

.run-event {
  position: relative;
  overflow: hidden;
  padding: 1.25rem 1.25rem 1.25rem 1.5rem;
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
  font-size: 1.4rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.05;
}

.run-event__desc {
  position: relative;
  margin-top: 0.6rem;
  line-height: 1.5;
  color: var(--color-ink);
}

.run-event__choices {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.1rem;
}
</style>

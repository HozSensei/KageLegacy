<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import CombatArena from '../components/combat/CombatArena.vue';
import ItemBlock from '../components/inventory/ItemBlock.vue';
import MissionPathTree from '../components/missions/MissionPathTree.vue';
import VictoryRewards from '../components/combat/VictoryRewards.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import PlayerIdentityChip from '../components/player/PlayerIdentityChip.vue';
import PlayerProfileModal from '../components/player/PlayerProfileModal.vue';
import { useCoopApi } from '../composables/useCoopApi.js';
import { usePublicPlayerModal } from '../composables/usePublicPlayer.js';
import { useAuthStore } from '../stores/auth.js';
import { useNotificationsStore } from '../stores/notifications.js';
import { needsFriendlyFireConfirmation } from '../utils/coopCards.js';
import {
  localizedDescription,
  localizedField,
  localizedName,
} from '../utils/localeContent.js';
import { isSealedScroll, shopItemEffect, shopItemName } from '../utils/missionShopItems.js';
import { buildActiveRunEffects } from '../utils/missionRunEffects.js';
import { missionRankTone } from '../utils/missionVisuals';
import { useShopStore } from '../stores/shop.js';
import forestImage from '../assets/illustrations/forest-path.webp';

defineOptions({ name: 'CoopMissionRunView' });

const { t, locale, n } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const api = useCoopApi();
const notifications = useNotificationsStore();
const shop = useShopStore();
const {
  open: profileOpen,
  loading: profileLoading,
  error: profileError,
  player: profilePlayer,
  anchor: profileAnchor,
  show: showProfile,
  close: closeProfile,
} = usePublicPlayerModal();

const error = ref('');
const selectedId = ref(null);
const confirmation = ref(null);
const confirmDialog = ref(null);
const replaceSlot = ref(null);

const runId = computed(() => route.params.id);
const run = computed(() => api.run.value);
const combat = computed(() => run.value?.combat || null);
const player = computed(() => run.value?.player || {});
const nodes = computed(() => run.value?.nodes || []);
const isHost = computed(() => run.value?.role === 'host');
const isGuest = computed(() => run.value?.role === 'guest');
const isOver = computed(() =>
  ['victory', 'defeat', 'abandoned'].includes(run.value?.state)
);
const purseAmount = computed(
  () => Number(player.value.purse ?? player.value.contraband ?? 0) || 0
);
const hpPct = computed(() =>
  Math.max(
    0,
    Math.min(100, Math.round((player.value.hp / (player.value.maxHp || 1)) * 100))
  )
);
const activeEffects = computed(() =>
  buildActiveRunEffects(player.value, {
    hardMode: Boolean(run.value?.hardMode || player.value?.hardMode),
    t,
  })
);

watch(
  () => [run.value?.state, run.value?.rewards, run.value?.id],
  ([state, rewards, id]) => {
    if (state === 'victory' && rewards && id != null) {
      void notifications.fetchNotifications();
      if (Number(rewards.ryos) > 0) void shop.fetchBalances();
    }
  }
);

const event = computed(() => run.value?.currentEvent || null);
const isShop = computed(() => event.value?.eventType === 'shop');
/** Leave shop is the primary next-step CTA, not a panel choice. */
const eventChoices = computed(() =>
  (event.value?.choices || []).filter(c => c.id !== 'leave')
);
const eventTone = computed(() => {
  const type = event.value?.eventType;
  if (type === 'shop') return 'gold';
  if (type === 'rest' || type === 'mystery_heal') return 'leaf';
  return 'sky';
});
const showEnterCta = computed(() => isHost.value && (!event.value || isShop.value));
const enterCtaLabel = computed(() =>
  isShop.value ? t('combat.nextStep') : t('coop.enterNode')
);

const isMyTurn = computed(() => {
  const playerId = combat.value?.player?.id ?? auth.user?.id;
  const activeId = combat.value?.activePlayerId;
  return playerId != null && activeId != null && String(activeId) === String(playerId);
});
const canAct = computed(
  () =>
    combat.value?.state === 'in_progress' &&
    combat.value.currentPhase === 'player_turn' &&
    isMyTurn.value
);

const missionTitle = computed(() => {
  const m = run.value?.mission;
  if (!m) return t('coop.runTitle');
  return localizedName(m, locale.value, t('coop.runTitle'));
});

onMounted(async () => {
  api.run.value = { id: runId.value, state: 'in_progress' };
  try {
    await api.refresh();
  } catch (err) {
    error.value = err.message || t('coop.requestError');
  }
});

watch(combat, () => {
  if (!canAct.value || !findCard(selectedId.value)) selectedId.value = null;
});

watch(
  confirmation,
  pending => {
    const dialog = confirmDialog.value;
    if (pending && !dialog?.open) dialog?.showModal();
    else if (!pending && dialog?.open) dialog.close();
  },
  { flush: 'post' }
);

function findCard(id) {
  return combat.value?.player?.hand?.find(card => card.instanceId === id);
}

async function wrap(fn) {
  if (api.busy.value) return;
  error.value = '';
  try {
    await fn();
  } catch (err) {
    error.value = err.message || t('coop.requestError');
  }
}

function nodeLabel(node) {
  if (node.type === 'combat') return node.boss ? t('combat.nodeBoss') : t('combat.nodeCombat');
  if (node.type === 'shop' || node.type === 'merchant') return t('combat.nodeShop');
  if (node.type === 'rest') return t('combat.nodeRest');
  if (node.type === 'branch') return t('combat.nodeBranch');
  return localizedName(node, locale.value) || t('combat.nodeEvent');
}

function nodeHint(node) {
  if (node.status === 'skipped') return t('combat.nodeSkippedHint');
  if (node.type === 'shop' || node.type === 'merchant') return t('combat.nodeShopHint');
  if (node.type === 'rest') return t('combat.nodeRestHint');
  if (node.type === 'branch') return t('combat.nodeBranchHint');
  if (node.type === 'combat') {
    // Nom localisé enrichi côté API — jamais le slug templateId.
    return localizedName(node, locale.value) || '';
  }
  return localizedDescription(node, locale.value) || '';
}

function nodeShape(node) {
  if (node.boss) return 'lozenge';
  if (node.type === 'shop' || node.type === 'merchant') return 'hexagon';
  if (node.type === 'branch') return 'diamond';
  if (node.type === 'rest' || node.type === 'mystery' || node.type === 'event') return 'circle';
  return 'square';
}

function nodeTone(node) {
  if (node.boss) return 'vermilion';
  if (node.type === 'shop' || node.type === 'merchant') return 'gold';
  if (node.type === 'branch' || node.type === 'rest' || node.type === 'mystery') return 'sky';
  return 'indigo';
}

const inventory = computed(() => {
  const slots = player.value.inventory;
  if (Array.isArray(slots) && slots.length) return slots;
  return [0, 1, 2, 3].map(slot => ({ slot, itemId: null, qty: 0 }));
});

function itemLabel(item) {
  return shopItemName(item, { t, locale: locale.value });
}

function itemDesc(item) {
  return shopItemEffect(item, { t, locale: locale.value });
}

function slotLabel(slot) {
  return shopItemName(slot?.itemId ? slot : null, { t, locale: locale.value });
}

function slotEffect(slot) {
  if (!slot?.itemId) return '';
  return shopItemEffect(slot, { t, locale: locale.value });
}

function itemStock(item) {
  return item?.stock ?? 1;
}

function onReplaceToggle(slot, checked) {
  if (checked) {
    replaceSlot.value = slot;
    return;
  }
  if (replaceSlot.value === slot) replaceSlot.value = null;
}

async function enterAvailableNode() {
  if (isOver.value || run.value?.state !== 'in_progress') return;
  if (event.value) return;
  if (combat.value) return;
  await wrap(() => api.enterNode(runId.value));
}

async function onEnter() {
  // Boutique ouverte : le chef avance (leave) puis enchaîne sur le nœud suivant.
  if (isShop.value) {
    await wrap(() => api.resolveEvent(runId.value, 'leave'));
  }
  await enterAvailableNode();
}

async function onNodeReady(ready = true) {
  await wrap(() => api.setNodeReady(runId.value, ready));
}

async function onBuy(itemId) {
  await wrap(() => api.shopBuy(runId.value, itemId, replaceSlot.value));
  replaceSlot.value = null;
}

async function onUse(slot) {
  const item = inventory.value.find(s => s.slot === slot);
  if (isSealedScroll(item)) {
    error.value = t('combat.inventorySealedHint');
    return;
  }
  await wrap(() => api.inventoryUse(runId.value, slot));
}

async function onDiscard(slot) {
  const item = inventory.value.find(s => s.slot === slot);
  if (isSealedScroll(item)) {
    const ok = window.confirm(t('combat.inventoryDiscardSealedConfirm'));
    if (!ok) return;
  }
  await wrap(() => api.inventoryDiscard(runId.value, slot));
}

async function onResolve(choiceId) {
  const wasBranch = event.value?.eventType === 'branch';
  await wrap(() => api.resolveEvent(runId.value, choiceId));
  // Carrefour : le chef choisit le sentier, puis clique « Entrer » pour avancer.
  if (wasBranch) return;
  // Halte / mystère : un clic résout et entre dans le nœud suivant.
  await enterAvailableNode();
}

/** Id de l’étape disponible qui accueille le panneau événement. */
const eventHostNodeId = computed(() => {
  if (!event.value) return null;
  const host = nodes.value.find(
    n =>
      n.status === 'available' &&
      ['shop', 'merchant', 'rest', 'branch', 'mystery', 'event'].includes(n.type)
  );
  return host?.id || null;
});

async function onAbandon() {
  if (!confirm(t('coop.confirmAbandon'))) return;
  await wrap(async () => {
    await api.abandon(runId.value);
    router.push({ name: 'coop' });
  });
}

function cardInstanceId(cardOrId) {
  if (cardOrId == null) return null;
  if (typeof cardOrId === 'string') return cardOrId;
  return cardOrId.instanceId || null;
}

async function sendAction(type, cardOrId, target = 'enemy', confirmedFriendlyFire = false) {
  if (api.busy.value || confirmation.value) return;
  if (type !== 'forfeit' && !canAct.value) return;
  const instanceId = cardInstanceId(cardOrId) || selectedId.value;
  error.value = '';
  if (
    type === 'play' &&
    target === 'ally' &&
    needsFriendlyFireConfirmation(findCard(instanceId) || cardOrId) &&
    !confirmedFriendlyFire
  ) {
    confirmation.value = {
      instanceId,
      allyId: combat.value.ally?.id,
      turn: combat.value.currentTurn,
      cardName: localizedName(findCard(instanceId) || cardOrId, locale.value),
      allyName: combat.value.ally?.name || '',
    };
    return;
  }
  try {
    await api.combatAction(runId.value, {
      type,
      ...(instanceId ? { instanceId } : {}),
      ...(type === 'play' ? { target, confirmedFriendlyFire } : {}),
    });
    confirmation.value = null;
    selectedId.value = null;
  } catch (err) {
    if (err.code === 'FRIENDLY_FIRE_CONFIRMATION') {
      confirmation.value = {
        instanceId,
        allyId: combat.value.ally?.id,
        turn: combat.value.currentTurn,
        cardName: localizedName(findCard(instanceId) || cardOrId, locale.value),
        allyName: combat.value.ally?.name || '',
      };
      return;
    }
    error.value = err.message || t('coop.requestError');
  }
}

function confirmFriendlyFire() {
  const pending = confirmation.value;
  if (!pending) return;
  sendAction('play', pending.instanceId, 'ally', true);
}

function cancelConfirm() {
  confirmation.value = null;
}
</script>

<template>
  <div
    class="page-shell coop-run"
    :class="{ 'coop-run--combat': Boolean(combat) }"
    data-testid="coop-run-page"
  >
    <PageHeader
      v-if="!combat"
      :title="missionTitle"
      :tone="missionRankTone(run?.mission?.rank)"
      :image="forestImage"
      image-position="40% 60%"
    />

    <p v-if="api.pollFailed.value" class="alert alert--info" role="status">
      {{ t('coop.pollError') }}
    </p>
    <p v-if="error" class="alert alert--danger" role="alert">{{ error }}</p>

    <template v-if="run && !combat">
      <VictoryRewards
        v-if="isOver"
        class="mt-8 max-w-xl"
        :state="run.state === 'victory' ? 'victory' : run.state === 'abandoned' ? 'forfeited' : 'defeat'"
        :rewards="run.rewards"
        :continue-label="t('coop.backToLobby')"
        @dismiss="payload => router.push(payload?.to || { name: 'coop' })"
      />

      <div v-else class="run-layout" data-testid="coop-run-layout">
        <aside class="run-sidebar" data-testid="coop-run-sidebar">
          <div class="run-status" data-testid="coop-run-status">
            <p class="run-status__role">
              {{ isHost ? t('coop.hostHint') : t('coop.guestHint') }}
            </p>
            <div class="run-status__hp">
              <div class="run-status__hp-row">
                <span class="run-status__label">{{ t('combat.runHp') }}</span>
                <span class="run-status__num">
                  <strong>{{ player.hp ?? 0 }}</strong> / {{ player.maxHp ?? 0 }}
                </span>
              </div>
              <div class="run-status__bar">
                <div class="run-status__fill" :style="{ width: `${hpPct}%` }" />
              </div>
            </div>

            <div v-if="run.ally" class="run-status__ally">
              <PlayerIdentityChip
                :user-id="run.ally.userId"
                :name="run.ally.name || t('combat.allyLabel')"
                :profile="run.ally.profile"
                :level="run.ally.level"
                @open="showProfile"
              />
              <span class="run-status__ally-hp">
                {{ t('coop.allyHp', { hp: run.ally.hp, max: run.ally.maxHp }) }}
              </span>
            </div>

            <div
              v-if="activeEffects.length"
              class="run-status__effects"
              data-testid="coop-run-effects"
            >
              <p class="run-status__effects-label">{{ t('combat.runEffectsTitle') }}</p>
              <ul class="run-status__effects-list">
                <li
                  v-for="effect in activeEffects"
                  :key="effect.key"
                  class="run-status__effect"
                >
                  {{ effect.label }}
                </li>
              </ul>
            </div>

            <div class="run-status__actions" data-testid="coop-run-actions">
              <button
                v-if="showEnterCta"
                type="button"
                class="btn-primary"
                :disabled="api.busy.value || (isShop && !run.guestNodeReady)"
                data-testid="coop-enter-node"
                @click="onEnter"
              >
                {{ enterCtaLabel }}
                <AppIcon name="arrow-right" size="1.1rem" />
              </button>
              <p v-else-if="isGuest && !event" class="run-status__waiting">
                {{ t('coop.waitingHostEnter') }}
              </p>
              <button
                type="button"
                class="btn-ghost"
                :disabled="api.busy.value"
                @click="onAbandon"
              >
                {{ t('coop.abandon') }}
              </button>
            </div>
          </div>

          <section class="run-inventory" data-testid="coop-inventory">
            <div class="run-inventory__head">
              <h2 class="run-inventory__title">{{ t('coop.inventory') }}</h2>
              <div
                class="run-ryos"
                data-testid="coop-run-purse"
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
                :data-testid="`coop-inv-slot-${slot.slot}`"
              >
                <ItemBlock
                  compact
                  effect-popover
                  :empty="!slot.itemId"
                  :item="slot.itemId ? slot : null"
                  :name="slotLabel(slot)"
                  :description="slotEffect(slot)"
                  :quantity="slot.itemId ? slot.qty || 1 : null"
                >
                  <template v-if="slot.itemId" #actions>
                    <div class="run-inventory__row">
                      <button
                        v-if="!isSealedScroll(slot)"
                        type="button"
                        class="btn-secondary btn-sm"
                        :disabled="api.busy.value"
                        @click="onUse(slot.slot)"
                      >
                        {{ t('coop.useItem') }}
                      </button>
                      <span v-else class="run-inventory__sealed">
                        {{ t('combat.inventorySealedBadge') }}
                      </span>
                      <button
                        type="button"
                        class="run-inventory__discard"
                        :aria-label="t('coop.discardItem')"
                        :title="t('coop.discardItem')"
                        :disabled="api.busy.value"
                        data-testid="coop-inv-discard"
                        @click="onDiscard(slot.slot)"
                      >
                        <AppIcon name="delete" size="1rem" :stroke-width="0" />
                      </button>
                    </div>
                    <label class="run-inventory__replace">
                      <input
                        type="checkbox"
                        name="coop-replace-slot"
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
        </aside>

        <div class="run-path" data-testid="coop-run-stage">
          <MissionPathTree
            :nodes="nodes"
            :detail-node-id="eventHostNodeId"
            :node-label="nodeLabel"
            :node-hint="nodeHint"
            :node-shape="nodeShape"
            :node-tone="nodeTone"
          >
            <template #node-detail>
              <section
                class="run-event"
                :data-tone="eventTone"
                data-testid="coop-event"
              >
                <span class="run-event__shape" aria-hidden="true" />
                <h2 class="run-event__title">{{ localizedName(event, locale) }}</h2>
                <p class="run-event__desc">
                  {{
                    localizedField(event, 'description', locale) ||
                    localizedDescription(event, locale)
                  }}
                </p>

                <p v-if="isGuest" class="run-event__ready-hint">
                  {{ run.guestNodeReady ? t('coop.youAreNodeReady') : t('coop.markNodeReady') }}
                </p>
                <p v-else class="run-event__ready-hint">
                  {{
                    run.guestNodeReady
                      ? t('coop.guestNodeReady')
                      : t('coop.waitingGuestNodeReady')
                  }}
                </p>

                <div v-if="isShop" class="run-shop" data-testid="coop-shop">
                  <p class="run-shop__hint">{{ t('combat.shopSharedStockHint') }}</p>
                  <ul class="run-shop__offer">
                    <li v-for="item in event.offer || []" :key="item.id" class="run-shop__item">
                      <ItemBlock
                        compact
                        effect-popover
                        :item="item"
                        :name="itemLabel(item)"
                        :description="itemDesc(item)"
                        :quantity="itemStock(item)"
                        :meta="t('combat.shopPrice', { n: item.price })"
                      >
                        <template #actions>
                          <button
                            type="button"
                            class="btn-secondary btn-sm"
                            :disabled="
                              api.busy.value ||
                              itemStock(item) <= 0 ||
                              (event.purse ?? player.purse ?? 0) < item.price
                            "
                            @click="onBuy(item.id)"
                          >
                            {{
                              itemStock(item) <= 0
                                ? t('combat.shopSoldOut')
                                : t('combat.shopBuy')
                            }}
                          </button>
                        </template>
                      </ItemBlock>
                    </li>
                  </ul>
                </div>

                <div
                  v-if="isGuest || eventChoices.length"
                  class="run-event__choices"
                >
                  <button
                    v-if="isGuest"
                    type="button"
                    class="btn-primary"
                    data-testid="coop-node-ready"
                    :disabled="api.busy.value"
                    @click="onNodeReady(!run.guestNodeReady)"
                  >
                    {{ run.guestNodeReady ? t('coop.unready') : t('coop.ready') }}
                  </button>
                  <template v-if="isHost">
                    <button
                      v-for="choice in eventChoices"
                      :key="choice.id"
                      type="button"
                      class="btn-primary"
                      :disabled="api.busy.value || !run.guestNodeReady"
                      @click="onResolve(choice.id)"
                    >
                      {{
                        localizedField(choice, 'label', locale) ||
                        (choice.lengthHint === 'short'
                          ? t('combat.pathShort')
                          : choice.lengthHint === 'long'
                            ? t('combat.pathLong')
                            : t('combat.pathChoiceFallback'))
                      }}
                    </button>
                  </template>
                </div>
              </section>
            </template>
          </MissionPathTree>
        </div>
      </div>
    </template>

    <template v-else-if="combat">
      <h1 class="sr-only">{{ missionTitle }}</h1>
      <p v-if="!isMyTurn && combat.state === 'in_progress'" class="alert alert--info" role="status">
        {{ t('coop.asyncWaitingTurn') }}
      </p>
      <CombatArena
        :combat="combat"
        :logs="combat.logs || []"
        :selected-id="selectedId"
        :busy="api.busy.value"
        :coop-turn="isMyTurn"
        @select-card="selectedId = $event.instanceId"
        @play-card="sendAction('play', $event, 'enemy')"
        @play-on-ally="sendAction('play', $event, 'ally')"
        @discard-chakra="sendAction('discard_chakra', $event)"
        @discard-draw="sendAction('discard_draw', $event)"
        @end-turn="sendAction('end_turn')"
        @forfeit="sendAction('forfeit')"
        @dismiss-outcome="api.refresh()"
      />
      <dialog ref="confirmDialog" class="confirm-dialog" @cancel.prevent="cancelConfirm">
        <h2>{{ t('coop.confirmTitle') }}</h2>
        <p v-if="confirmation">
          {{
            t('coop.confirmMessage', {
              card: confirmation.cardName,
              ally: confirmation.allyName,
            })
          }}
        </p>
        <div class="confirm-dialog__actions">
          <button type="button" class="btn-secondary" @click="cancelConfirm">{{ t('coop.cancel') }}</button>
          <button type="button" class="btn-primary" @click="confirmFriendlyFire">
            {{ t('coop.confirmAction') }}
          </button>
        </div>
      </dialog>
    </template>

    <PlayerProfileModal
      :open="profileOpen"
      :loading="profileLoading"
      :error="profileError"
      :player="profilePlayer"
      :anchor="profileAnchor"
      @close="closeProfile"
    />
  </div>
</template>

<style scoped>
.coop-run--combat {
  /* Écarte le bandeau TOUR de la bordure basse de l’app-bar (comme combat-shell). */
  padding-top: 1.25rem;
}

/* Aligné sur MissionRunView : PV → inventaire → étape → parcours */
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

.run-status__role {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
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

.run-status__ally {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.run-status__ally-hp {
  font-size: 0.875rem;
  color: var(--color-ink-muted);
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
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
}

.run-status__actions .btn-primary,
.run-status__actions .btn-ghost {
  width: 100%;
}

.run-status__waiting {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.run-inventory {
  padding: 1rem 1.15rem;
  background: var(--color-bg-card);
}

.run-inventory__head {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
}

.run-inventory__title {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.2;
}

.run-ryos {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  background: color-mix(in srgb, var(--color-ink) 6%, var(--color-bg-card));
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
  white-space: nowrap;
}

.run-ryos__label {
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

.run-inventory__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 100%;
  min-width: 0;
}

.run-inventory__discard {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    color var(--dur-fast, 120ms) ease,
    background-color var(--dur-fast, 120ms) ease;
}

.run-inventory__discard:hover:not(:disabled),
.run-inventory__discard:focus-visible {
  color: var(--color-ink);
  background: color-mix(in srgb, var(--color-ink) 8%, transparent);
  outline: none;
}

.run-inventory__discard:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.run-inventory__sealed {
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

.run-shop__hint {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
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

.run-event {
  position: relative;
  overflow: hidden;
  padding: 1.25rem 1.25rem 1.25rem 1.5rem;
  border-left: 6px solid var(--tone-fill);
  /* Fond soft distinct des ItemBlock (--tone-tint) et de l’inventaire (--color-bg-card). */
  background: var(--color-bg-soft);
  outline: 1px solid color-mix(in srgb, var(--tone-fill) 28%, var(--color-line));
  outline-offset: -1px;
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

.run-event__ready-hint {
  position: relative;
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.run-event__choices {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.6rem;
  margin-top: 1.1rem;
}

.confirm-dialog {
  border: 1px solid var(--border, #444);
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 24rem;
}

.confirm-dialog__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>

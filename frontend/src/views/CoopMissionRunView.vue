<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import CombatArena from '../components/combat/CombatArena.vue';
import MissionPathTree from '../components/missions/MissionPathTree.vue';
import VictoryRewards from '../components/combat/VictoryRewards.vue';
import PageHeader from '../components/ui/PageHeader.vue';
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
import { missionRankTone } from '../utils/missionVisuals';
import { useShopStore } from '../stores/shop.js';

defineOptions({ name: 'CoopMissionRunView' });

const { t, locale } = useI18n();
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
  if (node.type === 'shop' || node.type === 'merchant') return t('combat.nodeShopHint');
  if (node.type === 'rest') return t('combat.nodeRestHint');
  if (node.type === 'branch') return t('combat.nodeBranchHint');
  return localizedDescription(node, locale.value) || node.templateId || '';
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

async function onEnter() {
  await wrap(() => api.enterNode(runId.value));
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
  await wrap(() => api.resolveEvent(runId.value, choiceId));
}

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
    />

    <p v-if="api.pollFailed.value" class="alert alert--info" role="status">
      {{ t('coop.pollError') }}
    </p>
    <p v-if="error" class="alert alert--danger" role="alert">{{ error }}</p>

    <template v-if="run && !combat">
      <div class="coop-run__status">
        <p class="text-ink-muted">
          {{ isHost ? t('coop.hostHint') : t('coop.guestHint') }}
          —
          {{ t('coop.hp', { hp: player.hp ?? 0, max: player.maxHp ?? 0 }) }}
          /
          {{ t('coop.purse', { n: player.purse || 0 }) }}
        </p>
        <div v-if="run.ally" class="coop-run__ally">
          <PlayerIdentityChip
            :user-id="run.ally.userId"
            :name="run.ally.name || t('combat.allyLabel')"
            :profile="run.ally.profile"
            :level="run.ally.level"
            @open="showProfile"
          />
          <span class="text-ink-muted">
            {{ t('coop.allyHp', { hp: run.ally.hp, max: run.ally.maxHp }) }}
          </span>
        </div>
      </div>

      <!-- Inventaire hors combat (comme en solo) : utilisable entre les étapes, pas seulement en boutique. -->
      <section
        v-if="!isOver"
        class="coop-run__inventory"
        data-testid="coop-inventory"
      >
        <h3>{{ t('coop.inventory') }}</h3>
        <p class="coop-run__inventory-hint">{{ t('combat.inventoryHint') }}</p>
        <div
          v-for="slot in inventory"
          :key="slot.slot"
          class="coop-run__slot"
          :class="{ 'coop-run__slot--filled': slot.itemId }"
        >
          <div class="coop-run__slot-copy">
            <span class="coop-run__slot-label">{{ slotLabel(slot) }}</span>
            <span v-if="slotEffect(slot)" class="coop-run__slot-effect">
              {{ slotEffect(slot) }}
            </span>
          </div>
          <button
            v-if="slot.itemId && !isSealedScroll(slot)"
            type="button"
            class="btn-ghost btn-sm"
            :disabled="api.busy.value"
            @click="onUse(slot.slot)"
          >
            {{ t('coop.useItem') }}
          </button>
          <span v-else-if="slot.itemId" class="coop-run__sealed">
            {{ t('combat.inventorySealedBadge') }}
          </span>
          <button
            v-if="slot.itemId"
            type="button"
            class="btn-ghost btn-sm"
            :disabled="api.busy.value"
            @click="onDiscard(slot.slot)"
          >
            {{ t('coop.discardItem') }}
          </button>
          <label v-if="slot.itemId && isShop" class="coop-run__replace">
            <input
              v-model="replaceSlot"
              type="radio"
              name="coop-replace-slot"
              :value="slot.slot"
            >
            {{ t('combat.inventoryReplaceTarget') }}
          </label>
        </div>
      </section>

      <MissionPathTree
        :nodes="nodes"
        :node-label="nodeLabel"
        :node-hint="nodeHint"
        :node-shape="nodeShape"
        :node-tone="nodeTone"
      />

      <div v-if="!isOver && !event" class="coop-run__actions">
        <button
          v-if="isHost"
          type="button"
          class="btn-primary"
          :disabled="api.busy.value"
          data-testid="coop-enter-node"
          @click="onEnter"
        >
          {{ t('coop.enterNode') }}
        </button>
        <p v-else class="text-ink-muted">{{ t('coop.waitingHostEnter') }}</p>
      </div>

      <section v-if="event" class="panel coop-run__event" data-testid="coop-event">
        <h2 class="t-subheading">{{ localizedName(event, locale) }}</h2>
        <p>{{ localizedField(event, 'description', locale) || localizedDescription(event, locale) }}</p>

        <p v-if="isGuest" class="text-ink-muted">
          {{ run.guestNodeReady ? t('coop.youAreNodeReady') : t('coop.markNodeReady') }}
        </p>
        <p v-else class="text-ink-muted">
          {{
            run.guestNodeReady ? t('coop.guestNodeReady') : t('coop.waitingGuestNodeReady')
          }}
        </p>

        <div v-if="isShop" class="coop-run__shop" data-testid="coop-shop">
          <p class="coop-run__shop-purse">
            {{ t('combat.runPurse', { n: event.purse ?? player.purse ?? 0 }) }}
          </p>
          <p class="coop-run__shop-hint">{{ t('combat.shopSharedStockHint') }}</p>
          <ul class="coop-run__shop-offer">
            <li v-for="item in event.offer || []" :key="item.id" class="coop-run__shop-item">
              <div>
                <p class="coop-run__shop-name">{{ itemLabel(item) }}</p>
                <p v-if="itemDesc(item)" class="coop-run__shop-desc">{{ itemDesc(item) }}</p>
                <p class="coop-run__shop-meta">
                  {{ t('combat.shopPrice', { n: item.price }) }}
                  ·
                  {{
                    itemStock(item) <= 0
                      ? t('combat.shopSoldOut')
                      : t('combat.shopStock', { n: itemStock(item) })
                  }}
                </p>
              </div>
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
                  itemStock(item) <= 0 ? t('combat.shopSoldOut') : t('combat.shopBuy')
                }}
              </button>
            </li>
          </ul>
        </div>

        <div class="coop-run__actions">
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
              v-for="choice in event.choices || []"
              :key="choice.id"
              type="button"
              class="btn-primary"
              :disabled="api.busy.value || !run.guestNodeReady"
              @click="onResolve(choice.id)"
            >
              {{ localizedField(choice, 'label', locale) || choice.id }}
            </button>
          </template>
        </div>
      </section>

      <VictoryRewards
        v-if="isOver"
        class="mt-8 max-w-xl"
        :state="run.state === 'victory' ? 'victory' : run.state === 'abandoned' ? 'forfeited' : 'defeat'"
        :rewards="run.rewards"
        :continue-label="t('coop.backToLobby')"
        @dismiss="router.push({ name: 'coop' })"
      />

      <button
        v-if="!isOver"
        type="button"
        class="btn-ghost"
        :disabled="api.busy.value"
        @click="onAbandon"
      >
        {{ t('coop.abandon') }}
      </button>
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

.coop-run__status {
  display: grid;
  gap: 0.35rem;
}

.coop-run__ally {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.coop-run__actions,
.coop-run__shop,
.coop-run__event {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.coop-run__inventory {
  display: grid;
  gap: 0.65rem;
  margin-top: 1.25rem;
  padding: 1rem 1.15rem;
  background: var(--color-bg-card);
  max-width: 44rem;
}

.coop-run__shop-purse {
  margin: 0;
  font-weight: 700;
}

.coop-run__shop-hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.coop-run__shop-offer {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.coop-run__shop-item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-bg-card) 80%, transparent);
}

.coop-run__shop-name {
  margin: 0;
  font-weight: 800;
}

.coop-run__shop-desc,
.coop-run__shop-meta {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.coop-run__sealed {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-wood);
}

.coop-run__inventory-hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.coop-run__slot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border: 1px dashed var(--color-line);
}

.coop-run__slot--filled {
  border-style: solid;
}

.coop-run__slot-copy {
  flex: 1 1 10rem;
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.coop-run__slot-label {
  font-weight: 700;
}

.coop-run__slot-effect {
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.coop-run__replace {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-ink-muted);
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

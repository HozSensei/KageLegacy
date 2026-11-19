<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CombatHand from '../combat/CombatHand.vue';
import CombatHeaderLog from '../combat/CombatHeaderLog.vue';
import CombatDropZones from '../combat/CombatDropZones.vue';
import PlayerStatus from '../combat/PlayerStatus.vue';

defineOptions({ name: 'PvpArena' });

const props = defineProps({
  view: { type: Object, required: true },
  role: { type: String, required: true },
  previousCardStatType: { type: String, default: null },
  logs: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  busy: { type: Boolean, default: false },
  peerOnline: { type: Boolean, default: false },
});

const emit = defineEmits([
  'select-card',
  'play-card',
  'end-turn',
  'discard-chakra',
  'reserve-card',
  'forfeit',
  'dismiss-outcome',
]);

const { t } = useI18n();

const self = computed(() => props.view?.fighters?.[props.role] || null);
const opponentSeat = computed(() => (props.role === 'host' ? 'guest' : 'host'));
const opponent = computed(() => props.view?.fighters?.[opponentSeat.value] || null);

const isOver = computed(() => ['completed', 'forfeited'].includes(props.view?.status));

const canAct = computed(
  () => props.view?.status === 'in_progress' && props.view?.activeSeat === props.role && !props.busy
);

function isDropDisabled(action) {
  return (
    !canAct.value ||
    (action !== 'play' && (self.value?.discardedForChakra || !!self.value?.reservedCard))
  );
}

const hoveredZone = ref(null);
const isDraggingCard = ref(false);

function onDropIntent(intent) {
  const action = intent?.action;
  if (!['play', 'discard', 'reserve'].includes(action) || isDropDisabled(action)) return;
  const instanceId = intent?.card?.instanceId;
  if (!instanceId) return;
  const card = (self.value?.hand || []).find(item => item.instanceId === instanceId);
  if (!card) return;
  emit(
    action === 'play' ? 'play-card' : action === 'discard' ? 'discard-chakra' : 'reserve-card',
    action === 'play' ? card : card.instanceId
  );
}

const isMyTurn = computed(() => props.view?.activeSeat === props.role);
const turnNumber = computed(() => String(props.view?.turn ?? 0).padStart(2, '0'));

const opponentPlayer = computed(() => ({
  name: opponent.value?.name || t('pvp.opponent'),
  hp: opponent.value?.hp,
  maxHp: opponent.value?.maxHp,
  block: opponent.value?.block,
  chakra: opponent.value?.chakra,
  maxChakra: opponent.value?.maxChakra,
  statuses: opponent.value?.statuses || [],
  ally: opponent.value?.ally || null,
  hand: [],
  drawCount: opponent.value?.drawCount,
  discardCount: opponent.value?.discardCount,
}));

const selfPlayer = computed(() => ({
  ...(self.value || {}),
  name: self.value?.name || t('pvp.you'),
}));

/* Bandeau éphémère à chaque changement de main (affichage seul). */
const banner = ref(false);
let bannerTimer = null;

watch(
  () => `${props.view?.turn}:${props.view?.activeSeat}`,
  (next, prev) => {
    if (!prev || next === prev || props.view?.status !== 'in_progress') return;
    banner.value = true;
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      banner.value = false;
    }, 900);
  }
);

onBeforeUnmount(() => {
  if (bannerTimer) clearTimeout(bannerTimer);
});

function confirmEndTurn() {
  if (!canAct.value) return;
  const chakra = Number(self.value?.chakra) || 0;
  if (chakra <= 1 || window.confirm(t('combat.endTurnConfirm', { n: chakra }))) {
    emit('end-turn');
  }
}

function confirmForfeit() {
  if (props.view?.status !== 'in_progress' || props.busy) return;
  if (window.confirm(`${t('pvp.forfeit')} ?\n${t('pvp.outcome.defeat')}`)) emit('forfeit');
}

const outcomeKey = computed(() => {
  if (!isOver.value) return null;
  if (props.view.winnerSeat === props.role) return 'victory';
  if (props.view.status === 'forfeited') return 'forfeited';
  return 'defeat';
});
</script>

<template>
  <div class="arena" data-testid="pvp-arena" data-combat-drop-root>
    <header class="arena__top">
      <div class="pvp-top">
        <p class="arena__turn" :data-tone="isMyTurn ? 'indigo' : 'vermilion'">
          <span class="sr-only">{{ t('pvp.turn', { n: view.turn }) }}</span>
          <span class="arena__turn-label" aria-hidden="true">{{ t('combat.turnLabel') }}</span>
          <span :key="view.turn" class="arena__turn-number" aria-hidden="true">{{
            turnNumber
          }}</span>
          <span class="arena__phase">
            <span class="lozenge" aria-hidden="true" />
            {{ isMyTurn ? t('pvp.yourTurn') : t('pvp.opponentTurn') }}
          </span>
        </p>
        <p class="pvp-top__role" data-testid="pvp-role-badge">
          <span class="badge badge--solid" :data-tone="role === 'host' ? 'vermilion' : 'sky'">
            {{ role === 'host' ? t('pvp.roleHost') : t('pvp.roleGuest') }}
          </span>
          <span class="peer" :class="{ 'peer--on': peerOnline }">
            <span class="dot" aria-hidden="true" />
            {{ peerOnline ? t('pvp.peerOnline') : t('pvp.peerOffline') }}
          </span>
        </p>
      </div>
      <details class="pvp-menu">
        <summary :aria-label="t('nav.menu')">☰</summary>
        <div class="pvp-menu__content">
          <RouterLink :to="{ name: 'rules' }" target="_blank" rel="noopener noreferrer">
            {{ t('rules.link') }} ↗
          </RouterLink>
          <button
            type="button"
            class="btn-danger"
            :disabled="busy || view.status !== 'in_progress'"
            @click="confirmForfeit"
          >
            {{ t('pvp.forfeit') }}
          </button>
        </div>
      </details>
    </header>

    <div
      v-if="isOver"
      class="arena__outcome pvp-outcome"
      :data-tone="outcomeKey === 'victory' ? 'leaf' : outcomeKey === 'defeat' ? 'vermilion' : 'ink'"
      data-testid="pvp-outcome"
    >
      <span class="pvp-outcome__shape" aria-hidden="true" />
      <p class="pvp-outcome__title">{{ t(`pvp.outcome.${outcomeKey}`) }}</p>
      <button type="button" class="btn-secondary mt-4" @click="emit('dismiss-outcome')">
        {{ t('pvp.backToQueue') }}
      </button>
    </div>

    <div class="arena__duel">
      <section class="arena__seat">
        <div class="pvp-seat">
          <PlayerStatus :player="opponentPlayer" tone="vermilion" :role-label="t('pvp.opponent')" />
          <p class="pvp-seat__hint">
            {{ t('pvp.hiddenHand', { n: opponent?.handCount ?? 0 }) }}
          </p>
        </div>
      </section>

      <span class="arena__vs" aria-hidden="true"
        ><span>{{ t('common.vs') }}</span></span
      >

      <section class="arena__seat arena__seat--self">
        <PlayerStatus :player="selfPlayer" />
      </section>

      <Transition name="turn-banner">
        <p
          v-if="banner"
          class="arena__banner"
          :data-tone="isMyTurn ? 'indigo' : 'vermilion'"
          aria-hidden="true"
        >
          {{ isMyTurn ? t('pvp.yourTurn') : t('pvp.opponentTurn') }}
          <span class="arena__banner-sub">{{ t('pvp.turn', { n: view.turn }) }}</span>
        </p>
      </Transition>

      <CombatDropZones
        v-if="isDraggingCard"
        :disabled-actions="['play', 'discard', 'reserve'].filter(isDropDisabled)"
        :hovered-zone="hoveredZone"
      />
    </div>

    <section class="arena__hand-wrap">
      <div class="arena__hand-head">
        <h3 class="t-kicker">{{ t('combat.handTitle') }} · {{ (self?.hand || []).length }}</h3>
        <p class="arena__hand-hint">{{ t('combat.handHint') }}</p>
      </div>

      <CombatHand
        :cards="self?.hand || []"
        :previous-card-stat-type="previousCardStatType"
        :selected-id="selectedId"
        :disabled="busy || !canAct"
        :chakra="self?.chakra || 0"
        :cost-reduction="self?.nextCardCostReduction || 0"
        :stats="self?.stats"
        @select="emit('select-card', $event)"
        @play="emit('play-card', $event)"
        @drop-intent="onDropIntent"
        @drag-zone-change="hoveredZone = $event"
        @drag-state-change="isDraggingCard = $event"
      />

      <p class="arena__hand-hint">{{ t('combat.reserveHint') }}</p>
      <p class="arena__hand-hint arena__reserve-status" role="status">
        <span v-if="self?.reservedCard">{{ t('combat.cardReserved') }}</span>
      </p>
      <div class="arena__actions">
        <button
          type="button"
          class="btn-ghost"
          :disabled="
            busy || !canAct || !selectedId || self?.discardedForChakra || !!self?.reservedCard
          "
          @click="emit('discard-chakra')"
        >
          {{ t('combat.discardForChakra') }}
        </button>
        <button
          type="button"
          class="btn-ghost"
          :disabled="
            busy || !canAct || !selectedId || self?.discardedForChakra || !!self?.reservedCard
          "
          data-testid="pvp-reserve-card"
          @click="emit('reserve-card')"
        >
          {{ t('combat.reserveCard') }}
        </button>
        <button
          type="button"
          class="btn-primary btn-lg"
          :disabled="busy || !canAct || !selectedId"
          data-testid="pvp-play-card"
          @click="emit('play-card')"
        >
          {{ t('combat.playCard') }}
        </button>
        <button
          type="button"
          class="btn-secondary btn-lg"
          :disabled="busy || !canAct"
          data-testid="pvp-end-turn"
          @click="confirmEndTurn"
        >
          {{ t('combat.endTurn') }}
        </button>
      </div>
    </section>

    <CombatHeaderLog :logs="logs" :viewer-seat="role" />
  </div>
</template>

<style scoped>
.arena {
  gap: 0.75rem;
}
.arena__top {
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.arena__turn-number {
  font-size: 1.5rem;
  line-height: 1;
}
.arena__turn-label {
  padding-bottom: 0;
}
.pvp-menu {
  position: relative;
  margin-left: auto;
}
.pvp-menu summary {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
  list-style: none;
}
.pvp-menu summary::-webkit-details-marker {
  display: none;
}
.pvp-menu__content {
  position: absolute;
  z-index: 10;
  right: 0;
  display: grid;
  min-width: 12rem;
  padding: 0.4rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 15%);
}
.pvp-menu__content a,
.pvp-menu__content button {
  padding: 0.75rem;
  text-align: left;
}
.pvp-menu__content button:disabled {
  opacity: 0.45;
}

.pvp-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.85rem;
}

.pvp-top__role {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0;
}

.peer {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.peer .dot {
  color: var(--color-line-strong);
}

.peer--on {
  color: var(--color-leaf);
}

.peer--on .dot {
  color: var(--color-leaf-fill);
}

.pvp-seat {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pvp-seat > :deep(.fighter) {
  flex: 1;
}

.pvp-seat__hint {
  padding: 0.5rem 1rem;
  background: var(--color-vermilion-tint);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink);
}

.pvp-outcome {
  position: relative;
  overflow: hidden;
  padding: 1.75rem 1.5rem;
  background: var(--tone-fill);
  color: var(--tone-on);
  animation: rise-in 480ms var(--ease-out-quint) both;
}

.pvp-outcome__shape {
  position: absolute;
  top: -3rem;
  right: -2rem;
  width: 10rem;
  height: 10rem;
  background: color-mix(in srgb, var(--tone-on) 14%, transparent);
  transform: rotate(45deg);
}

.pvp-outcome__title {
  position: relative;
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 1.8rem + 4vw, 4.5rem);
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  letter-spacing: -0.02em;
}

.pvp-outcome .btn-secondary {
  position: relative;
  background: var(--color-bg-card);
  color: var(--color-ink);
}
</style>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CombatFighter from './CombatFighter.vue';
import IntentDisplay from './IntentDisplay.vue';
import CombatHand from './CombatHand.vue';
import CombatHeaderLog from './CombatHeaderLog.vue';
import CombatDropZones from './CombatDropZones.vue';
import VictoryRewards from './VictoryRewards.vue';

defineOptions({ name: 'CombatArena' });

const props = defineProps({
  combat: { type: Object, required: true },
  logs: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  busy: { type: Boolean, default: false },
  midRun: { type: Boolean, default: false },
  outcomeRewards: { type: Object, default: null },
  allowReserve: { type: Boolean, default: true },
  // Null preserves the solo turn rules; coop supplies whether the viewer owns this turn.
  coopTurn: { type: Boolean, default: null },
});

const emit = defineEmits([
  'select-card',
  'play-card',
  'play-on-ally',
  'end-turn',
  'discard-chakra',
  'discard-draw',
  'reserve-card',
  'forfeit',
  'dismiss-outcome',
]);

const { t, locale } = useI18n();

function confirmEndTurn() {
  if (!canAct.value || props.busy) return;
  const chakra = Number(props.combat.player.chakra) || 0;
  if (chakra <= 1 || window.confirm(t('combat.endTurnConfirm', { n: chakra }))) {
    emit('end-turn');
  }
}

function confirmForfeit() {
  const message =
    locale.value === 'en'
      ? 'Forfeit this fight? This cannot be undone.'
      : 'Abandonner ce combat ? Cette action est irréversible.';
  if (!props.busy && props.combat.state === 'in_progress' && window.confirm(message)) {
    emit('forfeit');
  }
}

const isOver = computed(() => ['victory', 'defeat', 'forfeited'].includes(props.combat.state));

const canAct = computed(() => isPlayerTurn.value && props.combat.state === 'in_progress');

const isPersistent = computed(
  () => props.combat.ruleset === 'persistent' || props.combat.turnPrototype === 'persistent'
);
const reservedCard = computed(
  () => props.combat.player.reservedCard ?? props.combat.player.reserveCard
);
const ally = computed(() => (props.coopTurn !== null ? props.combat.ally : null));
function intentTargetLabel(intent) {
  if (props.coopTurn === null || !intent) return '';
  return (
    intent.targetName ||
    [props.combat.player, ally.value].find(
      target => target?.id != null && String(target.id) === String(intent.targetId)
    )?.name ||
    ''
  );
}
const selectedCard = computed(() =>
  props.combat.player.hand?.find(card => card.instanceId === props.selectedId)
);
const canAffordSelected = computed(() => {
  if (!selectedCard.value) return false;
  const { player } = props.combat;
  const cost = Number(selectedCard.value.cost ?? selectedCard.value.baseCost) || 0;
  return Math.max(0, cost - (Number(player.nextCardCostReduction) || 0)) <= player.chakra;
});
const dropActions = computed(() => [
  'play',
  ...(ally.value ? ['play-ally'] : []),
  'discard',
  ...(isPersistent.value ? ['discard-for-draw'] : props.allowReserve ? ['reserve'] : []),
]);

function isDropDisabled(action) {
  if (props.busy || !canAct.value || !dropActions.value.includes(action)) return true;
  if (action === 'play') return false;
  if (action === 'play-ally') return !(ally.value?.hp > 0);
  const player = props.combat.player;
  if (isPersistent.value) {
    if (action === 'discard-for-draw') {
      return !(player.discardsRemaining > 0 && (player.drawCount > 0 || player.discardCount > 0));
    }
    return player.chakraDiscardAvailable !== true;
  }
  return Boolean(player.discardedForChakra || reservedCard.value);
}

const hoveredZone = ref(null);
const isDraggingCard = ref(false);

function onDropIntent(intent) {
  const action = intent?.action;
  if (isDropDisabled(action)) return;
  const instanceId = intent?.card?.instanceId;
  if (!instanceId) return;
  const card = (props.combat.player.hand || []).find(item => item.instanceId === instanceId);
  if (!card) return;
  if (action === 'play') emit('play-card', card);
  else if (action === 'play-ally') emit('play-on-ally', card);
  else if (action === 'discard') emit('discard-chakra', instanceId);
  else if (action === 'discard-for-draw') emit('discard-draw', instanceId);
  else if (action === 'reserve') emit('reserve-card', instanceId);
}

const isPlayerTurn = computed(
  () => props.combat.currentPhase === 'player_turn' && props.coopTurn !== false
);
const phaseText = computed(() => {
  if (props.coopTurn === false && props.combat.activePlayerId != null) {
    return t('coop.allyTurn');
  }
  return t(`combat.phases.${props.combat.currentPhase}`);
});
const turnNumber = computed(() => String(props.combat.currentTurn ?? 0).padStart(2, '0'));

/* Bandeau éphémère à chaque changement de tour ou de phase (affichage seul). */
const banner = ref(false);
let bannerTimer = null;

watch(
  () =>
    `${props.combat.id}:${props.combat.currentTurn}:${props.combat.currentPhase}:${props.coopTurn}`,
  (next, prev) => {
    if (!prev || next.split(':')[0] !== prev.split(':')[0]) return;
    if (props.combat.state !== 'in_progress') return;
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
</script>

<template>
  <div
    class="arena"
    :class="{ 'arena--duo': ally }"
    data-testid="combat-arena"
    data-combat-drop-root
    :inert="isOver"
  >
    <header class="arena__top">
      <p class="arena__turn" :data-tone="isPlayerTurn ? 'indigo' : 'vermilion'">
        <span class="sr-only">{{ t('combat.turn', { n: combat.currentTurn }) }}</span>
        <span class="arena__turn-label" aria-hidden="true">{{ t('combat.turnLabel') }}</span>
        <span :key="combat.currentTurn" class="arena__turn-number" aria-hidden="true">{{
          turnNumber
        }}</span>
        <span class="arena__phase">
          <span class="lozenge" aria-hidden="true" />
          {{ phaseText }}
        </span>
      </p>
      <details class="arena__menu">
        <summary class="btn-ghost btn-sm">{{ t('nav.menu') }}</summary>
        <div class="arena__menu-content">
          <router-link
            :to="{ name: 'rules' }"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-ghost btn-sm"
          >
            {{ t('rules.link') }} ↗
          </router-link>
          <button
            type="button"
            class="btn-danger btn-sm"
            :disabled="busy || combat.state !== 'in_progress'"
            @click="confirmForfeit"
          >
            {{ t('combat.forfeit') }}
          </button>
        </div>
      </details>
    </header>

    <CombatHeaderLog :logs="logs" />

    <Teleport to="body">
      <div v-if="isOver" class="arena__outcome-backdrop" data-testid="combat-outcome-overlay">
        <VictoryRewards
          class="arena__outcome"
          :state="combat.state"
          :rewards="outcomeRewards ?? combat.rewards"
          :mid-run="midRun"
          :continue-label="coopTurn === null ? null : t('coop.backToLobby')"
          :show-pending-rewards="coopTurn === null"
          @dismiss="emit('dismiss-outcome')"
        />
      </div>
    </Teleport>

    <div class="arena__duel">
      <section class="arena__seat">
        <CombatFighter
          :key="`enemy-${combat.id}`"
          :fighter="combat.enemy"
          :role-label="t(combat.enemy.boss ? 'combat.bossLabel' : 'combat.enemyLabel')"
          variant="enemy"
          data-testid="enemy-display"
        >
          <template #aside>
            <IntentDisplay
              :intent="combat.enemy.intent"
              :target-label="intentTargetLabel(combat.enemy.intent)"
            />
            <IntentDisplay
              v-if="combat.enemy.nextIntent?.type"
              :intent="combat.enemy.nextIntent"
              :target-label="intentTargetLabel(combat.enemy.nextIntent)"
              preview
            />
          </template>
        </CombatFighter>
      </section>

      <span class="arena__vs" aria-hidden="true"
        ><span>{{ t('common.vs') }}</span></span
      >

      <section class="arena__seat arena__seat--self">
        <CombatFighter
          :key="`player-${combat.id}`"
          :fighter="combat.player"
          :role-label="t('combat.youLabel')"
          :arts="combat.stats"
          data-testid="player-status"
          show-piles
        />
      </section>

      <Transition name="turn-banner">
        <p
          v-if="banner"
          class="arena__banner"
          :data-tone="isPlayerTurn ? 'indigo' : 'vermilion'"
          aria-hidden="true"
        >
          {{ phaseText }}
          <span class="arena__banner-sub">{{ t('combat.turn', { n: combat.currentTurn }) }}</span>
        </p>
      </Transition>

      <CombatDropZones
        v-if="isDraggingCard"
        :actions="dropActions"
        :disabled-actions="dropActions.filter(isDropDisabled)"
        :hovered-zone="hoveredZone"
      />
    </div>

    <CombatFighter
      v-if="ally"
      :key="`ally-${combat.id}`"
      :fighter="ally"
      :role-label="t('combat.allyLabel')"
      class="arena__teammate"
      data-testid="coop-ally"
    />

    <section class="arena__hand-wrap">
      <div class="arena__hand-head">
        <h3 class="t-kicker">
          {{ t('combat.handTitle') }} · {{ (combat.player.hand || []).length }}
        </h3>
        <p class="arena__hand-hint">{{ t('combat.handHint') }}</p>
      </div>

      <CombatHand
        :cards="combat.player.hand || []"
        :previous-card-stat-type="combat.player.previousCardStatType"
        :selected-id="selectedId"
        :disabled="busy || !canAct"
        :chakra="combat.player.chakra"
        :cost-reduction="combat.player.nextCardCostReduction || 0"
        :stats="combat.stats"
        @select="emit('select-card', $event)"
        @play="emit('play-card', $event)"
        @drop-intent="onDropIntent"
        @drag-zone-change="hoveredZone = $event"
        @drag-state-change="isDraggingCard = $event"
      />

      <template v-if="isPersistent">
        <p class="arena__hand-hint">{{ t('combat.persistentHand.help') }}</p>
        <p
          v-if="combat.player.discardsRemaining != null"
          class="arena__hand-hint"
          role="status"
          data-testid="discards-remaining"
        >
          {{ t('combat.persistentHand.discardsRemaining', { n: combat.player.discardsRemaining }) }}
        </p>
      </template>
      <template v-else-if="allowReserve">
        <p class="arena__hand-hint">{{ t('combat.reserveHint') }}</p>
        <p class="arena__hand-hint arena__reserve-status" role="status">
          <span v-if="reservedCard">{{ t('combat.cardReserved') }}</span>
        </p>
      </template>
      <div class="arena__actions">
        <button
          type="button"
          class="btn-ghost"
          :disabled="!selectedId || isDropDisabled('discard')"
          data-testid="discard-chakra-btn"
          @click="emit('discard-chakra')"
        >
          {{ t('combat.discardForChakra') }}
        </button>
        <button
          v-if="isPersistent"
          type="button"
          class="btn-ghost"
          :disabled="!selectedId || isDropDisabled('discard-for-draw')"
          data-testid="discard-draw-btn"
          @click="emit('discard-draw')"
        >
          {{ t('combat.discardForDraw') }}
        </button>
        <button
          v-else-if="allowReserve"
          type="button"
          class="btn-ghost"
          :disabled="!selectedId || isDropDisabled('reserve')"
          data-testid="reserve-card-btn"
          @click="emit('reserve-card')"
        >
          {{ t('combat.reserveCard') }}
        </button>
        <button
          type="button"
          class="btn-primary btn-lg"
          :disabled="busy || !canAct || !selectedId"
          data-testid="play-card-btn"
          @click="emit('play-card')"
        >
          {{ t(coopTurn === null ? 'combat.playCard' : 'coop.playOnEnemy') }}
        </button>
        <button
          v-if="ally"
          type="button"
          class="btn-secondary"
          :disabled="!canAffordSelected || isDropDisabled('play-ally')"
          data-testid="play-on-ally-btn"
          @click="emit('play-on-ally', selectedCard)"
        >
          {{ t('coop.playOnAlly') }}
        </button>
        <button
          type="button"
          class="btn-secondary btn-lg"
          :disabled="busy || !canAct"
          data-testid="end-turn-btn"
          @click="confirmEndTurn"
        >
          {{ t('combat.endTurn') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.arena {
  gap: 0.75rem;
}

.arena__outcome-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 1rem;
  background: var(--color-scrim);
}

.arena__outcome {
  width: min(48rem, 100%);
  max-height: 100%;
  overflow-y: auto;
  box-shadow: 0 1rem 4rem color-mix(in srgb, var(--color-ink) 30%, transparent);
}

.arena__top,
.arena__turn {
  align-items: center;
}

.arena__turn {
  gap: 0.5rem;
  flex-wrap: wrap;
}

.arena__turn-label,
.arena__phase {
  padding-bottom: 0;
  margin-bottom: 0;
}

.arena__turn-number {
  font-size: 2rem;
  line-height: 1;
}

.arena__menu {
  position: relative;
  flex: none;
}

.arena__menu summary {
  cursor: pointer;
}

.arena__menu-content {
  position: absolute;
  z-index: 10;
  right: 0;
  display: grid;
  gap: 0.5rem;
  min-width: 12rem;
  padding: 0.75rem;
  border: 1px solid var(--color-line);
  background: var(--color-bg);
}

@media (min-width: 1120px) {
  .arena--duo {
    grid-template-columns: minmax(0, 1fr) 17rem;
    grid-template-areas:
      'top top'
      'duel ally'
      'hand ally';
    column-gap: 1.25rem;
  }

  .arena--duo > .arena__top {
    grid-area: top;
  }

  .arena--duo > .arena__duel {
    grid-area: duel;
  }

  .arena--duo > .arena__teammate {
    grid-area: ally;
    align-self: start;
  }

  .arena--duo > .arena__hand-wrap {
    grid-area: hand;
  }

  .arena--duo > .arena__hand-wrap :deep(.hand) {
    margin-inline: 0;
    padding-inline: 0.75rem;
  }
}
</style>

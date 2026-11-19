<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import EnemyDisplay from './EnemyDisplay.vue';
import PlayerStatus from './PlayerStatus.vue';
import CombatHand from './CombatHand.vue';
import CombatLog from './CombatLog.vue';
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
});

const emit = defineEmits([
  'select-card',
  'play-card',
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

const canAct = computed(
  () => props.combat.currentPhase === 'player_turn' && props.combat.state === 'in_progress'
);

const isPersistent = computed(() => props.combat.turnPrototype === 'persistent');
const isPrototype = computed(() => isPersistent.value || props.combat.turnPrototype === 'classic');
const reservedCard = computed(
  () => props.combat.player.reservedCard ?? props.combat.player.reserveCard
);
const dropActions = computed(() => [
  'play',
  'discard',
  isPersistent.value ? 'discard-for-draw' : 'reserve',
]);

function isDropDisabled(action) {
  if (props.busy || !canAct.value || !dropActions.value.includes(action)) return true;
  if (action === 'play') return false;
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
  else if (action === 'discard') emit('discard-chakra', instanceId);
  else if (action === 'discard-for-draw') emit('discard-draw', instanceId);
  else if (action === 'reserve') emit('reserve-card', instanceId);
}

const isPlayerTurn = computed(() => props.combat.currentPhase === 'player_turn');
const turnNumber = computed(() => String(props.combat.currentTurn ?? 0).padStart(2, '0'));

/* Bandeau éphémère à chaque changement de tour ou de phase (affichage seul). */
const banner = ref(false);
let bannerTimer = null;

watch(
  () => `${props.combat.id}:${props.combat.currentTurn}:${props.combat.currentPhase}`,
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
    class="arena arena--with-side"
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
          {{ t(`combat.phases.${combat.currentPhase}`) }}
        </span>
        <span v-if="isPrototype" class="t-kicker">
          {{ t(`combat.turnPrototype.${combat.turnPrototype}.label`) }}
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

    <Teleport to="body">
      <div v-if="isOver" class="arena__outcome-backdrop" data-testid="combat-outcome-overlay">
        <VictoryRewards
          class="arena__outcome"
          :state="combat.state"
          :rewards="outcomeRewards ?? combat.rewards"
          :mid-run="midRun"
          @dismiss="emit('dismiss-outcome')"
        />
      </div>
    </Teleport>

    <div class="arena__duel">
      <section class="arena__seat">
        <EnemyDisplay
          :key="`enemy-${combat.id}`"
          :enemy="combat.enemy"
          :show-next-intent="isPrototype"
        />
      </section>

      <span class="arena__vs" aria-hidden="true"
        ><span>{{ t('common.vs') }}</span></span
      >

      <section class="arena__seat arena__seat--self">
        <PlayerStatus :key="`player-${combat.id}`" :player="combat.player" />
      </section>

      <Transition name="turn-banner">
        <p
          v-if="banner"
          class="arena__banner"
          :data-tone="isPlayerTurn ? 'indigo' : 'vermilion'"
          aria-hidden="true"
        >
          {{ t(`combat.phases.${combat.currentPhase}`) }}
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
        <p class="arena__hand-hint">{{ t('combat.turnPrototype.persistent.help') }}</p>
        <p class="arena__hand-hint" role="status" data-testid="discards-remaining">
          {{
            t('combat.turnPrototype.discardsRemaining', { n: combat.player.discardsRemaining ?? 0 })
          }}
        </p>
      </template>
      <template v-else>
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
          {{ t('combat.turnPrototype.discardForDraw') }}
        </button>
        <button
          v-else
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
          {{ t('combat.playCard') }}
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

    <details class="arena__side arena__log">
      <summary>{{ t('combat.logTitle') }}</summary>
      <CombatLog :logs="logs" />
    </details>
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

.arena__menu summary,
.arena__log summary {
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

.arena__log summary {
  padding: 0.75rem;
  background: var(--color-bg-soft);
  font-weight: 700;
}
</style>

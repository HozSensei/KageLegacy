<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import EnemyDisplay from './EnemyDisplay.vue';
import PlayerStatus from './PlayerStatus.vue';
import CombatHand from './CombatHand.vue';
import CombatLog from './CombatLog.vue';
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
  'reserve-card',
  'forfeit',
  'dismiss-outcome',
]);

const { t } = useI18n();

const isOver = computed(() => ['victory', 'defeat', 'forfeited'].includes(props.combat.state));

const canAct = computed(
  () => props.combat.currentPhase === 'player_turn' && props.combat.state === 'in_progress'
);

const reservedCard = computed(
  () => props.combat.player.reservedCard ?? props.combat.player.reserveCard
);
function isDropDisabled(action) {
  return (
    props.busy ||
    !canAct.value ||
    (action !== 'play' && (props.combat.player.discardedForChakra || !!reservedCard.value))
  );
}

function onDropIntent(intent) {
  const action = intent?.action;
  if (!['play', 'discard', 'reserve'].includes(action) || isDropDisabled(action)) return;
  const instanceId = intent?.card?.instanceId;
  if (!instanceId) return;
  const card = (props.combat.player.hand || []).find(item => item.instanceId === instanceId);
  if (!card) return;
  emit(
    action === 'play' ? 'play-card' : action === 'discard' ? 'discard-chakra' : 'reserve-card',
    action === 'play' ? card : card.instanceId
  );
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
  <div class="arena arena--with-side" data-testid="combat-arena" data-combat-drop-root>
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
      </p>
      <button
        type="button"
        class="btn-danger btn-sm"
        :disabled="busy || combat.state !== 'in_progress'"
        @click="emit('forfeit')"
      >
        {{ t('combat.forfeit') }}
      </button>
    </header>

    <VictoryRewards
      v-if="isOver"
      class="arena__outcome"
      :state="combat.state"
      :rewards="outcomeRewards ?? combat.rewards"
      :mid-run="midRun"
      @dismiss="emit('dismiss-outcome')"
    />

    <div class="arena__duel">
      <section class="arena__seat">
        <EnemyDisplay :key="`enemy-${combat.id}`" :enemy="combat.enemy" />
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
    </div>

    <div class="arena-drop-board">
      <div
        v-for="zone in ['play', 'discard', 'reserve']"
        :key="zone"
        class="arena-drop-zone"
        :class="{ 'arena-drop-zone--disabled': isDropDisabled(zone) }"
        :data-combat-drop-zone="zone"
        :data-combat-drop-disabled="isDropDisabled(zone) ? 'true' : 'false'"
        :data-testid="`drop-zone-${zone}`"
      >
        {{
          t(
            zone === 'play'
              ? 'combat.playCard'
              : zone === 'discard'
                ? 'combat.discardForChakra'
                : 'combat.reserveCard'
          )
        }}
      </div>
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
        :selected-id="selectedId"
        :disabled="busy || !canAct"
        :chakra="combat.player.chakra"
        :stats="combat.stats"
        @select="emit('select-card', $event)"
        @play="emit('play-card', $event)"
        @drop-intent="onDropIntent"
      />

      <p class="arena__hand-hint">{{ t('combat.reserveHint') }}</p>
      <p v-if="reservedCard" class="arena__hand-hint" role="status">
        {{ t('combat.cardReserved') }}
      </p>
      <div class="arena__actions">
        <button
          type="button"
          class="btn-ghost"
          :disabled="
            busy || !canAct || !selectedId || combat.player.discardedForChakra || !!reservedCard
          "
          @click="emit('discard-chakra')"
        >
          {{ t('combat.discardForChakra') }}
        </button>
        <button
          type="button"
          class="btn-ghost"
          :disabled="
            busy || !canAct || !selectedId || combat.player.discardedForChakra || !!reservedCard
          "
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
          @click="emit('end-turn')"
        >
          {{ t('combat.endTurn') }}
        </button>
      </div>
    </section>

    <CombatLog class="arena__side" :logs="logs" />
  </div>
</template>

<style scoped>
.arena-drop-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

.arena-drop-zone {
  display: grid;
  place-items: center;
  min-height: 5rem;
  padding: 0.75rem;
  border: 2px dashed var(--color-line-strong);
  color: var(--color-ink);
  text-align: center;
}

.arena-drop-zone--disabled {
  opacity: 0.45;
}
</style>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CombatArena from '../components/combat/CombatArena.vue';
import { useCoopRoom } from '../composables/useCoopRoom.js';
import { useAuthStore } from '../stores/auth.js';
import { localizedName } from '../utils/localeContent.js';
import { needsFriendlyFireConfirmation } from '../utils/coopCards.js';

defineOptions({ name: 'CoopView' });

const { t, locale } = useI18n();
const auth = useAuthStore();
const { room, busy, pollFailed, create, join, action, reset } = useCoopRoom();
const code = ref('');
const error = ref('');
const selectedId = ref(null);
const confirmation = ref(null);
const confirmDialog = ref(null);
const combat = computed(() => room.value?.combat);
const isMyTurn = computed(() => {
  const playerId = combat.value?.player?.id ?? auth.user?.id;
  const activeId = combat.value?.activePlayerId;
  return playerId != null && activeId != null && String(activeId) === String(playerId);
});
const canAct = computed(
  () =>
    room.value?.status === 'active' &&
    combat.value?.state === 'in_progress' &&
    combat.value.currentPhase === 'player_turn' &&
    isMyTurn.value
);
const findCard = id => combat.value?.player?.hand?.find(card => card.instanceId === id);

watch(combat, () => {
  if (!canAct.value || !findCard(selectedId.value)) selectedId.value = null;
  if (confirmation.value && !isCurrentConfirmation(confirmation.value)) confirmation.value = null;
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

async function enterRoom(createRoom) {
  if (busy.value || (!createRoom && !code.value)) return;
  error.value = '';
  try {
    if (createRoom) await create();
    else await join(code.value.toUpperCase());
  } catch (err) {
    error.value = err.message || t('coop.requestError');
  }
}

function leaveRoom() {
  confirmation.value = null;
  selectedId.value = null;
  code.value = '';
  error.value = '';
  reset();
}

async function cancelWaitingRoom() {
  if (busy.value) return;
  try {
    await action({ type: 'forfeit' });
    leaveRoom();
  } catch (err) {
    error.value = err.message || t('coop.requestError');
  }
}

function isCurrentConfirmation(pending) {
  return (
    canAct.value &&
    room.value.id === pending.roomId &&
    combat.value.currentTurn === pending.turn &&
    combat.value.ally?.id === pending.allyId &&
    combat.value.ally?.hp > 0 &&
    Boolean(findCard(pending.instanceId))
  );
}

async function sendAction(type, instanceId, target = 'enemy', confirmedFriendlyFire = false) {
  if (busy.value || confirmation.value || room.value?.status !== 'active') return;
  if (type !== 'forfeit' && !canAct.value) return;
  if (instanceId && !findCard(instanceId)) return;
  if (target === 'ally' && !(combat.value.ally?.hp > 0)) return;

  error.value = '';
  const context =
    target === 'ally'
      ? {
          instanceId,
          roomId: room.value.id,
          turn: combat.value.currentTurn,
          allyId: combat.value.ally.id,
          cardName: localizedName(findCard(instanceId), locale.value, instanceId),
          allyName: combat.value.ally.name,
        }
      : null;
  if (context && !confirmedFriendlyFire && needsFriendlyFireConfirmation(findCard(instanceId))) {
    confirmation.value = context;
    return;
  }

  try {
    const applied = await action({
      type,
      target,
      ...(instanceId ? { instanceId } : {}),
      ...(confirmedFriendlyFire ? { confirmedFriendlyFire: true } : {}),
    });
    if (applied) selectedId.value = null;
  } catch (err) {
    if (
      context &&
      !confirmedFriendlyFire &&
      err.code === 'FRIENDLY_FIRE_CONFIRMATION' &&
      isCurrentConfirmation(context)
    ) {
      confirmation.value = context;
    } else {
      error.value = err.message || t('coop.requestError');
    }
  }
}

function confirmFriendlyFire() {
  const pending = confirmation.value;
  confirmation.value = null;
  if (pending && isCurrentConfirmation(pending)) {
    void sendAction('play', pending.instanceId, 'ally', true);
  }
}

function play(card, target) {
  const id = card?.instanceId ?? selectedId.value;
  if (id) void sendAction('play', id, target);
}

function discard(type, id) {
  const instanceId = id ?? selectedId.value;
  if (instanceId) void sendAction(type, instanceId);
}
</script>

<template>
  <div class="page-shell coop" data-testid="coop-page">
    <header>
      <h1 class="t-heading">{{ t('coop.title') }}</h1>
      <p v-if="!room" class="text-ink-muted">{{ t('coop.lead') }}</p>
    </header>

    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <p v-if="pollFailed" class="alert alert--info" role="status">{{ t('coop.pollError') }}</p>

    <section v-if="!room" class="panel coop__lobby">
      <button
        type="button"
        class="btn-primary"
        :disabled="busy"
        data-testid="coop-create"
        @click="enterRoom(true)"
      >
        {{ t('coop.create') }}
      </button>
      <form class="coop__join" @submit.prevent="enterRoom(false)">
        <label class="field">
          <span class="field__label">{{ t('coop.codeLabel') }}</span>
          <input
            v-model.trim="code"
            class="input-field"
            type="text"
            :disabled="busy"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            required
            data-testid="coop-code-input"
          />
        </label>
        <button
          type="submit"
          class="btn-secondary"
          :disabled="busy || !code"
          data-testid="coop-join"
        >
          {{ t('coop.join') }}
        </button>
      </form>
    </section>

    <section
      v-else-if="room.status === 'waiting'"
      class="panel coop__lobby"
      data-testid="coop-waiting"
    >
      <p role="status">{{ t('coop.waiting') }}</p>
      <p>
        {{ t('coop.codeLabel') }} :
        <strong class="coop__code" data-testid="coop-code">{{ room.code }}</strong>
      </p>
      <button type="button" class="btn-ghost" :disabled="busy" @click="cancelWaitingRoom">
        {{ t('coop.backToLobby') }}
      </button>
    </section>

    <CombatArena
      v-else-if="combat"
      :key="room.id"
      :combat="combat"
      :logs="combat.logs || []"
      :selected-id="selectedId"
      :busy="busy || room.status !== 'active'"
      :coop-turn="isMyTurn"
      @select-card="selectedId = $event.instanceId"
      @play-card="play($event, 'enemy')"
      @play-on-ally="play($event, 'ally')"
      @discard-chakra="discard('discard_chakra', $event)"
      @discard-draw="discard('discard_draw', $event)"
      @end-turn="sendAction('end_turn')"
      @forfeit="sendAction('forfeit')"
      @dismiss-outcome="leaveRoom"
    />

    <section v-else-if="room.status === 'finished'" class="panel coop__lobby">
      <p role="status">{{ t('coop.finished') }}</p>
      <button type="button" class="btn-ghost" @click="leaveRoom">
        {{ t('coop.backToLobby') }}
      </button>
    </section>

    <dialog
      ref="confirmDialog"
      class="coop__confirm panel"
      aria-labelledby="coop-confirm-title"
      aria-describedby="coop-confirm-description"
      @cancel.prevent="confirmation = null"
    >
      <h2 id="coop-confirm-title" class="t-heading">{{ t('coop.confirmTitle') }}</h2>
      <p v-if="confirmation" id="coop-confirm-description">
        {{ t('coop.confirmMessage', { card: confirmation.cardName, ally: confirmation.allyName }) }}
      </p>
      <div class="coop__confirm-actions">
        <button type="button" class="btn-ghost" autofocus @click="confirmation = null">
          {{ t('coop.cancel') }}
        </button>
        <button
          type="button"
          class="btn-danger"
          data-testid="coop-confirm-friendly-fire"
          @click="confirmFriendlyFire"
        >
          {{ t('coop.confirmAction') }}
        </button>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.coop {
  display: grid;
  gap: 1rem;
}

.coop__lobby {
  display: grid;
  justify-items: start;
  gap: 1rem;
}

.coop__join,
.coop__confirm-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.coop__code {
  font-family: monospace;
  letter-spacing: 0.1em;
  font-size: 1.2em;
}

.coop__confirm {
  width: min(28rem, calc(100% - 2rem));
  margin: auto;
  padding: 1.25rem;
  background: var(--color-bg-card);
  color: var(--color-ink);
}

.coop__confirm[open] {
  display: grid;
  gap: 1rem;
}

.coop__confirm::backdrop {
  background: var(--color-scrim);
}
</style>

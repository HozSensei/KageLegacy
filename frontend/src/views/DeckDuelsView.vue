<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CombatArena from '../components/combat/CombatArena.vue';
import PlayerIdentityChip from '../components/player/PlayerIdentityChip.vue';
import PlayerProfileModal from '../components/player/PlayerProfileModal.vue';
import { useDeckDuels } from '../composables/useDeckDuels.js';
import { usePublicPlayerModal } from '../composables/usePublicPlayer.js';
import { useNotificationsStore } from '../stores/notifications.js';

const { t, te, n, d } = useI18n();
const {
  open: profileOpen,
  loading: profileLoading,
  error: profileError,
  player: profilePlayer,
  anchor: profileAnchor,
  show: showProfile,
  close: closeProfile,
} = usePublicPlayerModal();
const {
  lobbyLoaded,
  defenses,
  duel,
  selectedId,
  busy,
  needsSync,
  feedback,
  locked,
  friends,
  friendsLoadFailed,

  refresh,
  start,
  act,
  returnToLobby,
} = useDeckDuels();
const notifications = useNotificationsStore();
const showFriends = ref(false);
const pageHeading = ref(null);
const duelHeading = ref(null);
const matchmakingModes = ['random', 'enemy_faction'];
const showLobby = computed(() => lobbyLoaded.value && !duel.value);
const duelMode = computed(() => {
  const key = `deckDuels.modes.${duel.value?.mode}`;
  return te(key) ? t(key) : null;
});

const history = computed(() =>
  defenses.value.map(defense => ({ ...defense, date: new Date(defense.finishedAt) }))
);

const duelOpponentName = computed(() => {
  const enemy = duel.value?.enemy;
  if (!enemy) return null;
  return enemy.nameFr || enemy.nameEn || enemy.name || null;
});
const duelIsPlayerOpponent = computed(
  () => Boolean(duel.value?.enemy?.profile) && !duel.value?.enemy?.boss
);

onMounted(refresh);
watch(
  () => duel.value?.state,
  state => {
    (state ? duelHeading.value : pageHeading.value)?.focus();
    if (['victory', 'defeat', 'forfeited'].includes(state) && duel.value?.id != null) {
      void notifications.fetchNotifications();
    }
  },
  { flush: 'post' }
);

function toggleSelection(card) {
  selectedId.value = card.instanceId === selectedId.value ? null : card.instanceId;
}

function outcomeLabel(outcome) {
  switch (outcome) {
    case 'victory':
      return t('combat.victory');
    case 'defeat':
      return t('combat.defeat');
    case 'forfeited':
      return t('combat.forfeited');
    default:
      return t('deckDuels.unknownOutcome');
  }
}

function defenseOutcomeLabel(outcome) {
  // The history stores the challenger's result, not the result of your defense.
  switch (outcome) {
    case 'victory':
      return t('deckDuels.defenseLost');
    case 'defeat':
      return t('deckDuels.defenseWon');
    case 'forfeited':
      return t('deckDuels.challengerForfeited');
    default:
      return t('deckDuels.unknownOutcome');
  }
}

function rewardLabels(reward) {
  const lines = [];
  const ryos = reward?.ryos ?? (typeof reward === 'number' ? reward : 0);
  if (ryos > 0) lines.push(t('combat.rewardRyos', { n: n(Number(ryos)) }));
  if (reward?.xp > 0) lines.push(t('combat.rewardXp', { n: n(Number(reward.xp)) }));
  return lines.length ? lines.join(' · ') : t('deckDuels.noReward');
}
</script>

<template>
  <div class="page-shell deck-duels" data-testid="deck-duels-page">
    <header class="deck-duels__row">
      <div>
        <p class="t-kicker">{{ t('deckDuels.kicker') }}</p>
        <h1 ref="pageHeading" class="t-heading" tabindex="-1">{{ t('deckDuels.title') }}</h1>
        <p class="text-ink-muted">{{ t('deckDuels.lead') }}</p>
      </div>
      <button type="button" class="btn-ghost btn-sm" :disabled="busy" @click="refresh">
        {{ t('deckDuels.refresh') }}
      </button>
    </header>

    <p v-if="busy && needsSync" role="status">{{ t('common.loading') }}</p>
    <p v-if="feedback" class="alert alert--info" role="alert">{{ t(`deckDuels.${feedback}`) }}</p>

    <section v-if="duel?.state === 'in_progress'" aria-labelledby="deck-duel-ai">
      <h2 id="deck-duel-ai" ref="duelHeading" class="t-kicker mb-3" tabindex="-1">
        <template v-if="duelIsPlayerOpponent">
          {{
            duelOpponentName
              ? t('deckDuels.vsOpponent', { name: duelOpponentName })
              : t('combat.enemyLabel')
          }}
        </template>
        <template v-else>{{ t('deckDuels.aiOpponent') }}</template>
        <template v-if="duelMode"> · {{ duelMode }}</template>
      </h2>
      <CombatArena
        :key="duel.id"
        :combat="duel"
        :logs="duel.logs || []"
        :selected-id="selectedId"
        :busy="locked"
        :allow-reserve="false"
        @select-card="toggleSelection"
        @play-card="act('play', $event?.instanceId)"
        @discard-chakra="act('discard_chakra', $event)"
        @discard-draw="act('discard_draw', $event)"
        @end-turn="act('end_turn')"
        @forfeit="act('forfeit')"
      />
    </section>

    <section v-else-if="duel" class="panel deck-duels__panel" aria-labelledby="deck-duel-result">
      <h2 id="deck-duel-result" ref="duelHeading" class="t-heading" tabindex="-1">
        {{ outcomeLabel(duel.state) }}
      </h2>
      <p v-if="duelMode" class="text-ink-muted">{{ duelMode }}</p>
      <p>{{ rewardLabels(duel.reward) }}</p>
      <button type="button" class="btn-primary" :disabled="busy" @click="returnToLobby">
        {{ t('deckDuels.backToLobby') }}
      </button>
    </section>

    <template v-else-if="showLobby">
      <div class="deck-duels__matchmaking">
        <button
          type="button"
          class="btn-primary"
          :aria-expanded="showFriends"
          aria-controls="deck-duel-friends"
          @click="showFriends = !showFriends"
        >
          {{ t('deckDuels.modes.friend') }}
        </button>
        <button
          v-for="mode in matchmakingModes"
          :key="mode"
          type="button"
          class="btn-primary"
          :disabled="locked"
          @click="start(mode)"
        >
          {{ t(`deckDuels.modes.${mode}`) }}
        </button>
        <RouterLink :to="{ name: 'village' }" class="btn-ghost btn-sm">
          {{ t('deckDuels.viewVillageStandings') }}
        </RouterLink>
      </div>

      <section
        v-show="showFriends"
        id="deck-duel-friends"
        class="panel deck-duels__panel"
        aria-labelledby="deck-duel-friends-title"
      >
        <h2 id="deck-duel-friends-title" class="t-heading">{{ t('deckDuels.modes.friend') }}</h2>
        <p v-if="friendsLoadFailed" class="alert alert--error" role="alert">
          {{ t('deckDuels.friendsLoadFailed') }}
        </p>
        <p v-else-if="!friends" role="status">{{ t('common.loading') }}</p>
        <p v-else-if="!friends.length" class="text-ink-muted">
          {{ t('deckDuels.emptyFriendGroups.friends') }}
        </p>
        <ul v-else class="deck-duels__list">
          <li v-for="friend in friends" :key="friend.id" class="deck-duels__row">
            <PlayerIdentityChip
              :user-id="friend.id"
              :name="friend.name"
              :profile="friend.profile"
              :level="friend.level"
              @open="showProfile"
            />
            <button
              type="button"
              class="btn-primary btn-sm"
              :disabled="locked"
              :aria-label="t('deckDuels.challengeName', { name: friend.name })"
              @click="start('friend', friend.id)"
            >
              {{ t('deckDuels.challenge') }}
            </button>
          </li>
        </ul>
        <div>
          <RouterLink :to="{ name: 'village' }" class="btn-ghost btn-sm">
            {{ t('deckDuels.manageFriends') }}
          </RouterLink>
        </div>
      </section>

      <section class="panel deck-duels__panel" aria-labelledby="deck-duel-history">
        <h2 id="deck-duel-history" class="t-heading">{{ t('deckDuels.historyTitle') }}</h2>
        <p v-if="!history.length" class="text-ink-muted">{{ t('deckDuels.emptyHistory') }}</p>
        <ul v-else class="deck-duels__list">
          <li v-for="defense in history" :key="defense.id" class="deck-duels__row">
            <div class="deck-duels__history-main">
              <PlayerIdentityChip
                :user-id="defense.opponentId"
                :name="defense.opponentName || defense.name || t('community.unknownPlayer')"
                :profile="defense.profile"
                :level="defense.level"
                @open="showProfile"
              />
              <p>{{ defenseOutcomeLabel(defense.outcome) }} · {{ rewardLabels(defense.reward) }}</p>
            </div>
            <time
              v-if="defense.finishedAt && Number.isFinite(defense.date.getTime())"
              class="text-ink-muted"
              :datetime="defense.date.toISOString()"
            >
              {{ d(defense.date, { dateStyle: 'medium', timeStyle: 'short' }) }}
            </time>
          </li>
        </ul>
      </section>
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
.deck-duels,
.deck-duels__panel {
  display: grid;
  gap: 1rem;
}

.deck-duels__panel > button {
  justify-self: start;
}

.deck-duels__history-main {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.deck-duels__row,
.deck-duels__matchmaking {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.deck-duels__matchmaking {
  justify-content: start;
}

.deck-duels__list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.deck-duels__list li {
  border-top: 1px solid var(--color-line);
  padding-top: 0.75rem;
}
</style>

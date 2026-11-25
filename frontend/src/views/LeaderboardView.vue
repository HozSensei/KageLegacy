<script setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLeaderboardStore } from '../stores/leaderboard';
import { usePlayerStore } from '../stores/player';
import PageHeader from '../components/ui/PageHeader.vue';
import LeaderboardPlayerCell from '../components/player/LeaderboardPlayerCell.vue';
import PlayerProfileModal from '../components/player/PlayerProfileModal.vue';
import { usePublicPlayerModal } from '../composables/usePublicPlayer.js';
import bridgeImage from '../assets/illustrations/stone-bridge.webp';

defineOptions({ name: 'LeaderboardView' });

const { t } = useI18n();
const lb = useLeaderboardStore();
const player = usePlayerStore();
const {
  open: profileOpen,
  loading: profileLoading,
  error: profileError,
  player: profilePlayer,
  anchor: profileAnchor,
  show: showProfile,
  close: closeProfile,
} = usePublicPlayerModal();

const board = 'level';
const factionFilter = ref('');
const joining = ref(false);
const localError = ref(null);

onMounted(async () => {
  if (!player.checked) await player.fetchPlayer();
  await lb.fetchFactions();
  await refresh();
});

watch(factionFilter, () => {
  refresh({ page: 1 });
});

async function refresh({ page = lb.page } = {}) {
  localError.value = null;
  await Promise.all([
    lb.fetchBoard({
      nextBoard: board,
      nextPage: page,
      nextFactionId: factionFilter.value || null,
    }),
    lb.fetchFactionStandings(board),
  ]);
  if (lb.error) localError.value = lb.error;
}

async function goPage(delta) {
  const next = Math.min(lb.totalPages, Math.max(1, lb.page + delta));
  if (next === lb.page) return;
  await refresh({ page: next });
}

async function pickFaction(factionId) {
  joining.value = true;
  localError.value = null;
  try {
    if (player.character?.factionId) {
      await lb.retakeFaction(factionId);
    } else {
      await lb.joinFaction(factionId);
    }
    await player.fetchPlayer();
    await refresh();
  } catch (e) {
    localError.value = e.message;
  } finally {
    joining.value = false;
  }
}

function factionName(id) {
  return id ? t(`factions.names.${id}`) : '—';
}

function factionTone(id) {
  return t(`factions.tones.${id}`);
}
</script>

<template>
  <div class="page-shell" data-testid="leaderboard-page">
    <PageHeader
      tone="indigo"
      :kicker="t('leaderboard.kicker')"
      :title="t('leaderboard.title')"
      :lead="t('leaderboard.lead')"
      :image="bridgeImage"
      image-position="50% 40%"
    />

    <p v-if="localError" class="alert alert--error mt-6" data-testid="leaderboard-error">
      {{ localError }}
    </p>

    <section
      v-if="player.character && !player.character.factionId"
      class="faction-pick mt-8"
      data-testid="faction-pick"
    >
      <h2 class="faction-pick__title">{{ t('factions.pickTitle') }}</h2>
      <p class="faction-pick__lead">{{ t('factions.pickLead') }}</p>
      <div class="faction-pick__grid">
        <button
          v-for="f in lb.factions"
          :key="f.id"
          type="button"
          class="faction-card"
          :style="{ '--faction-accent': f.accentColor }"
          :disabled="joining"
          :data-testid="`faction-join-${f.id}`"
          @click="pickFaction(f.id)"
        >
          <span class="faction-card__banner" aria-hidden="true" />
          <span class="faction-card__name">{{ factionName(f.id) }}</span>
          <span class="faction-card__tone">{{ factionTone(f.id) }}</span>
        </button>
      </div>
    </section>

    <section class="lb-factions mt-10" data-testid="faction-standings">
      <h2 class="lb-section-title">{{ t('leaderboard.factionStandings') }}</h2>
      <p class="lb-section-lead">{{ t('leaderboard.factionStandingsLead') }}</p>
      <ol class="lb-faction-list">
        <li
          v-for="(row, index) in lb.factionStandings"
          :key="row.factionId"
          class="lb-faction-row"
          :style="{ '--faction-accent': row.faction?.accentColor || '#666' }"
        >
          <span class="lb-faction-row__rank">{{ index + 1 }}</span>
          <span class="lb-faction-row__name">{{ factionName(row.factionId) }}</span>
          <span class="lb-faction-row__meta">
            {{ t('leaderboard.members', { n: row.memberCount }) }}
          </span>
          <span class="lb-faction-row__score">{{ row.score }}</span>
        </li>
      </ol>
    </section>

    <section class="lb-board mt-12" data-testid="player-standings">
      <div class="lb-me-bar">
        <p v-if="lb.me" class="lb-me" data-testid="leaderboard-me">
          {{ t('leaderboard.yourRank', { rank: lb.me.rank ?? '—', score: lb.me.score }) }}
        </p>
        <p v-else class="lb-me lb-me--spacer" aria-hidden="true" />
        <label class="lb-filter">
          <span class="sr-only">{{ t('leaderboard.filterFaction') }}</span>
          <select v-model="factionFilter" data-testid="faction-filter" class="input-field">
            <option value="">{{ t('leaderboard.allFactions') }}</option>
            <option v-for="f in lb.factions" :key="f.id" :value="f.id">
              {{ factionName(f.id) }}
            </option>
          </select>
        </label>
      </div>

      <div class="lb-table-wrap mt-4">
        <table class="lb-table" data-testid="leaderboard-table">
          <thead>
            <tr>
              <th class="lb-col-rank">{{ t('leaderboard.colRank') }}</th>
              <th>{{ t('leaderboard.colName') }}</th>
              <th>{{ t('leaderboard.colFaction') }}</th>
              <th class="lb-col-score">{{ t('leaderboard.colPoints') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="lb.loading">
              <td colspan="4">{{ t('common.loading') }}</td>
            </tr>
            <tr v-else-if="!lb.entries.length">
              <td colspan="4">{{ t('leaderboard.empty') }}</td>
            </tr>
            <tr
              v-for="row in lb.entries"
              :key="`${row.userId}-${row.rank}`"
              :class="{ 'is-me': lb.me && row.userId === lb.me.userId }"
            >
              <td class="lb-col-rank">{{ row.rank }}</td>
              <td class="lb-col-player">
                <LeaderboardPlayerCell
                  :user-id="row.userId"
                  :name="row.characterName"
                  :level="row.level"
                  :rank-title="row.rankTitle"
                  :profile="row.profile"
                  @open="showProfile"
                />
              </td>
              <td>
                <span
                  v-if="row.factionId"
                  class="lb-faction-chip"
                  :style="{ '--faction-accent': row.faction?.accentColor }"
                >
                  {{ factionName(row.factionId) }}
                </span>
                <span v-else>—</span>
              </td>
              <td class="lb-col-score">{{ row.score }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lb-pager mt-6">
        <button
          type="button"
          class="btn-ghost"
          :disabled="lb.page <= 1 || lb.loading"
          data-testid="lb-prev"
          @click="goPage(-1)"
        >
          {{ t('leaderboard.prev') }}
        </button>
        <span class="lb-pager__label">
          {{ t('leaderboard.pageOf', { page: lb.page, total: lb.totalPages }) }}
        </span>
        <button
          type="button"
          class="btn-ghost"
          :disabled="lb.page >= lb.totalPages || lb.loading"
          data-testid="lb-next"
          @click="goPage(1)"
        >
          {{ t('leaderboard.next') }}
        </button>
      </div>
    </section>

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
.faction-pick__title,
.lb-section-title {
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 2.5vw, 1.75rem);
  letter-spacing: 0.02em;
}

.faction-pick__lead,
.lb-section-lead {
  margin-top: 0.35rem;
  color: var(--color-ink-muted);
  max-width: 40rem;
}

.faction-pick__grid {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.faction-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 1rem 1.1rem 1.15rem;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--faction-accent) 45%, transparent);
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--faction-accent) 18%, transparent),
      transparent 70%
    ),
    var(--color-surface);
  color: inherit;
  cursor: pointer;
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    border-color var(--dur-base) ease;
}

.faction-card:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--faction-accent);
}

.faction-card:disabled {
  opacity: 0.6;
  cursor: wait;
}

.faction-card__banner {
  display: block;
  width: 100%;
  height: 0.35rem;
  margin-bottom: 0.5rem;
  background: var(--faction-accent);
}

.faction-card__name {
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.faction-card__tone {
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.lb-faction-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lb-faction-row {
  display: grid;
  grid-template-columns: 2rem 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.85rem;
  border-left: 3px solid var(--faction-accent);
  background: color-mix(in srgb, var(--faction-accent) 8%, var(--color-surface));
}

.lb-faction-row__rank {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.lb-faction-row__name {
  font-family: var(--font-display);
}

.lb-faction-row__meta {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

.lb-faction-row__score {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.lb-me-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}

.lb-me {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.95rem;
}

.lb-me--spacer {
  min-height: 1.25rem;
}

.lb-filter {
  min-width: 10rem;
}

.lb-table-wrap {
  overflow-x: auto;
}

.lb-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.4rem;
  font-size: 0.95rem;
}

.lb-table th,
.lb-table td {
  padding: 0.35rem 0.5rem;
  text-align: left;
  vertical-align: middle;
}

.lb-table th {
  padding-bottom: 0.55rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-ink-muted);
  font-weight: 600;
}

.lb-col-rank {
  width: 3rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.lb-col-score {
  width: 5.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.lb-col-player {
  padding-left: 0 !important;
  padding-right: 0.35rem !important;
}

.lb-table tbody tr.is-me td {
  background: color-mix(in srgb, var(--color-indigo) 10%, transparent);
}

.lb-table tbody tr.is-me td:first-child {
  border-radius: 0.5rem 0 0 0.5rem;
}

.lb-table tbody tr.is-me td:last-child {
  border-radius: 0 0.5rem 0.5rem 0;
}

.lb-faction-chip {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-left: 3px solid var(--faction-accent);
  font-size: 0.85rem;
}

.lb-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.lb-pager__label {
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
  font-size: 0.9rem;
}
</style>

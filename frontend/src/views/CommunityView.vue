<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/ui/PageHeader.vue';
import VillageRewardsPanel from '../components/layout/VillageRewardsPanel.vue';
import { friendGroups, maxSearchLength, useCommunity } from '../composables/useCommunity.js';
import { useFactionStandings } from '../composables/useFactionStandings.js';
import { sectionOf } from '../constants/sections.js';
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js';

const { t, te, d, n } = useI18n();
const section = sectionOf('village');
useOnboardingVisit('visit_village');
const query = ref('');
const rewardsPanel = ref(null);
const {
  friendships,
  busy,
  friendsError,
  updated,
  canMutate,
  friendStatuses,
  players,
  searching,
  searchFailed,
  refresh: refreshFriends,
  requestFriend,
  acceptFriend,
  removeFriend,
  clearSearch,
  search,
} = useCommunity();

const {
  standings,
  loading: standingsLoading,
  loadFailed: standingsLoadFailed,
  refresh: refreshStandings,
} = useFactionStandings();
const standingsKey = 'village.weeklyStandings';
const factionWeeks = computed(() => {
  if (!standings.value) return [];
  const { currentWeek, previousWeek, rewardStarts } = standings.value;
  const weeks = [{ ...currentWeek, key: 'currentWeek', rewardStarts }];
  if (previousWeek) weeks.push({ ...previousWeek, key: 'previousWeek' });
  return weeks;
});

function refresh() {
  return Promise.all([refreshFriends(), refreshStandings(), rewardsPanel.value?.refresh()]);
}

function factionName(id) {
  const key = `factions.names.${id}`;
  return te(key) ? t(key) : id;
}

function formatUtc(date) {
  return d(date, { dateStyle: 'medium', timeZone: 'UTC' });
}

function rewardLabel({ rewardRyos, rewardStarts }) {
  if (rewardStarts) {
    const date = formatUtc(rewardStarts);
    return rewardRyos > 0
      ? t(`${standingsKey}.upcomingReward`, { n: n(rewardRyos), date })
      : t(`${standingsKey}.rewardStart`, { date });
  }
  return rewardRyos > 0 ? t(`${standingsKey}.reward`, { n: n(rewardRyos) }) : null;
}

onMounted(refresh);
</script>

<template>
  <div class="page-shell" data-testid="community-page">
    <PageHeader :title="t('village.title')" :lead="t('village.pageLead')" :tone="section.tone">
      <template #actions>
        <button
          type="button"
          class="btn-ghost"
          :disabled="busy || standingsLoading"
          @click="refresh"
        >
          {{ t('community.refresh') }}
        </button>
      </template>
    </PageHeader>

    <VillageRewardsPanel ref="rewardsPanel" />

    <section class="page-section panel community-panel" aria-labelledby="village-standings">
      <h2 id="village-standings" class="t-heading">{{ t(`${standingsKey}.title`) }}</h2>
      <p v-if="standingsLoadFailed" class="alert alert--error" role="alert">
        {{ t(`${standingsKey}.loadFailed`) }}
      </p>
      <p v-else-if="!standings" role="status">{{ t('common.loading') }}</p>
      <div v-else class="village-weeks">
        <div v-for="week in factionWeeks" :key="week.key" class="community-panel">
          <h3 class="t-kicker">{{ t(`${standingsKey}.${week.key}`) }}</h3>
          <p v-if="week.start && week.end" class="text-ink-muted">
            {{
              t(`${standingsKey}.period`, {
                start: formatUtc(week.start),
                end: formatUtc(week.end),
              })
            }}
          </p>
          <p v-if="week.rewardRyos > 0 || week.rewardStarts">{{ rewardLabel(week) }}</p>
          <template v-if="week.key === 'previousWeek'">
            <p>
              {{
                week.winnerId == null
                  ? t(`${standingsKey}.noWinner`)
                  : t(`${standingsKey}.winner`, { name: factionName(week.winnerId) })
              }}
            </p>
            <p v-if="week.settled != null" class="text-ink-muted">
              {{ t(`${standingsKey}.${week.settled ? 'settled' : 'pending'}`) }}
            </p>
          </template>
          <p v-if="!week.factions.length" class="text-ink-muted">
            {{ t(`${standingsKey}.empty`) }}
          </p>
          <ul v-else class="community-list">
            <li v-for="faction in week.factions" :key="faction.id" class="community-row">
              <strong>{{ factionName(faction.id) }}</strong>
              <span>{{
                t(`${standingsKey}.points`, { n: n(faction.points) }, faction.points)
              }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <div class="page-section community-grid">
      <section class="panel community-panel" aria-labelledby="community-search-heading">
        <h2 id="community-search-heading" class="t-heading">{{ t('community.searchTitle') }}</h2>
        <form class="community-search" role="search" @submit.prevent="search(query)">
          <label class="field community-search__field">
            <span class="field__label">{{ t('community.searchLabel') }}</span>
            <input
              v-model="query"
              class="input-field"
              type="search"
              :maxlength="maxSearchLength"
              @input="clearSearch"
            />
          </label>
          <button type="submit" class="btn-primary" :disabled="searching || !query.trim()">
            {{ t('community.search') }}
          </button>
        </form>
        <div role="status" :class="{ 'sr-only': !searching && players?.length !== 0 }">
          <p v-if="searching">{{ t('common.loading') }}</p>
          <p v-else-if="players?.length === 0" class="text-ink-muted">
            {{ t('community.noResults') }}
          </p>
        </div>
        <p v-if="searchFailed" class="alert alert--error" role="alert">
          {{ t('community.searchFailed') }}
        </p>
        <ul v-if="players?.length" class="community-list">
          <li v-for="player in players" :key="player.id" class="community-row">
            <strong>{{ player.name }}</strong>
            <span v-if="friendStatuses.has(String(player.id))" class="text-ink-muted">
              {{ t(`community.groups.${friendStatuses.get(String(player.id))}.status`) }}
            </span>
            <button
              v-else
              type="button"
              class="btn-ghost btn-sm"
              :disabled="!canMutate"
              :aria-label="t('community.sendRequestTo', { name: player.name })"
              @click="requestFriend(player.id)"
            >
              {{ t('community.sendRequest') }}
            </button>
          </li>
        </ul>
      </section>

      <div class="community-groups">
        <div role="status" :class="{ 'sr-only': !busy && !updated }">
          <p v-if="busy">{{ t('common.loading') }}</p>
          <p v-else-if="updated" class="text-ink-muted">{{ t('community.updated') }}</p>
        </div>
        <p v-if="friendsError" class="alert alert--error" role="alert">
          {{ t(`community.${friendsError}`) }}
        </p>
        <template v-if="friendships">
          <section
            v-for="group in friendGroups"
            :key="group"
            class="panel community-panel"
            :aria-labelledby="`community-${group}-heading`"
          >
            <h2 :id="`community-${group}-heading`" class="t-heading">
              {{ t(`community.groups.${group}.title`) }}
            </h2>
            <p v-if="!friendships[group].length" class="text-ink-muted">
              {{ t(`community.groups.${group}.empty`) }}
            </p>
            <ul v-else class="community-list">
              <li v-for="player in friendships[group]" :key="player.id" class="community-row">
                <strong>{{ player.name }}</strong>
                <div class="community-actions">
                  <button
                    v-if="group === 'incoming'"
                    type="button"
                    class="btn-primary btn-sm"
                    :disabled="!canMutate"
                    :aria-label="t('community.acceptFrom', { name: player.name })"
                    @click="acceptFriend(player.id)"
                  >
                    {{ t('community.accept') }}
                  </button>
                  <button
                    type="button"
                    class="btn-ghost btn-sm"
                    :disabled="!canMutate"
                    :aria-label="t(`community.groups.${group}.removeByName`, { name: player.name })"
                    @click="removeFriend(player.id)"
                  >
                    {{ t(`community.groups.${group}.remove`) }}
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-grid,
.community-groups,
.village-weeks {
  display: grid;
  gap: 1rem;
  align-content: start;
}

.community-grid {
  align-items: start;
}

.community-panel {
  display: grid;
  align-content: start;
  min-width: 0;
  gap: 0.75rem;
}

.community-search,
.community-row,
.community-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.community-search {
  align-items: end;
}

.community-search__field {
  flex: 1 1 12rem;
  min-width: 0;
}

.community-search__field input {
  width: 100%;
}

.community-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.community-row {
  justify-content: space-between;
  padding: 0.55rem 0;
  border-top: 1px solid var(--color-line);
  overflow-wrap: anywhere;
}

@media (min-width: 900px) {
  .community-grid,
  .village-weeks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

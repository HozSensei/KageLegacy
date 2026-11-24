<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FACTION_IDS } from '../../constants/factions.js';
import { useCommunityActivity } from '../../composables/useCommunityActivity.js';
import PlayerIdentityChip from '../player/PlayerIdentityChip.vue';

defineOptions({ name: 'ActivityWall' });

const emit = defineEmits(['open-profile']);
const { t, te, d } = useI18n();

const {
  events,
  loading,
  loadingMore,
  loadFailed,
  hasMore,
  factionId,
  outcome,
  refresh,
  loadMore,
  setFactionFilter,
  setOutcomeFilter,
} = useCommunityActivity();

const sentinel = ref(null);
let observer;

function factionName(id) {
  const key = `factions.names.${id}`;
  return te(key) ? t(key) : id;
}

function kindLabel(kind) {
  const key = `village.activity.kinds.${kind}`;
  return te(key) ? t(key) : kind;
}

function formatWhen(value) {
  if (!value) return '';
  return d(new Date(value), { dateStyle: 'short', timeStyle: 'short' });
}

onMounted(() => {
  refresh();
  observer = new IntersectionObserver(
    entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    },
    { rootMargin: '120px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
});

watch(sentinel, (el, prev) => {
  if (!observer) return;
  if (prev) observer.unobserve(prev);
  if (el) observer.observe(el);
});

onBeforeUnmount(() => observer?.disconnect());

defineExpose({ refresh });
</script>

<template>
  <section class="page-section panel community-panel activity-wall" aria-labelledby="activity-wall">
    <h2 id="activity-wall" class="t-heading">{{ t('village.activity.title') }}</h2>
    <p class="text-ink-muted">{{ t('village.activity.lead') }}</p>

    <div class="activity-wall__filters">
      <label class="field">
        <span class="field__label">{{ t('village.activity.filterVillage') }}</span>
        <select
          class="input-field"
          :value="factionId || ''"
          @change="setFactionFilter($event.target.value || null)"
        >
          <option value="">{{ t('village.activity.allVillages') }}</option>
          <option v-for="id in FACTION_IDS" :key="id" :value="id">{{ factionName(id) }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field__label">{{ t('village.activity.filterOutcome') }}</span>
        <select
          class="input-field"
          :value="outcome || ''"
          @change="setOutcomeFilter($event.target.value || null)"
        >
          <option value="">{{ t('village.activity.allOutcomes') }}</option>
          <option value="success">{{ t('village.activity.successOnly') }}</option>
          <option value="failure">{{ t('village.activity.failureOnly') }}</option>
        </select>
      </label>
    </div>

    <p v-if="loadFailed" class="alert alert--error" role="alert">
      {{ t('village.activity.loadFailed') }}
    </p>
    <p v-else-if="loading" role="status">{{ t('common.loading') }}</p>
    <p v-else-if="!events.length" class="text-ink-muted">{{ t('village.activity.empty') }}</p>

    <ul v-if="events.length" class="activity-wall__list">
      <li v-for="event in events" :key="event.id" class="activity-wall__row">
        <PlayerIdentityChip
          :user-id="event.player?.userId"
          :name="event.player?.name || t('community.unknownPlayer')"
          :profile="event.player?.profile"
          :level="event.player?.level"
          @open="(userId, event) => emit('open-profile', userId, event)"
        />
        <div class="activity-wall__meta">
          <span>{{ kindLabel(event.kind) }}</span>
          <time class="text-ink-muted" :datetime="event.createdAt">
            {{ formatWhen(event.createdAt) }}
          </time>
        </div>
      </li>
    </ul>

    <div ref="sentinel" class="activity-wall__sentinel" aria-hidden="true" />
    <p v-if="loadingMore" class="text-ink-muted" role="status">{{ t('village.activity.loadingMore') }}</p>
    <p v-else-if="events.length && !hasMore" class="text-ink-muted">
      {{ t('village.activity.end') }}
    </p>
  </section>
</template>

<style scoped>
.activity-wall {
  display: grid;
  gap: 0.75rem;
}

.activity-wall__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.activity-wall__filters .field {
  flex: 1 1 10rem;
  min-width: 0;
}

.activity-wall__list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 28rem;
  overflow: auto;
}

.activity-wall__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0;
  border-top: 1px solid var(--color-line);
}

.activity-wall__meta {
  display: grid;
  gap: 0.15rem;
  text-align: right;
  font-size: 0.9rem;
}

.activity-wall__sentinel {
  height: 1px;
}
</style>

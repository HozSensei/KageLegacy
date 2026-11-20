<script setup>
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { villageRewardsHash } from '../../composables/useVillageRewards.js';
import { useVillageRewardsStore } from '../../stores/villageRewards.js';

const { t, te, d, n } = useI18n();
const route = useRoute();
const store = useVillageRewardsStore();
const key = 'community.villageRewards';
const section = ref(null);
const heading = ref(null);
const list = ref(null);
const visible = ref(false);
const consultedSnapshot = shallowRef(null);
let visit = 0;

async function refresh() {
  const currentVisit = ++visit;
  consultedSnapshot.value = null;
  const snapshot = await store.refresh();
  if (currentVisit === visit && route.name === 'village' && snapshot?.unreadCount > 0) {
    consultedSnapshot.value = snapshot;
  }
}

defineExpose({ refresh });

function syncVisibility() {
  visible.value = !document.hidden;
}

function openAnchor() {
  if (route.name !== 'village' || route.hash !== villageRewardsHash) return false;
  heading.value?.focus({ preventScroll: true });
  section.value?.scrollIntoView({ block: 'start' });
  return true;
}

watch(
  [() => route.hash, () => store.anchorVisits],
  () => {
    if (openAnchor()) refresh();
  },
  { flush: 'post' }
);

onMounted(async () => {
  syncVisibility();
  document.addEventListener('visibilitychange', syncVisibility);
  await nextTick();
  openAnchor();
});

onUnmounted(() => {
  visit += 1;
  document.removeEventListener('visibilitychange', syncVisibility);
});

watchEffect(
  onCleanup => {
    const snapshot = consultedSnapshot.value;
    const latest = list.value?.firstElementChild;
    if (!latest || !snapshot || !visible.value || route.name !== 'village') return;

    // Wait until the latest confirmed row is readable below the sticky header.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          !entry?.isIntersecting ||
          entry.intersectionRatio < 0.6 ||
          document.hidden ||
          route.name !== 'village' ||
          consultedSnapshot.value !== snapshot
        )
          return;
        consultedSnapshot.value = null;
        void store.markSeen(snapshot);
      },
      { rootMargin: '-64px 0px 0px', threshold: 0.6 }
    );
    observer.observe(latest);
    onCleanup(() => observer.disconnect());
  },
  { flush: 'post' }
);

function formatUtc(value) {
  return d(new Date(value), { dateStyle: 'medium', timeZone: 'UTC' });
}

function factionName(id) {
  const factionKey = `factions.names.${id}`;
  return te(factionKey) ? t(factionKey) : String(id);
}
</script>

<template>
  <section
    id="village-rewards"
    ref="section"
    class="page-section panel village-rewards"
    aria-labelledby="village-rewards-heading"
  >
    <h2 id="village-rewards-heading" ref="heading" class="t-heading" tabindex="-1">
      {{ t(`${key}.title`) }}
    </h2>
    <p class="text-ink-muted">{{ t(`${key}.intro`) }}</p>
    <p v-if="store.loadFailed" class="alert alert--error" role="alert">
      {{ t(`${key}.loadFailed`) }}
    </p>
    <p v-else-if="store.loading && !store.rewards" role="status">{{ t('common.loading') }}</p>
    <p v-else-if="store.rewards?.length === 0" class="text-ink-muted">{{ t(`${key}.empty`) }}</p>
    <ul v-if="store.rewards?.length" ref="list" class="village-rewards__list">
      <li v-for="reward in store.rewards" :key="reward.weekStart" class="village-rewards__row">
        <div>
          <strong>{{ factionName(reward.factionId) }}</strong>
          <p class="text-ink-muted">
            {{
              t(`${key}.period`, {
                start: formatUtc(reward.weekStart),
                end: formatUtc(reward.weekEnd),
              })
            }}
          </p>
        </div>
        <div>
          <strong>{{ t(`${key}.amount`, { n: n(reward.ryos) }) }}</strong>
          <p class="text-ink-muted">
            {{ t(`${key}.settledAt`, { date: formatUtc(reward.settledAt) }) }}
          </p>
        </div>
      </li>
    </ul>
    <p v-if="store.readFailed" class="alert alert--error" role="alert">
      {{ t(`${key}.readFailed`) }}
    </p>
  </section>
</template>

<style scoped>
.village-rewards {
  display: grid;
  min-width: 0;
  gap: 0.75rem;
  scroll-margin-block-start: 4.5rem;
}

.village-rewards__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.village-rewards__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding-block: 0.55rem;
  border-top: 1px solid var(--color-line);
  overflow-wrap: anywhere;
}
</style>

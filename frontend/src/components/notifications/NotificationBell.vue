<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useNotificationCopy } from '../../composables/useNotificationCopy.js';
import { villageRewardsHash } from '../../composables/useVillageRewards.js';
import { useNotificationsStore } from '../../stores/notifications.js';
import { useVillageRewardsStore } from '../../stores/villageRewards.js';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'NotificationBell' });

const { t } = useI18n();
const router = useRouter();
const store = useNotificationsStore();
const villageRewards = useVillageRewardsStore();
const { title, body, linkPath, linkLabel } = useNotificationCopy();

const open = ref(false);
const root = ref(null);
const panel = ref(null);

const villageEntry = computed(() => {
  const count = villageRewards.unreadCount || 0;
  if (count <= 0) return null;
  return {
    id: 'village-ready',
    kind: 'village_ready',
    read: false,
    sticky: true,
    payload: { count },
    href: { name: 'village', hash: villageRewardsHash },
    createdAt: Date.parse(villageRewards.rewards?.[0]?.settledAt || '') || Date.now(),
  };
});

const feed = computed(() => {
  const list = [...(store.items || [])];
  if (villageEntry.value) list.unshift(villageEntry.value);
  return list;
});

const unreadCount = computed(
  () => (store.unreadCount || 0) + (villageRewards.unreadCount || 0)
);

const bellLabel = computed(() =>
  unreadCount.value > 0
    ? t('notifications.unreadCount', unreadCount.value)
    : t('notifications.bell')
);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function onDocumentClick(event) {
  if (!open.value) return;
  const inRoot = root.value?.contains(event.target);
  const inPanel = panel.value?.contains(event.target);
  if (!inRoot && !inPanel) close();
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) close();
}

async function dismiss(note, event) {
  event?.stopPropagation();
  if (note.kind === 'village_ready') {
    const snapshot = {
      unreadCount: villageRewards.unreadCount,
      throughWeekStart: villageRewards.rewards?.[0]?.weekStart,
    };
    if (snapshot.unreadCount && snapshot.throughWeekStart) {
      await villageRewards.markSeen(snapshot);
    }
    return;
  }
  store.dismiss(note.id);
}

function followLink(note, event) {
  event?.stopPropagation();
  const path = linkPath(note);
  if (!path) return;
  router.push(path);
  close();
  if (note.kind !== 'village_ready' && note.kind !== 'quest_ready' && note.kind !== 'onboarding_ready') {
    store.dismiss(note.id);
  }
}

watch(open, value => {
  if (value) nextTick(() => panel.value?.querySelector('button, a')?.focus?.());
});

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div ref="root" class="notification-bell">
    <button
      type="button"
      class="btn-icon app-bar__rewards"
      :aria-label="bellLabel"
      :title="bellLabel"
      :aria-expanded="open"
      data-testid="notification-bell"
      @click.stop="toggle"
    >
      <AppIcon name="bell" aria-hidden="true" />
      <span
        v-if="unreadCount > 0"
        class="app-bar__unread-dot"
        data-testid="village-rewards-unread"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        class="notification-panel"
        role="dialog"
        :aria-label="t('notifications.panelTitle')"
        data-testid="notification-panel"
        @click.stop
      >
        <div class="notification-panel__header">
          <p class="notification-panel__title">{{ t('notifications.panelTitle') }}</p>
        </div>

        <div v-if="!feed.length" class="notification-panel__empty">
          {{ t('notifications.empty') }}
        </div>

        <ul v-else class="notification-panel__list">
          <li v-for="note in feed" :key="note.id" class="notification-panel__item">
            <p class="notification-panel__kind">{{ title(note) }}</p>
            <p class="notification-panel__body">{{ body(note) }}</p>
            <div class="notification-panel__actions">
              <button
                v-if="linkPath(note)"
                type="button"
                class="btn-ghost btn-sm"
                data-testid="notification-follow"
                @click="followLink(note, $event)"
              >
                {{ linkLabel(note) }}
              </button>
              <button
                type="button"
                class="btn-ghost btn-sm"
                data-testid="notification-dismiss"
                @click="dismiss(note, $event)"
              >
                {{ t('notifications.dismiss') }}
              </button>
            </div>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}

.app-bar__rewards {
  position: relative;
}

.app-bar__unread-dot {
  position: absolute;
  inset-block-start: 0.35rem;
  inset-inline-end: 0.35rem;
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid var(--color-bg);
  border-radius: 50%;
  background: var(--color-vermilion);
}

.notification-panel {
  position: fixed;
  top: 3.75rem;
  right: max(0.75rem, calc((100vw - 72rem) / 2 + 0.75rem));
  z-index: 45;
  width: min(22rem, calc(100vw - 1.5rem));
  max-height: min(28rem, calc(100dvh - 5rem));
  overflow: auto;
  border-top: 4px solid var(--color-indigo);
  background: var(--color-bg-card, var(--color-bg));
  outline: 1px solid var(--color-line);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.notification-panel__header {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-line);
}

.notification-panel__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.notification-panel__empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
}

.notification-panel__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notification-panel__item {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-line) 70%, transparent);
}

.notification-panel__item:last-child {
  border-bottom: 0;
}

.notification-panel__kind {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent, var(--color-indigo));
}

.notification-panel__body {
  margin: 0.45rem 0 0;
  font-size: 0.875rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.notification-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.65rem;
}
</style>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useNotificationCopy } from '../../composables/useNotificationCopy.js';
import { useNotificationsStore } from '../../stores/notifications.js';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'NotificationBell' });

const { t } = useI18n();
const router = useRouter();
const store = useNotificationsStore();
const { title, body, linkPath, linkLabel } = useNotificationCopy();

const open = ref(false);
const root = ref(null);
const panel = ref(null);

const feed = computed(() => {
  const list = [...(store.items || [])];
  return list.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
});

const unreadCount = computed(() => store.unreadCount || 0);

const bellLabel = computed(() =>
  unreadCount.value > 0
    ? t('notifications.unreadCount', unreadCount.value)
    : t('notifications.bell')
);

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Timestamp compact : JJ/MM/AAAA, HH:mm */
function formatTimestamp(ms) {
  const d = new Date(Number(ms) || Date.now());
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

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

async function toggleRead(note, event) {
  event?.stopPropagation();
  if (note.read) {
    await store.markUnread(note.id);
  } else {
    await store.markRead(note.id);
  }
}

async function remove(note, event) {
  event?.stopPropagation();
  await store.remove(note.id);
}

async function followLink(note, event) {
  event?.stopPropagation();
  const path = linkPath(note);
  if (!path) return;
  if (!note.read) await store.markRead(note.id);
  router.push(path);
  close();
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
        data-testid="notification-unread"
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
          <button
            v-if="unreadCount > 0"
            type="button"
            class="btn-ghost btn-sm"
            data-testid="notification-read-all"
            @click="store.markAllRead()"
          >
            {{ t('notifications.markAllRead') }}
          </button>
        </div>

        <div v-if="!feed.length" class="notification-panel__empty">
          {{ t('notifications.empty') }}
        </div>

        <ul v-else class="notification-panel__list">
          <li
            v-for="note in feed"
            :key="note.id"
            class="notification-panel__item"
            :class="{ 'notification-panel__item--read': note.read }"
          >
            <p class="notification-panel__kind">{{ title(note) }}</p>
            <p class="notification-panel__body">{{ body(note) }}</p>
            <div class="notification-panel__footer">
              <time
                class="notification-panel__time"
                :datetime="new Date(note.createdAt).toISOString()"
              >
                {{ formatTimestamp(note.createdAt) }}
              </time>
              <div class="notification-panel__actions">
                <button
                  v-if="linkPath(note)"
                  type="button"
                  class="notification-panel__icon-btn"
                  :aria-label="linkLabel(note)"
                  :title="linkLabel(note)"
                  data-testid="notification-follow"
                  @click="followLink(note, $event)"
                >
                  <AppIcon name="open_in_new" size="1rem" :stroke-width="0" />
                </button>
                <button
                  type="button"
                  class="notification-panel__icon-btn"
                  :aria-label="note.read ? t('notifications.markUnread') : t('notifications.dismiss')"
                  :title="note.read ? t('notifications.markUnread') : t('notifications.dismiss')"
                  data-testid="notification-dismiss"
                  @click="toggleRead(note, $event)"
                >
                  <AppIcon
                    :name="note.read ? 'visibility_off' : 'visibility'"
                    size="1rem"
                    :stroke-width="0"
                  />
                </button>
                <button
                  type="button"
                  class="notification-panel__icon-btn"
                  :aria-label="t('notifications.delete')"
                  :title="t('notifications.delete')"
                  data-testid="notification-delete"
                  @click="remove(note, $event)"
                >
                  <AppIcon name="delete" size="1rem" :stroke-width="0" />
                </button>
              </div>
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

/* Hover inversion du btn-icon : garder le point rouge lisible sur le fond encre. */
.app-bar__rewards:hover .app-bar__unread-dot,
.app-bar__rewards:focus-visible .app-bar__unread-dot {
  border-color: var(--color-ink);
}

.notification-panel {
  position: fixed;
  top: 3.75rem;
  right: max(0.75rem, calc((100vw - 72rem) / 2 + 0.75rem));
  z-index: 45;
  width: min(22rem, calc(100vw - 1.5rem));
  max-height: min(28rem, calc(100dvh - 5rem));
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-bg-card, var(--color-bg));
}

.notification-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
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
  padding: 0.9rem 1rem 0.55rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-line) 70%, transparent);
}

.notification-panel__item:last-child {
  border-bottom: 0;
}

.notification-panel__item--read {
  opacity: 0.62;
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

.notification-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.55rem;
  padding-top: 0.4rem;
  border-top: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
}

.notification-panel__time {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1;
  color: var(--color-ink-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.notification-panel__actions {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex: none;
}

.notification-panel__icon-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
}

.notification-panel__icon-btn:hover,
.notification-panel__icon-btn:focus-visible {
  color: var(--color-ink);
  background: color-mix(in srgb, var(--color-ink) 8%, transparent);
  outline: none;
}
</style>

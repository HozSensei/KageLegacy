<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useNotificationCopy } from '../../composables/useNotificationCopy'
import { useAnchoredPopover } from '../../composables/useAnchoredPopover.js'

const { t } = useI18n()
const router = useRouter()
const store = useSquadStore()
const { title, body, linkPath, linkLabel } = useNotificationCopy()

const open = ref(false)
const dismissingId = ref(null)
const root = ref(null)
const trigger = ref(null)
const panel = ref(null)

const { panelStyle, updatePosition } = useAnchoredPopover(trigger, panel, open)

const notifications = computed(() =>
  [...(store.notifications || [])].reverse()
)

const unreadCount = computed(() => notifications.value.length)

function toggle() {
  open.value = !open.value
  if (open.value && !store.sensei) {
    store.fetchSquad()
  }
}

function close() {
  open.value = false
}

function onDocumentClick(event) {
  if (!open.value) return
  const inTrigger = root.value?.contains(event.target)
  const inPanel = panel.value?.contains(event.target)
  if (!inTrigger && !inPanel) close()
}

async function dismiss(id, event) {
  event?.stopPropagation()
  dismissingId.value = id
  try {
    await store.dismissNotification(id)
  } finally {
    dismissingId.value = null
  }
}

function followLink(note, event) {
  event?.stopPropagation()
  const path = linkPath(note)
  if (path) {
    router.push(path)
    close()
  }
}

watch(notifications, () => {
  if (open.value) nextTick(updatePosition)
})

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="trigger"
      type="button"
      class="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition hover:border-accent/40 hover:text-accent"
      :aria-label="t('notifications.bell')"
      :aria-expanded="open"
      data-testid="notification-bell"
      @click.stop="toggle"
    >
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fire px-1 text-[10px] font-medium text-bg"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        class="notification-panel"
        :style="panelStyle"
        role="dialog"
        :aria-label="t('notifications.panelTitle')"
        data-testid="notification-panel"
        @click.stop
      >
        <div class="notification-panel__header border-b border-line px-4 py-3">
          <p class="text-sm font-medium text-ink">{{ t('notifications.panelTitle') }}</p>
        </div>

        <div v-if="!notifications.length" class="px-4 py-8 text-center text-sm text-ink-muted">
          {{ t('notifications.empty') }}
        </div>

        <ul v-else class="notification-panel__list">
          <li
            v-for="note in notifications"
            :key="note.id"
            class="border-b border-line/60 px-4 py-4 last:border-b-0"
          >
            <p class="text-[10px] uppercase tracking-[0.14em] text-accent">{{ title(note) }}</p>
            <p class="mt-2 text-sm leading-relaxed text-ink">{{ body(note) }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-if="linkPath(note)"
                type="button"
                class="btn-ghost text-[10px]"
                data-testid="notification-follow"
                @click="followLink(note, $event)"
              >
                {{ linkLabel(note) }}
              </button>
              <button
                type="button"
                class="btn-ghost text-[10px]"
                data-testid="notification-dismiss"
                :disabled="dismissingId === note.id"
                @click="dismiss(note.id, $event)"
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

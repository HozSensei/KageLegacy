<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useNotificationCopy } from '../../composables/useNotificationCopy'

const { t } = useI18n()
const router = useRouter()
const store = useSquadStore()
const { title, body, linkPath, linkLabel } = useNotificationCopy()

const open = ref(false)
const dismissingId = ref(null)
const root = ref(null)

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
  if (root.value && !root.value.contains(event.target)) {
    close()
  }
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

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition hover:border-accent/40 hover:text-accent"
      :aria-label="t('notifications.bell')"
      :aria-expanded="open"
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

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-3rem))] border border-line bg-bg-card shadow-lg"
      role="dialog"
      :aria-label="t('notifications.panelTitle')"
      @click.stop
    >
      <div class="border-b border-line px-4 py-3">
        <p class="text-sm font-medium text-ink">{{ t('notifications.panelTitle') }}</p>
      </div>

      <div v-if="!notifications.length" class="px-4 py-8 text-center text-sm text-ink-muted">
        {{ t('notifications.empty') }}
      </div>

      <ul v-else class="max-h-[min(24rem,60vh)] overflow-y-auto">
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
              @click="followLink(note, $event)"
            >
              {{ linkLabel(note) }}
            </button>
            <button
              type="button"
              class="btn-ghost text-[10px]"
              :disabled="dismissingId === note.id"
              @click="dismiss(note.id, $event)"
            >
              {{ t('notifications.dismiss') }}
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

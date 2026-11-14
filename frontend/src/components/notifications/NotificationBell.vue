<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

defineOptions({ name: 'NotificationBell' })

const { t } = useI18n()
const store = useSquadStore()
const open = ref(false)

const unreadCount = computed(() => (store.notifications || []).length)

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative border border-line px-2.5 py-1.5 text-ink-muted transition hover:border-accent hover:text-accent"
      :aria-label="t('notifications.bell')"
      data-testid="notification-bell"
      @click="toggle"
    >
      <span class="text-xs uppercase tracking-[0.12em]">{{ t('notifications.bell') }}</span>
      <span
        v-if="unreadCount"
        class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] text-bg"
      >
        {{ unreadCount }}
      </span>
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-40 mt-2 w-72 border border-line bg-bg-card p-4 text-sm text-ink-muted shadow-lg"
    >
      <p class="font-display text-ink">{{ t('notifications.panelTitle') }}</p>
      <p class="mt-2 text-xs text-ink-faint">{{ t('placeholders.comingSoon') }}</p>
    </div>
  </div>
</template>

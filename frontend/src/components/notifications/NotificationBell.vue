<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import AppIcon from '../ui/AppIcon.vue'

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
      class="btn-icon relative"
      :aria-label="t('notifications.bell')"
      :aria-expanded="open"
      data-testid="notification-bell"
      @click="toggle"
    >
      <AppIcon name="bell" size="1.25rem" />
      <span v-if="unreadCount" class="bell-count">{{ unreadCount }}</span>
    </button>
    <Transition name="rise">
      <div v-if="open" class="bell-panel">
        <p class="t-subheading">{{ t('notifications.panelTitle') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ t('placeholders.comingSoon') }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bell-count {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  display: grid;
  place-items: center;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--color-vermilion);
  font-size: 0.625rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-on-fill);
}

.bell-panel {
  position: absolute;
  right: 0;
  z-index: 40;
  width: 17rem;
  max-width: calc(100vw - 2rem);
  margin-top: 0.5rem;
  padding: 1rem 1.1rem;
  border-top: 4px solid var(--color-indigo);
  background: var(--color-bg-card);
  outline: 1px solid var(--color-line);
}
</style>

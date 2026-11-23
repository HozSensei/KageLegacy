<script setup>
import { useI18n } from 'vue-i18n';
import { useToast } from '../../composables/useToast.js';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'ToastContainer' });

const { t } = useI18n();
const { toasts, dismiss } = useToast();
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      tag="div"
      name="toast"
      class="toast-stack"
      aria-live="polite"
      data-testid="toast-container"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="{ 'toast--event': toast.kind === 'event' }"
        data-testid="toast-item"
      >
        <div class="min-w-0">
          <p class="toast__title">{{ toast.title }}</p>
          <p v-if="toast.body" class="toast__body">{{ toast.body }}</p>
        </div>
        <button
          type="button"
          class="toast__close"
          :aria-label="t('common.dismiss')"
          @click="dismiss(toast.id)"
        >
          <AppIcon name="close" size="1rem" :stroke-width="2" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: 1rem;
  bottom: 1.5rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(22rem, calc(100vw - 2rem));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-left: 5px solid var(--color-gold-fill);
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
  pointer-events: auto;
}

.toast--event {
  border-left-color: var(--color-vermilion);
}

.toast__title {
  margin: 0;
  font-size: var(--type-kicker, 0.7rem);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-gold-fill);
}

.toast__body {
  margin: 0.3rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.toast__close {
  flex: none;
  padding: 0.15rem;
  color: color-mix(in srgb, var(--color-on-fill) 75%, transparent);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: color var(--dur-fast, 0.15s) ease;
}

.toast__close:hover {
  color: var(--color-on-fill);
}

.toast-enter-active {
  transition:
    opacity var(--dur-base, 0.25s) ease,
    transform var(--dur-base, 0.25s) var(--ease-out-quint, ease-out);
}

.toast-leave-active {
  transition: opacity var(--dur-fast, 0.15s) ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(1.5rem);
}

.toast-leave-to {
  opacity: 0;
}
</style>

<script setup>
import { useToast } from '../../composables/useToast'

defineOptions({ name: 'ToastContainer' })

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-6 right-4 z-50 flex max-w-sm flex-col gap-2"
    aria-live="polite"
    data-testid="toast-container"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto border border-line bg-bg-card p-4 shadow-lg"
      :class="toast.kind === 'event' ? 'border-l-2 border-l-accent' : ''"
      data-testid="toast-item"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-[0.14em] text-accent">{{ toast.title }}</p>
          <p v-if="toast.body" class="mt-1 text-sm leading-relaxed text-ink">{{ toast.body }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 text-ink-faint transition hover:text-ink"
          aria-label="Fermer"
          @click="dismiss(toast.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

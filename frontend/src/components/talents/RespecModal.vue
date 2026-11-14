<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'RespecModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  respec: { type: Object, default: null },
  unlockedCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const { t } = useI18n()

const costLabel = computed(() => {
  if (!props.respec) return ''
  if (props.respec.free) return t('talents.respecFree')
  return t('talents.respecCost', { ryos: props.respec.costRyos })
})
</script>

<template>
  <div
    v-if="open"
    class="respec-modal"
    role="dialog"
    aria-modal="true"
    data-testid="respec-modal"
    @click.self="emit('close')"
  >
    <div class="respec-modal__panel">
      <p class="page-kicker">{{ t('talents.respecKicker') }}</p>
      <h2 class="font-display text-2xl text-ink">{{ t('talents.respecTitle') }}</h2>
      <p class="mt-3 text-sm text-ink-muted">
        {{ t('talents.respecLead', { count: unlockedCount }) }}
      </p>
      <p class="mt-4 text-sm text-accent">{{ costLabel }}</p>
      <p class="mt-2 text-xs text-ink-muted">
        {{ t('talents.respecHint', { n: respec?.everyLevels || 10 }) }}
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" class="btn-ghost text-xs" :disabled="loading" @click="emit('close')">
          {{ t('talents.cancel') }}
        </button>
        <button
          type="button"
          class="btn-primary text-xs"
          :disabled="loading || unlockedCount < 1"
          data-testid="respec-confirm"
          @click="emit('confirm')"
        >
          {{ loading ? t('talents.working') : t('talents.respecConfirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.respec-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-void, #0a0e0c) 72%, transparent);
  padding: 1.5rem;
  animation: respec-fade 0.2s ease-out;
}

.respec-modal__panel {
  width: min(28rem, 100%);
  border: 1px solid color-mix(in srgb, var(--color-line, #3a4a40) 80%, transparent);
  background: color-mix(in srgb, var(--color-panel, #151a17) 94%, transparent);
  padding: 1.5rem 1.75rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  animation: respec-rise 0.28s ease-out;
}

@keyframes respec-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes respec-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

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
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    data-testid="respec-modal"
    @click.self="emit('close')"
  >
    <div class="modal-panel">
      <p class="page-kicker">{{ t('talents.respecKicker') }}</p>
      <h2 class="t-heading mt-2">{{ t('talents.respecTitle') }}</h2>
      <p class="mt-4 leading-relaxed text-ink-muted">
        {{ t('talents.respecLead', { count: unlockedCount }) }}
      </p>
      <p class="respec-cost">{{ costLabel }}</p>
      <p class="mt-2 text-sm text-ink-faint">
        {{ t('talents.respecHint', { n: respec?.everyLevels || 10 }) }}
      </p>

      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-ghost" :disabled="loading" @click="emit('close')">
          {{ t('talents.cancel') }}
        </button>
        <button
          type="button"
          class="btn-primary"
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
.respec-cost {
  margin-top: 1rem;
  padding: 0.6rem 0.85rem;
  background: var(--color-gold-tint);
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-ink);
}
</style>

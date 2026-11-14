<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'LevelUpModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  levelsGained: { type: Number, default: 1 },
  talentPointsGained: { type: Number, default: 1 },
  level: { type: Number, default: null },
})

const emit = defineEmits(['close'])

const { t } = useI18n()

const title = computed(() =>
  props.levelsGained > 1
    ? t('player.levelUpTitleMulti', { count: props.levelsGained })
    : t('player.levelUpTitle')
)

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="modal-backdrop"
        data-testid="level-up-modal"
        @click.self="emit('close')"
      >
        <div class="modal-panel level-up" role="dialog" aria-modal="true">
          <span class="level-up__shape" aria-hidden="true" />
          <p class="page-kicker">{{ t('app.name') }}</p>
          <h2 class="t-heading mt-2">{{ title }}</h2>
          <p v-if="level" class="level-up__level">
            <span class="sr-only">{{ t('player.levelLabel', { level }) }}</span>
            <span class="level-up__level-label" aria-hidden="true">{{ t('player.levelWord') }}</span>
            <span class="level-up__level-value" aria-hidden="true">{{ level }}</span>
          </p>
          <p class="level-up__talent">
            {{ t('player.levelUpTalent', { count: talentPointsGained }) }}
          </p>
          <p class="mt-3 text-sm text-ink-muted">
            {{ t('player.levelUpNoStats') }}
          </p>
          <button type="button" class="btn-primary btn-block mt-6" @click="emit('close')">
            {{ t('common.dismiss') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.level-up {
  overflow: hidden;
}

.level-up > :not(.level-up__shape) {
  position: relative;
}

.level-up__shape {
  position: absolute;
  top: -3.5rem;
  right: -3.5rem;
  width: 10rem;
  height: 10rem;
  background: var(--color-gold-tint);
  transform: rotate(45deg);
}

.level-up__level {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.level-up__level-label {
  padding-bottom: 0.35rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.level-up__level-value {
  font-family: var(--font-display);
  font-size: clamp(4.5rem, 3rem + 8vw, 7rem);
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.8;
  letter-spacing: -0.04em;
  color: var(--color-vermilion);
  animation: pop-in 520ms var(--ease-spring) 120ms both;
}

.level-up__talent {
  margin-top: 1.25rem;
  padding: 0.7rem 0.9rem;
  border-left: 6px solid var(--color-leaf-fill);
  background: var(--color-leaf-tint);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-ink);
}
</style>

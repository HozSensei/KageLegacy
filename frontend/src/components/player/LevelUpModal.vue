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
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4 backdrop-blur-sm"
        data-testid="level-up-modal"
        @click.self="emit('close')"
      >
        <Transition
          appear
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-3 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
        >
          <div
            v-if="open"
            class="w-full max-w-md border border-line bg-bg-card p-8 text-center shadow-lg"
            role="dialog"
            aria-modal="true"
          >
            <p class="page-kicker">{{ t('app.name') }}</p>
            <h2 class="page-title mt-3">{{ title }}</h2>
            <p v-if="level" class="mt-2 text-sm text-ink-muted">
              {{ t('player.levelLabel', { level }) }}
            </p>
            <p class="mt-6 border-l-2 border-accent pl-4 text-left text-sm leading-6 text-ink">
              {{ t('player.levelUpTalent', { count: talentPointsGained }) }}
            </p>
            <p class="mt-3 text-left text-xs text-ink-faint">
              {{ t('player.levelUpNoStats') }}
            </p>
            <button
              type="button"
              class="mt-8 border border-accent bg-accent/10 px-6 py-2.5 text-[11px] uppercase tracking-[0.14em] text-accent transition hover:bg-accent/20"
              @click="emit('close')"
            >
              {{ t('common.dismiss') }}
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

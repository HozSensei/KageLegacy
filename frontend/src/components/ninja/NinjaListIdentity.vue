<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNinjaDisplay } from '../../composables/useNinjaDisplay.js'

defineOptions({ name: 'NinjaListIdentity' })

const props = defineProps({
  ninja: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
  firstNameOnly: { type: Boolean, default: false },
})

const { t } = useI18n()

const normalizedNinja = computed(() => ({
  ...props.ninja,
  trainingFocus: props.ninja.trainingFocus ?? props.ninja.training_focus ?? null,
}))

const {
  elementTone,
  elementLabel,
  gradeLabel,
  trainingFocusLabel,
} = useNinjaDisplay(normalizedNinja)

const displayName = computed(() => {
  if (!props.firstNameOnly) return props.ninja.name
  return props.ninja.name.split(' ')[0]
})
</script>

<template>
  <div :class="inline ? 'flex flex-wrap items-center gap-2' : ''">
    <p
      :class="
        compact
          ? 'font-display text-base text-ink'
          : inline
            ? 'text-sm text-ink'
            : 'text-sm font-medium text-ink'
      "
    >
      {{ displayName }}
    </p>
    <div
      class="flex flex-wrap gap-1.5"
      :class="inline ? '' : compact ? 'mt-1.5' : 'mt-2'"
    >
      <span
        v-if="gradeLabel"
        class="rounded-sm border border-line/80 px-1.5 py-0.5 text-xs uppercase tracking-[0.1em] text-ink-muted"
      >
        {{ t(gradeLabel) }}
      </span>
      <span
        v-if="trainingFocusLabel"
        class="rounded-sm border border-accent/30 bg-accent/5 px-1.5 py-0.5 text-xs uppercase tracking-[0.1em] text-accent-soft"
      >
        {{ t(trainingFocusLabel) }}
      </span>
      <span
        v-if="elementLabel"
        class="rounded-sm border border-line/80 px-1.5 py-0.5 text-xs uppercase tracking-[0.1em]"
        :class="elementTone"
      >
        {{ t(elementLabel) }}
      </span>
    </div>
  </div>
</template>

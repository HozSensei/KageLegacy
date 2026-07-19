<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'H2hScore' })

const props = defineProps({
  h2h: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()

const wins = computed(() => Number(props.h2h?.wins) || 0)
const draws = computed(() => Number(props.h2h?.draws) || 0)
const losses = computed(() => Number(props.h2h?.losses) || 0)

const title = computed(() =>
  t('league.h2hTitle', { w: wins.value, d: draws.value, l: losses.value }),
)
</script>

<template>
  <span
    class="inline-flex items-baseline gap-0.5 tabular-nums tracking-tight"
    :title="title"
    :aria-label="title"
    data-testid="h2h-score"
  >
    <span class="font-medium text-win">{{ wins }}</span>
    <span class="text-ink-faint" aria-hidden="true">/</span>
    <span class="text-ink-muted">{{ draws }}</span>
    <span class="text-ink-faint" aria-hidden="true">/</span>
    <span class="font-medium text-fire">{{ losses }}</span>
  </span>
</template>

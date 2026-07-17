<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  causalDebrief: { type: Object, default: null },
})

const { t } = useI18n()

const causes = computed(() => props.causalDebrief?.causes || [])

function polarityClass(polarity) {
  if (polarity === 'helped') return 'border-l-accent text-ink'
  if (polarity === 'hurt') return 'border-l-fire text-ink'
  return 'border-l-line text-ink-muted'
}
</script>

<template>
  <section
    v-if="causes.length"
    class="mt-10 border border-line px-5 py-5"
    data-testid="causal-debrief"
  >
    <p class="section-label">{{ t('causalDebrief.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('causalDebrief.lead') }}</p>

    <ol class="mt-6 space-y-4">
      <li
        v-for="(cause, index) in causes"
        :key="cause.code + index"
        class="border-l-2 pl-4"
        :class="polarityClass(cause.polarity)"
      >
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {{ t('causalDebrief.cause', { n: index + 1 }) }}
        </p>
        <p class="mt-1 font-medium text-ink">{{ cause.title }}</p>
        <p class="mt-1 text-sm text-ink-muted">{{ cause.detail }}</p>
      </li>
    </ol>
  </section>
</template>

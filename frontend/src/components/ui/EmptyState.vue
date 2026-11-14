<script setup>
import { RouterLink } from 'vue-router'

defineOptions({ name: 'EmptyState' })

defineProps({
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  primaryTo: { type: String, default: '' },
  primaryLabel: { type: String, default: '' },
  secondaryTo: { type: String, default: '' },
  secondaryLabel: { type: String, default: '' },
})
</script>

<template>
  <div class="empty-state border-l-2 border-accent/50 bg-bg-soft/40 px-5 py-6" data-testid="empty-state">
    <h2 class="font-display text-xl text-ink">{{ title }}</h2>
    <p v-if="lead" class="mt-2 max-w-lg text-sm leading-6 text-ink-muted">{{ lead }}</p>
    <div v-if="primaryTo || secondaryTo" class="mt-5 flex flex-wrap gap-3">
      <RouterLink
        v-if="primaryTo"
        :to="primaryTo"
        class="btn-primary text-xs"
        data-testid="empty-state-primary"
      >
        {{ primaryLabel }}
      </RouterLink>
      <RouterLink
        v-if="secondaryTo"
        :to="secondaryTo"
        class="btn-ghost text-xs"
        data-testid="empty-state-secondary"
      >
        {{ secondaryLabel }}
      </RouterLink>
    </div>
    <slot />
  </div>
</template>

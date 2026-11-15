<script setup>
import { RouterLink } from 'vue-router'
import BrandMark from './BrandMark.vue'

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
  <div class="empty-state" data-testid="empty-state">
    <div class="empty-state__mark" aria-hidden="true">
      <BrandMark size="3.25rem" />
    </div>
    <div class="empty-state__body">
      <h2 class="t-heading">{{ title }}</h2>
      <p v-if="lead" class="empty-state__lead">{{ lead }}</p>
      <div v-if="primaryTo || secondaryTo" class="empty-state__actions">
        <RouterLink v-if="primaryTo" :to="primaryTo" class="btn-primary" data-testid="empty-state-primary">
          {{ primaryLabel }}
        </RouterLink>
        <RouterLink
          v-if="secondaryTo"
          :to="secondaryTo"
          class="btn-ghost"
          data-testid="empty-state-secondary"
        >
          {{ secondaryLabel }}
        </RouterLink>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  gap: 1.25rem;
  padding: clamp(1.25rem, 4vw, 2.25rem);
  border-radius: var(--radius-md);
  background: var(--color-bg-soft);
  animation: rise-in 460ms var(--ease-out-quint) both;
}

.empty-state__mark {
  color: var(--color-vermilion);
}

.empty-state__lead {
  max-width: 34rem;
  margin-top: 0.6rem;
  line-height: 1.6;
  color: var(--color-ink-muted);
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.25rem;
}

@media (min-width: 640px) {
  .empty-state {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 1.75rem;
    align-items: start;
  }
}
</style>

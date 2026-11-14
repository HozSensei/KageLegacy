<script setup>
defineOptions({ name: 'BaseBadge' })

defineProps({
  label: { type: String, default: '' },
  /** Teinte du socle : vermilion, indigo, leaf, sky, wood, gold, ink, neutral. */
  tone: { type: String, default: 'neutral' },
  /** Aplat plein au lieu du fond teinté. */
  solid: { type: Boolean, default: false },
})
</script>

<template>
  <span class="badge" :class="solid ? 'badge--solid' : 'badge--tone'" :data-tone="tone">
    <slot>{{ label }}</slot>
  </span>
</template>

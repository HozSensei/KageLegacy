<script setup>
defineOptions({ name: 'VerifiedIcon' })

defineProps({
  size: { type: String, default: '1.125rem' },
})
</script>

<template>
  <span
    class="material-symbols-outlined material-symbols-filled elite-verified-icon"
    :style="{ fontSize: size }"
    aria-hidden="true"
  >verified</span>
</template>

<style scoped>
.elite-verified-icon {
  color: var(--color-accent);
  font-variation-settings:
    'FILL' 1,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
</style>

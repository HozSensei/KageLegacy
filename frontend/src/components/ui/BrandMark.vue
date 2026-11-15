<script setup>
defineOptions({ name: 'BrandMark' })

defineProps({
  size: { type: String, default: '1.75rem' },
})
</script>

<template>
  <svg
    class="brand-mark"
    viewBox="0 0 32 32"
    fill="none"
    :style="{ width: size, height: size }"
    aria-hidden="true"
  >
    <path d="M16 2 30 16 16 30 2 16Z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter" />
    <path d="M16 9 23 16 16 23 9 16Z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter" />
    <path d="M16 13.6 18.4 16 16 18.4 13.6 16Z" fill="currentColor" />
  </svg>
</template>

<style scoped>
.brand-mark {
  display: block;
  flex: none;
}
</style>

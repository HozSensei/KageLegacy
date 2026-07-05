<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'success', 'warning', 'danger', 'info'].includes(v),
  },
})
</script>

<template>
  <div
    class="rounded-md p-4"
    :class="{
      'bg-gray-800/80 ring-1 ring-white/10': variant === 'default',
      'bg-green-500/10 ring-1 ring-green-500/20': variant === 'success',
      'bg-yellow-500/10 ring-1 ring-yellow-500/20': variant === 'warning',
      'bg-red-500/10 ring-1 ring-red-500/20': variant === 'danger',
      'bg-orange-500/10 ring-1 ring-orange-500/20': variant === 'info',
    }"
  >
    <slot />
  </div>
</template>

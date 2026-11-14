<script setup>
defineOptions({ name: 'BaseAlert' })

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
    class="alert"
    :class="{
      'alert--success': variant === 'success',
      'alert--warning': variant === 'warning',
      'alert--error': variant === 'danger',
      'alert--info': variant === 'info',
    }"
    :role="variant === 'danger' ? 'alert' : 'status'"
  >
    <slot />
  </div>
</template>

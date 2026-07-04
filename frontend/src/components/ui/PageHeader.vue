<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="md:flex md:items-center md:justify-between">
    <div class="min-w-0 flex-1">
      <h2 class="text-2xl/7 font-bold text-white sm:truncate sm:text-3xl sm:tracking-tight">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm text-gray-400">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="mt-4 flex shrink-0 md:ml-4 md:mt-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  accent: { type: String, default: 'text-white' },
})
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-gray-800/50 px-4 py-5 shadow-sm ring-1 ring-white/10 sm:p-6">
    <dt class="truncate text-sm font-medium text-gray-400">{{ label }}</dt>
    <dd class="mt-1 text-3xl font-semibold tracking-tight" :class="accent">{{ value }}</dd>
    <p v-if="hint" class="mt-1 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

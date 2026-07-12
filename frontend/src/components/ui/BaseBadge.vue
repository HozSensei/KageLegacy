<script setup>
import { computed } from 'vue'

defineOptions({ name: 'BaseBadge' })

const props = defineProps({
  label: { type: String, default: '' },
  color: {
    type: String,
    default: 'gray',
    validator: (v) => ['gray', 'green', 'blue', 'purple', 'red', 'yellow', 'orange', 'cyan'].includes(v),
  },
})

const classes = computed(() => ({
  gray: 'bg-gray-400/10 text-gray-300 ring-gray-400/20',
  green: 'bg-green-400/10 text-green-400 ring-green-500/20',
  blue: 'bg-blue-400/10 text-blue-400 ring-blue-400/30',
  purple: 'bg-purple-400/10 text-purple-400 ring-purple-400/30',
  red: 'bg-red-400/10 text-red-400 ring-red-400/20',
  yellow: 'bg-yellow-400/10 text-yellow-300 ring-yellow-400/20',
  orange: 'bg-orange-400/10 text-orange-300 ring-orange-400/20',
  cyan: 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/20',
}[props.color]))
</script>

<template>
  <span
    class="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ring-1 ring-inset"
    :class="classes"
  >
    <slot>{{ label }}</slot>
  </span>
</template>

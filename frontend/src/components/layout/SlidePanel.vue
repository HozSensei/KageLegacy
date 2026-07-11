<script setup>
import { onMounted, onUnmounted } from 'vue'

defineOptions({ name: 'SlidePanel' })

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  side: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right'].includes(value),
  },
  ariaLabel: { type: String, required: true },
  panelTestId: { type: String, default: null },
  wide: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <template v-if="modelValue">
      <div
        class="slide-panel-backdrop"
        data-testid="slide-panel-backdrop"
        @click="close"
      />
      <aside
        class="slide-panel"
        :class="[
          side === 'left' ? 'slide-panel--left' : 'slide-panel--right',
          wide ? 'slide-panel--wide' : '',
          'slide-panel--open',
        ]"
        role="dialog"
        :aria-label="ariaLabel"
        :aria-modal="true"
        :data-testid="panelTestId"
      >
        <div class="slide-panel__inner">
          <slot />
        </div>
      </aside>
    </template>
  </Teleport>
</template>

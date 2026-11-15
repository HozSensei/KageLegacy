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
  /** `paper` : panneau clair ; `ink` : aplat indigo (navigation). */
  tone: {
    type: String,
    default: 'paper',
    validator: (value) => ['paper', 'ink'].includes(value),
  },
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
    <Transition name="slide-backdrop">
      <div
        v-if="modelValue"
        class="slide-panel-backdrop"
        data-testid="slide-panel-backdrop"
        @click="close"
      />
    </Transition>
    <Transition :name="side === 'left' ? 'slide-from-left' : 'slide-from-right'">
      <aside
        v-if="modelValue"
        class="slide-panel"
        :class="[
          side === 'left' ? 'slide-panel--left' : 'slide-panel--right',
          wide ? 'slide-panel--wide' : '',
          `slide-panel--${tone}`,
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
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: var(--color-scrim);
}

.slide-panel {
  position: fixed;
  inset-block: 0;
  z-index: 50;
  width: 20rem;
  max-width: calc(100vw - 2.5rem);
  background: var(--color-bg-card);
  color: var(--color-ink);
}

.slide-panel--wide {
  width: 22rem;
}

.slide-panel--left {
  left: 0;
}

.slide-panel--right {
  right: 0;
}

.slide-panel--ink {
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
}

.slide-panel__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Le voile disparaît avant le panneau : jamais d'état « voile seul ». */
.slide-backdrop-enter-active {
  transition: opacity 220ms ease;
}

.slide-backdrop-leave-active {
  transition: opacity 110ms ease;
}

.slide-backdrop-enter-from,
.slide-backdrop-leave-to {
  opacity: 0;
}

.slide-from-left-enter-active,
.slide-from-right-enter-active {
  transition: transform 280ms var(--ease-out-quint);
}

.slide-from-left-leave-active,
.slide-from-right-leave-active {
  transition: transform 170ms ease-in;
}

.slide-from-left-enter-from,
.slide-from-left-leave-to {
  transform: translateX(-100%);
}

.slide-from-right-enter-from,
.slide-from-right-leave-to {
  transform: translateX(100%);
}
</style>

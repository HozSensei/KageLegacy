<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'TalentTreeCanvas' })

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  unlockedSet: { type: Object, default: () => new Set() },
  selectedNodeId: { type: String, default: null },
  isUnlockable: { type: Function, default: () => false },
  locale: { type: String, default: 'fr' },
})

const emit = defineEmits(['select', 'unlock'])

const { t } = useI18n()

const viewport = ref(null)
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const lastPointer = ref({ x: 0, y: 0 })
const didDrag = ref(false)

const bounds = computed(() => {
  if (!props.nodes.length) return { minX: -200, maxX: 200, minY: -200, maxY: 200 }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const n of props.nodes) {
    minX = Math.min(minX, n.positionX)
    maxX = Math.max(maxX, n.positionX)
    minY = Math.min(minY, n.positionY)
    maxY = Math.max(maxY, n.positionY)
  }
  const pad = 80
  return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad }
})

const worldW = computed(() => bounds.value.maxX - bounds.value.minX)
const worldH = computed(() => bounds.value.maxY - bounds.value.minY)

const transformStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  width: `${worldW.value}px`,
  height: `${worldH.value}px`,
}))

function toLocal(n) {
  return {
    x: n.positionX - bounds.value.minX,
    y: n.positionY - bounds.value.minY,
  }
}

function nodeClass(node) {
  const unlocked = props.unlockedSet.has(node.nodeId)
  const unlockable = props.isUnlockable(node)
  const selected = props.selectedNodeId === node.nodeId
  return [
    'talent-node',
    `talent-node--${node.type}`,
    `talent-node--${node.branch}`,
    unlocked && 'is-unlocked',
    unlockable && 'is-unlockable',
    selected && 'is-selected',
  ]
}

function nodeLabel(node) {
  return props.locale === 'en' ? node.nameEn : node.nameFr
}

function edgeClass(edge) {
  const fromOk = props.unlockedSet.has(edge.from.nodeId)
  const toOk = props.unlockedSet.has(edge.to.nodeId)
  return ['talent-edge', fromOk && toOk && 'is-active', fromOk && !toOk && 'is-partial']
}

function onWheel(e) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const next = Math.min(2.2, Math.max(0.45, scale.value * delta))
  scale.value = next
}

function onPointerDown(e) {
  if (e.button !== 0) return
  dragging.value = true
  didDrag.value = false
  lastPointer.value = { x: e.clientX, y: e.clientY }
  viewport.value?.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - lastPointer.value.x
  const dy = e.clientY - lastPointer.value.y
  if (Math.abs(dx) + Math.abs(dy) > 3) didDrag.value = true
  panX.value += dx
  panY.value += dy
  lastPointer.value = { x: e.clientX, y: e.clientY }
}

function onPointerUp(e) {
  dragging.value = false
  try {
    viewport.value?.releasePointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onNodeClick(node, e) {
  e.stopPropagation()
  if (didDrag.value) return
  emit('select', node.nodeId)
}

function onNodeDblClick(node, e) {
  e.stopPropagation()
  if (props.isUnlockable(node)) emit('unlock', node.nodeId)
}

function centerView() {
  const el = viewport.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  scale.value = 0.85
  panX.value = rect.width / 2 - (worldW.value * scale.value) / 2
  panY.value = rect.height / 2 - (worldH.value * scale.value) / 2
}

function zoomIn() {
  scale.value = Math.min(2.2, scale.value * 1.15)
}
function zoomOut() {
  scale.value = Math.max(0.45, scale.value / 1.15)
}

onMounted(() => {
  centerView()
  window.addEventListener('resize', centerView)
})

onUnmounted(() => {
  window.removeEventListener('resize', centerView)
})

defineExpose({ centerView, zoomIn, zoomOut })
</script>

<template>
  <div class="talent-canvas-wrap">
    <div class="talent-canvas-toolbar">
      <button type="button" class="btn-ghost text-[10px]" @click="zoomOut">−</button>
      <button type="button" class="btn-ghost text-[10px]" @click="centerView">
        {{ t('talents.resetView') }}
      </button>
      <button type="button" class="btn-ghost text-[10px]" @click="zoomIn">+</button>
    </div>

    <div
      ref="viewport"
      class="talent-canvas"
      data-testid="talent-canvas"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="talent-canvas__world" :style="transformStyle">
        <svg
          class="talent-canvas__edges"
          :width="worldW"
          :height="worldH"
          :viewBox="`0 0 ${worldW} ${worldH}`"
        >
          <line
            v-for="(edge, i) in edges"
            :key="i"
            :class="edgeClass(edge)"
            :x1="toLocal(edge.from).x"
            :y1="toLocal(edge.from).y"
            :x2="toLocal(edge.to).x"
            :y2="toLocal(edge.to).y"
          />
        </svg>

        <button
          v-for="node in nodes"
          :key="node.nodeId"
          type="button"
          :class="nodeClass(node)"
          :style="{
            left: `${toLocal(node).x}px`,
            top: `${toLocal(node).y}px`,
          }"
          :title="nodeLabel(node)"
          :data-testid="`talent-node-${node.nodeId}`"
          :data-node-id="node.nodeId"
          @click="onNodeClick(node, $event)"
          @dblclick="onNodeDblClick(node, $event)"
        >
          <span class="talent-node__icon">{{ node.icon || '·' }}</span>
          <span class="talent-node__label">{{ nodeLabel(node) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.talent-canvas-wrap {
  position: relative;
  min-height: 28rem;
  height: min(70vh, 40rem);
  border: 1px solid color-mix(in srgb, var(--color-line, #3a4a40) 70%, transparent);
  background:
    radial-gradient(
      ellipse at 50% 40%,
      color-mix(in srgb, var(--color-accent, #c9a66b) 8%, transparent),
      transparent 55%
    ),
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--color-void, #0a0e0c) 90%, #1a221c),
      color-mix(in srgb, var(--color-panel, #151a17) 95%, #0d1210)
    );
  overflow: hidden;
}

.talent-canvas-toolbar {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 5;
  display: flex;
  gap: 0.35rem;
}

.talent-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
  overflow: hidden;
}

.talent-canvas:active {
  cursor: grabbing;
}

.talent-canvas__world {
  position: relative;
  transform-origin: 0 0;
  will-change: transform;
}

.talent-canvas__edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.talent-edge {
  stroke: color-mix(in srgb, var(--color-line, #3a4a40) 55%, transparent);
  stroke-width: 2;
}

.talent-edge.is-partial {
  stroke: color-mix(in srgb, var(--color-accent, #c9a66b) 45%, transparent);
  stroke-dasharray: 4 4;
}

.talent-edge.is-active {
  stroke: color-mix(in srgb, var(--color-accent, #c9a66b) 85%, #fff);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-accent, #c9a66b) 40%, transparent));
}

.talent-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 2.2rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-ink-muted, #8a9a8e);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    color 0.18s ease;
}

.talent-node__icon {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  border: 1px solid color-mix(in srgb, var(--color-line, #3a4a40) 80%, transparent);
  background: color-mix(in srgb, var(--color-panel, #151a17) 90%, transparent);
  font-size: 0.75rem;
  line-height: 1;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.talent-node--notable .talent-node__icon {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 2px;
}

.talent-node--keystone .talent-node__icon {
  width: 2.6rem;
  height: 2.6rem;
  border-width: 2px;
  border-color: color-mix(in srgb, var(--color-accent, #c9a66b) 70%, transparent);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}

.talent-node__label {
  max-width: 7rem;
  font-size: 0.58rem;
  line-height: 1.15;
  text-align: center;
  opacity: 0.75;
  pointer-events: none;
}

.talent-node.is-unlocked {
  color: var(--color-ink, #e8ece9);
}

.talent-node.is-unlocked .talent-node__icon {
  border-color: var(--color-accent, #c9a66b);
  background: color-mix(in srgb, var(--color-accent, #c9a66b) 22%, var(--color-panel, #151a17));
  color: var(--color-accent, #c9a66b);
}

.talent-node.is-unlockable .talent-node__icon {
  border-color: color-mix(in srgb, var(--color-moss, #8fad9a) 80%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-moss, #8fad9a) 35%, transparent);
  animation: unlockable-glow 1.8s ease-in-out infinite;
}

.talent-node.is-selected {
  z-index: 2;
  transform: translate(-50%, -50%) scale(1.08);
}

.talent-node.is-selected .talent-node__label {
  opacity: 1;
  color: var(--color-ink, #e8ece9);
}

.talent-node--taijutsu.is-unlocked .talent-node__icon {
  border-color: #c97d5d;
  color: #d49a5c;
}

.talent-node--ninjutsu.is-unlocked .talent-node__icon {
  border-color: #8eb4d4;
  color: #8eb4d4;
}

.talent-node--genjutsu.is-unlocked .talent-node__icon {
  border-color: #9eb0bc;
  color: #9eb0bc;
}

.talent-node--medicine.is-unlocked .talent-node__icon {
  border-color: #8fad9a;
  color: #8fad9a;
}

@keyframes unlockable-glow {
  0%,
  100% {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-moss, #8fad9a) 30%, transparent);
  }
  50% {
    box-shadow: 0 0 10px 2px color-mix(in srgb, var(--color-moss, #8fad9a) 40%, transparent);
  }
}

@media (max-width: 640px) {
  .talent-canvas-wrap {
    min-height: 22rem;
    height: 55vh;
  }

  .talent-node__label {
    display: none;
  }
}
</style>

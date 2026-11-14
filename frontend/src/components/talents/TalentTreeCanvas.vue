<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../ui/AppIcon.vue'
import { talentBranchTone, talentNodeShape } from '../../utils/talentVisuals'

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
  /* Les libellés restent lisibles quel que soit le zoom. */
  '--label-scale': Math.min(2, Math.max(1, 1 / scale.value)).toFixed(3),
}))

const zoomedOut = computed(() => scale.value < 0.7)

function toLocal(n) {
  return {
    x: n.positionX - bounds.value.minX,
    y: n.positionY - bounds.value.minY,
  }
}

/* Nœud tout juste débloqué : sert uniquement à jouer l'animation d'éclat. */
const burstId = ref(null)
let burstTimer = null

watch(
  () => props.unlockedSet,
  (next, prev) => {
    if (!prev || !next || next.size !== prev.size + 1) return
    for (const id of next) {
      if (!prev.has(id)) {
        burstId.value = id
        if (burstTimer) clearTimeout(burstTimer)
        burstTimer = setTimeout(() => {
          burstId.value = null
        }, 900)
        break
      }
    }
  }
)

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
    burstId.value === node.nodeId && 'is-burst',
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
}

function onPointerMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - lastPointer.value.x
  const dy = e.clientY - lastPointer.value.y
  if (!didDrag.value && Math.abs(dx) + Math.abs(dy) > 3) {
    didDrag.value = true
    /* Capture seulement une fois le glissement engagé : capturer dès l'appui
       redirige le clic vers le canevas et empêche de sélectionner un nœud. */
    viewport.value?.setPointerCapture?.(e.pointerId)
  }
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
  const fit = Math.min(rect.width / worldW.value, rect.height / worldH.value)
  scale.value = Math.min(0.85, Math.max(0.45, fit))
  panX.value = rect.width / 2 - (worldW.value * scale.value) / 2
  panY.value = rect.height / 2 - (worldH.value * scale.value) / 2
}

/* L'arbre arrive après le montage (ou change avec le filtre) : on recadre la vue. */
watch(
  () => props.nodes.length,
  () => nextTick(centerView)
)

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
  if (burstTimer) clearTimeout(burstTimer)
})

defineExpose({ centerView, zoomIn, zoomOut })
</script>

<template>
  <div class="talent-canvas-wrap" :class="{ 'talent-canvas-wrap--far': zoomedOut }">
    <div class="talent-canvas-toolbar">
      <button type="button" class="talent-tool" :aria-label="t('talents.zoomOut')" @click="zoomOut">
        <AppIcon name="minus" size="1rem" :stroke-width="2.25" />
      </button>
      <button type="button" class="talent-tool talent-tool--text" @click="centerView">
        {{ t('talents.resetView') }}
      </button>
      <button type="button" class="talent-tool" :aria-label="t('talents.zoomIn')" @click="zoomIn">
        <AppIcon name="plus" size="1rem" :stroke-width="2.25" />
      </button>
    </div>

    <ul class="talent-legend" aria-hidden="true">
      <li><span class="talent-legend__shape talent-legend__shape--stat" />{{ t('talents.types.stat') }}</li>
      <li><span class="talent-legend__shape talent-legend__shape--notable" />{{ t('talents.types.notable') }}</li>
      <li><span class="talent-legend__shape talent-legend__shape--keystone" />{{ t('talents.types.keystone') }}</li>
      <li class="talent-legend__sep" />
      <li><span class="talent-legend__state" />{{ t('talents.legendLocked') }}</li>
      <li><span class="talent-legend__state talent-legend__state--open" />{{ t('talents.legendUnlockable') }}</li>
      <li><span class="talent-legend__state talent-legend__state--on" />{{ t('talents.legendUnlocked') }}</li>
    </ul>

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
          :data-tone="talentBranchTone(node.branch)"
          :data-testid="`talent-node-${node.nodeId}`"
          :data-node-id="node.nodeId"
          @click="onNodeClick(node, $event)"
          @dblclick="onNodeDblClick(node, $event)"
        >
          <span class="talent-node__icon" :class="`talent-node__icon--${talentNodeShape(node.type)}`" />
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
  height: min(72vh, 44rem);
  overflow: hidden;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  background-image: radial-gradient(color-mix(in srgb, var(--color-ink) 14%, transparent) 1px, transparent 1.5px);
  background-size: 22px 22px;
}

.talent-canvas-toolbar {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 5;
  display: flex;
  gap: 2px;
}

.talent-tool {
  display: grid;
  place-items: center;
  min-width: 2.25rem;
  height: 2.25rem;
  background: var(--color-ink);
  font-size: 0.75rem;
  font-weight: 600;
  color: #fffdf8;
  transition: background-color var(--dur-fast) ease;
}

.talent-tool--text {
  padding: 0 0.85rem;
}

.talent-tool:hover {
  background: var(--color-vermilion);
}

.talent-legend {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.85rem;
  max-width: calc(100% - 1.5rem);
  margin: 0;
  padding: 0.45rem 0.7rem;
  list-style: none;
  background: var(--color-bg);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  pointer-events: none;
}

.talent-legend li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.talent-legend__sep {
  width: 1px;
  height: 0.9rem;
  background: var(--color-line-strong);
}

.talent-legend__shape,
.talent-legend__state {
  width: 0.7rem;
  height: 0.7rem;
  background: var(--color-ink);
}

.talent-legend__shape--stat {
  border-radius: 50%;
}

.talent-legend__shape--keystone {
  transform: rotate(45deg) scale(0.85);
}

.talent-legend__state {
  border-radius: 50%;
  background: var(--color-bg-card);
  box-shadow: inset 0 0 0 2px var(--color-line-strong);
}

.talent-legend__state--open {
  box-shadow: inset 0 0 0 2px var(--color-vermilion);
}

.talent-legend__state--on {
  background: var(--color-vermilion);
  box-shadow: none;
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
  stroke: color-mix(in srgb, var(--color-ink) 22%, transparent);
  stroke-width: 2;
  transition:
    stroke var(--dur-slow) ease,
    stroke-width var(--dur-slow) ease;
}

.talent-edge.is-partial {
  stroke: var(--color-ink-muted);
  stroke-dasharray: 5 5;
}

.talent-edge.is-active {
  stroke: var(--color-ink);
  stroke-width: 3.5;
}

/* ——— Nœuds : forme = type, couleur = branche, remplissage = état ——— */

.talent-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 2.2rem;
  padding: 0;
  color: var(--color-ink-muted);
  transform: translate(-50%, -50%);
}

.talent-node__icon {
  position: relative;
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  border: 2.5px solid color-mix(in srgb, var(--tone-fill) 55%, var(--color-bg-card));
  background: var(--color-bg-card);
  transition:
    background-color var(--dur-base) ease,
    border-color var(--dur-base) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.talent-node__icon--circle {
  border-radius: 50%;
}

.talent-node__icon--square {
  width: 2.1rem;
  height: 2.1rem;
}

.talent-node__icon--lozenge {
  width: 2.35rem;
  height: 2.35rem;
  margin: 0.45rem;
  border-width: 3px;
  transform: rotate(45deg);
}

.talent-node:hover .talent-node__icon {
  border-color: var(--tone-fill);
  transform: scale(1.14);
}

.talent-node:hover .talent-node__icon--lozenge {
  transform: rotate(45deg) scale(1.14);
}

.talent-node__label {
  max-width: 7.5rem;
  padding: 0.05rem 0.25rem;
  transform: scale(var(--label-scale, 1));
  transform-origin: top center;
  background: color-mix(in srgb, var(--color-bg-card) 88%, transparent);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  color: var(--color-ink-muted);
  pointer-events: none;
}

/* Les nœuds de stat n'affichent leur nom qu'au survol ou à la sélection */
.talent-node--stat .talent-node__label {
  position: absolute;
  top: 100%;
  width: max-content;
  opacity: 0;
  transition: opacity var(--dur-fast) ease;
}

.talent-node--stat:hover,
.talent-node--stat.is-selected {
  z-index: 3;
}

.talent-node--stat:hover .talent-node__label,
.talent-node--stat.is-selected .talent-node__label {
  opacity: 1;
}

.talent-node--keystone .talent-node__label {
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-ink);
}

.talent-node.is-unlockable .talent-node__icon {
  border-color: var(--tone-fill);
  background: var(--tone-tint);
  animation: pulse-ring 1.8s ease-out infinite;
}

.talent-node.is-unlockable .talent-node__label {
  color: var(--color-ink);
}

.talent-node.is-unlocked .talent-node__icon {
  border-color: var(--tone-fill);
  background: var(--tone-fill);
}

.talent-node.is-unlocked .talent-node__label {
  color: var(--color-ink);
}

.talent-node.is-selected {
  z-index: 4;
}

.talent-node.is-selected .talent-node__icon {
  outline: 3px solid var(--color-ink);
  outline-offset: 3px;
}

.talent-node.is-selected .talent-node__label {
  background: var(--color-ink);
  color: #fffdf8;
}

/* Vue d'ensemble : seuls les nœuds majeurs, accessibles ou sélectionnés gardent leur nom */
.talent-canvas-wrap--far .talent-node--notable:not(.is-selected, .is-unlockable, :hover) .talent-node__label {
  opacity: 0;
}

/* Éclat au déblocage */
.talent-node.is-burst .talent-node__icon::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 3px solid var(--tone-fill);
  border-radius: inherit;
  animation: talent-burst 800ms var(--ease-out-quint) both;
}

.talent-node.is-burst .talent-node__icon--circle,
.talent-node.is-burst .talent-node__icon--square {
  animation: pop-in 520ms var(--ease-out-quint) both;
}

@keyframes talent-burst {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(2.6);
  }
}

@media (max-width: 640px) {
  .talent-canvas-wrap {
    min-height: 22rem;
    height: 58vh;
  }

  .talent-node--notable .talent-node__label {
    display: none;
  }

  .talent-legend__sep,
  .talent-legend__sep ~ li {
    display: none;
  }
}
</style>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from '../cards/CardDisplay.vue';
import { useCardSizePreference } from '../../composables/useCardSizePreference.js';
import { activeComboLines } from '../../utils/cardEffectLine.js';

defineOptions({ name: 'CombatHand' });

const { cardSize } = useCardSizePreference();

const props = defineProps({
  cards: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  chakra: { type: Number, default: 0 },
  previousCardStatType: { type: String, default: null },
  costReduction: { type: Number, default: 0 },
  /** Snapshot stats combat — figures affichées en valeur effective. */
  stats: { type: Object, default: null },
});

const emit = defineEmits([
  'select',
  'play',
  'drop-intent',
  'drag-zone-change',
  'drag-state-change',
]);

const { t, te } = useI18n();
const comboPreviews = computed(() =>
  props.cards.map(card => {
    if (props.disabled || !canAfford(card)) return null;
    const lines = activeComboLines(card, props.previousCardStatType, { t, te });
    return lines.length ? lines.join(' · ') : null;
  })
);

// Within the nearest [data-combat-drop-root], zones declare data-combat-drop-zone
// and data-combat-drop-disabled="true" when unavailable.
// Hover changes emit drag-zone-change with an available action or null.
// A valid drop emits drop-intent({ card, action }); the consumer validates it.
const drag = ref(null);
let suppressClick = false;
let clickTimer;
let dragZone = null;
/** Double-tap / double-clic (mobile + desktop) — `dblclick` est peu fiable au tactile. */
const DOUBLE_TAP_MS = 350;
let lastTapId = null;
let lastTapAt = 0;

function setDragZone(zone) {
  if (zone === dragZone) return;
  dragZone = zone;
  emit('drag-zone-change', zone);
}

function dropZoneAt(current, x, y) {
  const target = document.elementFromPoint(x, y);
  const zone = target?.closest('[data-combat-drop-zone]');
  const root = current.element.closest('[data-combat-drop-root]');
  const action = zone?.dataset.combatDropZone;
  const card = props.cards.find(item => item.instanceId === current.card.instanceId);
  if (
    root &&
    zone &&
    root.contains(zone) &&
    zone.closest('[data-combat-drop-root]') === root &&
    !current.element.parentElement?.contains(zone) &&
    zone.dataset.combatDropDisabled !== 'true' &&
    ['play', 'play-ally', 'discard', 'discard-for-draw', 'reserve'].includes(action) &&
    !props.disabled &&
    card &&
    (!['play', 'play-ally'].includes(action) || canAfford(card))
  )
    return action;
  return null;
}

function startDrag(event, card) {
  if (drag.value || props.disabled || !event.isPrimary || event.button !== 0) return;
  suppressClick = false;
  clearTimeout(clickTimer);
  const rect = event.currentTarget.getBoundingClientRect();
  drag.value = {
    card,
    left: rect.left,
    top: rect.top,
    width: event.currentTarget.offsetWidth,
    height: event.currentTarget.offsetHeight,
    pointerId: event.pointerId,
    element: event.currentTarget,
    x: event.clientX,
    y: event.clientY,
    dx: 0,
    dy: 0,
    moved: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  const current = drag.value;
  if (!current || current.pointerId !== event.pointerId) return;
  const dx = event.clientX - current.x;
  const dy = event.clientY - current.y;
  if (!current.moved && Math.hypot(dx, dy) < 8) return;
  drag.value = { ...current, dx, dy, moved: true };
  if (!current.moved) emit('drag-state-change', true);
  setDragZone(dropZoneAt(current, event.clientX, event.clientY));
}

function endDrag(event, cancelled = false) {
  const current = drag.value;
  if (!current || current.pointerId !== event.pointerId) return;
  if (current.moved) {
    suppressClick = true;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      suppressClick = false;
    }, 500);
    const action = cancelled ? null : dropZoneAt(current, event.clientX, event.clientY);
    const card = props.cards.find(item => item.instanceId === current.card.instanceId);
    if (action && card) emit('drop-intent', { card, action });
  }
  drag.value = null;
  emit('drag-state-change', false);
  setDragZone(null);
  if (current.element.hasPointerCapture(event.pointerId))
    current.element.releasePointerCapture(event.pointerId);
}

function mountDragPreview(container) {
  if (!container || container.firstChild || !drag.value) return;
  const preview = drag.value.element.cloneNode(true);
  preview.classList.remove('hand-card--dragging');
  preview.removeAttribute('data-testid');
  preview.style.width = `${drag.value.width}px`;
  preview.style.height = `${drag.value.height}px`;
  container.appendChild(preview);
}

function selectCard(event, card) {
  if (props.disabled || (suppressClick && event.detail !== 0)) return;
  const now = Date.now();
  const sameCard = lastTapId === card.instanceId;
  const withinWindow = now - lastTapAt < DOUBLE_TAP_MS;
  lastTapId = card.instanceId;
  lastTapAt = now;
  if (sameCard && withinWindow && canAfford(card)) {
    emit('play', card);
    return;
  }
  emit('select', card);
}

watch(
  () => props.disabled,
  value => {
    if (value && drag.value) {
      const current = drag.value;
      drag.value = null;
      emit('drag-state-change', false);
      setDragZone(null);
      if (current.element.hasPointerCapture(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
    }
  }
);
onBeforeUnmount(() => {
  clearTimeout(clickTimer);
  emit('drag-state-change', false);
  setDragZone(null);
  if (drag.value?.element.hasPointerCapture(drag.value.pointerId)) {
    drag.value.element.releasePointerCapture(drag.value.pointerId);
  }
});

/** Fige la carte sortante à sa place pour que les autres glissent sans saut. */
function pinLeaving(el) {
  el.style.left = `${el.offsetLeft}px`;
  el.style.top = `${el.offsetTop}px`;
  el.style.width = `${el.offsetWidth}px`;
  el.style.height = `${el.offsetHeight}px`;
}

function canAfford(card) {
  const baseCost = Number(card.cost ?? card.baseCost) || 0;
  return Math.max(0, baseCost - (Number(props.costReduction) || 0)) <= props.chakra;
}

const fanStyle = computed(() => {
  const n = props.cards.length || 1;
  const gaps = Math.max(n - 1, 1);
  return { '--hand-step': 1 / gaps, '--hand-width-factor': n / gaps };
});

/* Les cartes d'un duel PvP n'ont pas de type : on le déduit de leur effet, pour l'affichage seulement. */
const displayCards = computed(() =>
  props.cards.map(card => {
    const type =
      card.type || (card.damage ? 'attack' : card.block ? 'defense' : card.heal ? 'skill' : null);
    const baseCost = Number(card.cost ?? card.baseCost) || 0;
    const displayCost = Math.max(0, baseCost - (Number(props.costReduction) || 0));
    return { ...card, type: type || card.type, cost: displayCost };
  })
);
</script>

<template>
  <TransitionGroup
    tag="div"
    name="hand"
    class="hand"
    :class="{ 'hand--large': cardSize === 'large' }"
    :style="fanStyle"
    :data-card-size="cardSize"
    data-testid="combat-hand"
    @before-leave="pinLeaving"
  >
    <div
      v-for="(card, index) in cards"
      :key="card.instanceId"
      class="hand-card"
      :class="{
        'hand-card--selected': selectedId === card.instanceId,
        'hand-card--dragging': drag?.card.instanceId === card.instanceId && drag.moved,
        'hand-card--unaffordable': !canAfford(card),
      }"
      :style="{
        '--i': index,
        '--angle': `${(index - (cards.length - 1) / 2) * Math.min(4, 24 / Math.max(cards.length - 1, 1))}deg`,
        '--lift': `${Math.abs(index - (cards.length - 1) / 2) * Math.min(3, 18 / Math.max(cards.length - 1, 1))}px`,
      }"
      draggable="false"
      :data-testid="`hand-card-${card.slug}`"
      @pointerdown="startDrag($event, card)"
      @pointermove="moveDrag"
      @pointerup="endDrag($event)"
      @pointercancel="endDrag($event, true)"
      @lostpointercapture="endDrag($event, true)"
      @click="selectCard($event, card)"
      @keydown.enter.shift.prevent="!disabled && canAfford(card) && emit('play', card)"
    >
      <CardDisplay
        :card="displayCards[index]"
        :selected="selectedId === card.instanceId"
        :size="cardSize"
        compact
        :stats="stats"
        :previous-card-stat-type="previousCardStatType"
        :upgrade-level="card.upgradeLevel || 0"
        :disabled="disabled"
        :pressed="selectedId === card.instanceId"
        :description="
          comboPreviews[index]
            ? `${t('combat.comboReady')} — ${comboPreviews[index]}`
            : !canAfford(card)
              ? t('combat.insufficientChakra')
              : null
        "
        keyshortcuts="Shift+Enter"
      />
    </div>
  </TransitionGroup>
  <Teleport to="body">
    <div
      v-if="drag?.moved"
      :ref="mountDragPreview"
      class="hand-drag-preview"
      :style="{ left: `${drag.left + drag.dx}px`, top: `${drag.top + drag.dy}px` }"
      aria-hidden="true"
      inert
    />
  </Teleport>
</template>

<style scoped>
.hand {
  --card-width: clamp(11rem, 20vw, 15rem);
  --hand-card-width: min(var(--card-width), 100cqi);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0;
  container-type: inline-size;
  min-height: calc(clamp(16.5rem, 30vw, 22.5rem) + 4rem);
  margin-inline: calc(var(--space-gutter) * -1);
  padding: 2rem var(--space-gutter);
  isolation: isolate;
}

@media (min-width: 640px) {
  .hand--large {
    --card-width: clamp(13.5rem, 24vw, 18rem);
    min-height: calc(clamp(20rem, 36vw, 27rem) + 4rem);
  }
}

.hand-card {
  --card-rarity: var(--color-neutral-fill);
  --card-rarity-glow: transparent;
  --card-body-bg: color-mix(in srgb, var(--color-ink) 94%, var(--color-bg));
  --card-body-fg: var(--color-on-ink);
  --card-body-muted: color-mix(in srgb, var(--color-on-ink) 55%, transparent);

  position: relative;
  display: block;
  flex: 0 0 auto;
  width: var(--hand-card-width);
  aspect-ratio: 296 / 444;
  padding: 0;
  border: 0;
  border-radius: 0.55rem;
  background: transparent;
  color: var(--card-body-fg);
  text-align: left;
  outline: 0 solid var(--color-ink);
  overflow: visible;

  transform: translateY(var(--lift)) rotate(var(--angle));
  transform-origin: center bottom;
  touch-action: none;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-rarity) 35%, transparent),
    0 8px 16px color-mix(in srgb, var(--color-ink) 16%, transparent);
  transition:
    transform var(--dur-base) var(--ease-out-quint),
    opacity var(--dur-base) ease,
    box-shadow var(--dur-base) ease,
    outline-width var(--dur-fast) ease;
}

.hand-card + .hand-card {
  margin-left: clamp(
    calc(-1 * var(--hand-card-width)),
    calc((100cqi - 4rem) * var(--hand-step) - var(--hand-card-width) * var(--hand-width-factor)),
    -2.5rem
  );
}

.hand-card--dragging {
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: none;
}

.hand-drag-preview {
  position: fixed;
  z-index: 100;
  pointer-events: none;
}

.hand-drag-preview > .hand-card {
  margin: 0;
  transform: none;
  transition: none;
}

.hand-card:focus-within {
  z-index: 5;
  outline: 3px solid var(--color-on-ink);
  outline-offset: 2px;
}

.hand-card:hover:not(:has(button:disabled)),
.hand-card:focus-within,
.hand-card--selected {
  z-index: 5;
  transform: translateY(-1.2rem) rotate(0deg);
}
.hand-card--unaffordable :deep(.card-display__chakra-gem) {
  border-color: #ffb7aa;
  background: linear-gradient(135deg, #ffb7aa 0%, #e44336 40%, #7b1212 70%, #f07868 100%);
  box-shadow:
    inset 0 0 0 3px #6b1010,
    inset 0 0 12px #ffd1c8,
    0 0 12px #e4433688;
}

.hand-card--unaffordable :deep(.card-display__chakra-number) {
  color: #fff;
  text-shadow: 0 2px 4px #4d0606;
}

.hand-enter-active {
  transition:
    opacity 320ms ease,
    transform 380ms var(--ease-out-quint);
  transition-delay: calc(var(--i) * 45ms);
}

.hand-enter-from {
  opacity: 0;
  transform: translateY(1.75rem) rotate(2deg);
}

.hand-leave-active {
  position: absolute;
  z-index: 3;
  transition:
    opacity 240ms ease-in,
    transform 280ms ease-in;
}

.hand-leave-to {
  opacity: 0;
  transform: translateY(-3.5rem) scale(0.92);
}

.hand-move {
  transition: transform 320ms var(--ease-out-quint);
}

@keyframes hand-foil-sweep {
  from {
    background-position: 120% 40%;
  }
  to {
    background-position: -20% 60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hand-card,
  .hand-enter-active,
  .hand-leave-active,
  .hand-move {
    transition: none;
  }

  .hand-card--foil:hover .hand-card__foil,
  .hand-card--selected .hand-card__foil {
    animation: none;
  }
}

@media (max-width: 640px) {
  .hand {
    --card-width: 10.75rem;
    min-height: 20.5rem;
  }
}
</style>

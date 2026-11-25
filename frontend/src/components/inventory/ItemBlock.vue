<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { itemVisual } from '../../utils/itemVisuals.js';

defineOptions({ name: 'ItemBlock' });

const props = defineProps({
  /** Entrée catalogue / slot inventaire (itemKey, itemId, id, kind, effect…). */
  item: { type: [Object, String], default: null },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  /** Quantité affichée en haut à gauche (null = masquée). */
  quantity: { type: [Number, String], default: null },
  /** Slot vide (mission / coffre / poche). */
  empty: { type: Boolean, default: false },
  /** Variante plus compacte (grilles mission / shop). */
  compact: { type: Boolean, default: false },
  /**
   * Affiche la description dans un filactaire (popover) via une icône info,
   * au lieu du corps de la carte. Inventaire coffre/poche.
   */
  effectPopover: { type: Boolean, default: false },
  /** Hauteur fixe pour grilles uniformes (coffre / poche). */
  uniform: { type: Boolean, default: false },
  /** Métadonnée secondaire (prix, stock…). */
  meta: { type: String, default: '' },
});

const { t } = useI18n();

const visual = computed(() =>
  props.empty ? itemVisual(null) : itemVisual(props.item)
);

const showQty = computed(() => {
  if (props.empty) return false;
  if (props.quantity == null || props.quantity === '') return false;
  return true;
});

const qtyLabel = computed(() => {
  const n = Number(props.quantity);
  if (Number.isFinite(n)) return String(Math.max(0, Math.floor(n)));
  return String(props.quantity);
});

const showInlineDesc = computed(
  () => Boolean(props.description) && !props.effectPopover && !props.empty
);

const showInfoTrigger = computed(
  () => props.effectPopover && Boolean(props.description) && !props.empty
);

const infoOpen = ref(false);
const infoBtn = ref(null);
const infoPanel = ref(null);
const panelStyle = ref({});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function positionPanel() {
  const btn = infoBtn.value;
  const panel = infoPanel.value;
  if (!btn || !panel) return;

  const margin = 8;
  const width = Math.min(16.5 * 16, window.innerWidth - margin * 2);
  const panelHeight = panel.offsetHeight || 96;
  const rect = btn.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - width / 2;
  const above = rect.top - panelHeight - margin;
  let top = above >= margin ? above : rect.bottom + margin;

  left = clamp(left, margin, window.innerWidth - width - margin);
  top = clamp(top, margin, Math.max(margin, window.innerHeight - panelHeight - margin));

  panelStyle.value = {
    width: `${width}px`,
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
  };
}

function toggleInfo(event) {
  event?.stopPropagation?.();
  infoOpen.value = !infoOpen.value;
}

function closeInfo() {
  infoOpen.value = false;
}

function onDocumentPointer(event) {
  if (!infoOpen.value) return;
  const target = event.target;
  if (infoPanel.value?.contains(target)) return;
  if (infoBtn.value?.contains?.(target)) return;
  closeInfo();
}

function onKeydown(event) {
  if (event.key === 'Escape' && infoOpen.value) closeInfo();
}

function onResize() {
  if (infoOpen.value) positionPanel();
}

watch(infoOpen, async (open) => {
  if (!open) return;
  await nextTick();
  positionPanel();
  await nextTick();
  positionPanel();
});

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer, true);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer, true);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
});
</script>

<template>
  <article
    class="item-block"
    :class="{
      'item-block--empty': empty,
      'item-block--compact': compact,
      'item-block--uniform': uniform,
      'item-block--has-actions': $slots.actions,
      'item-block--info-open': infoOpen,
    }"
    :data-tone="visual.tone"
    :data-category="visual.id"
  >
    <div class="item-block__top">
      <span v-if="showQty" class="item-block__qty">{{ qtyLabel }}</span>
      <span v-else class="item-block__qty item-block__qty--spacer" aria-hidden="true" />
      <div class="item-block__top-end">
        <button
          v-if="showInfoTrigger"
          ref="infoBtn"
          type="button"
          class="item-block__info"
          :aria-expanded="infoOpen ? 'true' : 'false'"
          :aria-controls="infoOpen ? `item-info-${visual.id}` : undefined"
          :aria-label="t('inventory.itemInfoAria', { name })"
          data-testid="item-block-info"
          @click="toggleInfo"
          @keydown.enter.prevent="toggleInfo"
          @keydown.space.prevent="toggleInfo"
        >
          <AppIcon name="info" size="1.05rem" />
        </button>
        <AppIcon :name="visual.icon" size="1.25rem" class="item-block__icon" />
      </div>
    </div>

    <div class="item-block__body">
      <h3 class="item-block__name">{{ name }}</h3>
      <p v-if="showInlineDesc" class="item-block__desc">{{ description }}</p>
      <p v-if="meta" class="item-block__meta">{{ meta }}</p>
    </div>

    <div v-if="$slots.actions" class="item-block__actions">
      <slot name="actions" />
    </div>

    <Teleport to="body">
      <div
        v-if="infoOpen && showInfoTrigger"
        :id="`item-info-${visual.id}`"
        ref="infoPanel"
        class="item-filactaire"
        role="dialog"
        :aria-label="name"
        data-testid="item-block-filactaire"
        :style="panelStyle"
        @click.stop
      >
        <p class="item-filactaire__title">{{ name }}</p>
        <p class="item-filactaire__body">{{ description }}</p>
      </div>
    </Teleport>
  </article>
</template>

<style scoped>
.item-block {
  display: flex;
  flex-direction: column;
  min-height: 8.25rem;
  padding: 0.85rem 0.95rem 0.95rem;
  border-radius: var(--radius-sm);
  background: var(--tone-tint);
  color: var(--color-ink);
  transition:
    background-color var(--dur-base) ease,
    color var(--dur-base) ease,
    transform var(--dur-base) var(--ease-out-quint);
  animation: rise-in var(--dur-base) var(--ease-out-quint) both;
}

.item-block--compact {
  min-height: 7.25rem;
  padding: 0.7rem 0.8rem 0.8rem;
}

/* Même hauteur pour piles remplies et slots vides (réserve l’espace actions). */
.item-block--uniform {
  height: 11.5rem;
  min-height: 11.5rem;
}

.item-block--empty {
  background: var(--color-bg-soft);
  outline: 1px dashed color-mix(in srgb, var(--color-ink) 18%, transparent);
  outline-offset: -1px;
  opacity: 0.72;
  pointer-events: none;
  user-select: none;
}

.item-block__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  color: var(--tone);
}

.item-block__top-end {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
}

.item-block--empty .item-block__top {
  color: var(--color-ink-faint);
}

.item-block__qty {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.item-block--compact .item-block__qty {
  font-size: 1rem;
}

.item-block__qty--spacer {
  visibility: hidden;
  min-width: 1ch;
}

.item-block__info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: color-mix(in srgb, var(--tone) 72%, var(--color-ink-muted));
  cursor: pointer;
  opacity: 0.78;
  transition:
    opacity var(--dur-fast, 120ms) ease,
    color var(--dur-fast, 120ms) ease,
    background-color var(--dur-fast, 120ms) ease;
}

.item-block__info:hover,
.item-block__info:focus-visible,
.item-block--info-open .item-block__info {
  opacity: 1;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone-fill) 16%, transparent);
  outline: none;
}

.item-block__body {
  display: flex;
  flex-direction: column;
  margin-top: auto;
  padding-top: 1rem;
  min-width: 0;
}

.item-block--compact .item-block__body {
  padding-top: 0.75rem;
}

.item-block__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.15;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.item-block--compact .item-block__name {
  font-size: 1rem;
}

.item-block__desc,
.item-block__meta {
  margin: 0.3rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.item-block__meta {
  font-weight: 700;
  color: var(--tone-fill);
}

.item-block__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid color-mix(in srgb, var(--tone-fill) 22%, transparent);
}

.item-block--empty .item-block__actions {
  border-top-color: color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.item-block:not(.item-block--empty):hover {
  transform: translateY(-2px);
}

.item-filactaire {
  position: fixed;
  z-index: 80;
  max-width: calc(100vw - 1rem);
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm, 0.4rem);
  background: var(--color-surface, #1a1d2e);
  border: 1px solid color-mix(in srgb, var(--color-line, #444) 85%, transparent);
  box-shadow: 0 0.55rem 1.35rem rgb(8 10 24 / 0.38);
  color: var(--color-ink);
}

.item-filactaire__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
}

.item-filactaire__body {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
}
</style>

<script setup>
import { computed } from 'vue';
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
  /** Slot vide (mission). */
  empty: { type: Boolean, default: false },
  /** Variante plus compacte (grilles mission / shop). */
  compact: { type: Boolean, default: false },
  /** Métadonnée secondaire (prix, stock…). */
  meta: { type: String, default: '' },
});

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
</script>

<template>
  <article
    class="item-block"
    :class="{
      'item-block--empty': empty,
      'item-block--compact': compact,
      'item-block--has-actions': $slots.actions,
    }"
    :data-tone="visual.tone"
    :data-category="visual.id"
  >
    <div class="item-block__top">
      <span v-if="showQty" class="item-block__qty">{{ qtyLabel }}</span>
      <span v-else class="item-block__qty item-block__qty--spacer" aria-hidden="true" />
      <AppIcon :name="visual.icon" size="1.25rem" class="item-block__icon" />
    </div>

    <div class="item-block__body">
      <h3 class="item-block__name">{{ name }}</h3>
      <p v-if="description" class="item-block__desc">{{ description }}</p>
      <p v-if="meta" class="item-block__meta">{{ meta }}</p>
    </div>

    <div v-if="$slots.actions" class="item-block__actions">
      <slot name="actions" />
    </div>
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

.item-block--empty {
  background: var(--color-bg-soft);
  outline: 1px dashed color-mix(in srgb, var(--color-ink) 18%, transparent);
  outline-offset: -1px;
  opacity: 0.72;
}

.item-block__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--tone);
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
</style>

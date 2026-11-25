<script setup>
import { computed } from 'vue';
import defaultHeroImage from '../../assets/illustrations/village-gate.webp';

defineOptions({ name: 'PageHeader' });

const props = defineProps({
  title: { type: String, required: true },
  kicker: { type: String, default: '' },
  lead: { type: String, default: '' },
  /** Conservé pour compat ; non affiché. */
  index: { type: String, default: '' },
  /**
   * Illustration de fond (plein cadre, style landing).
   * Si omise, utilise la porte du village par défaut.
   */
  image: { type: String, default: '' },
  imagePosition: { type: String, default: '38% 42%' },
  tone: { type: String, default: 'vermilion' },
  /** `display` pour les écrans d'accueil, `title` ailleurs. */
  size: {
    type: String,
    default: 'title',
    validator: (v) => ['title', 'display'].includes(v),
  },
  /**
   * Conservé pour compat API des vues.
   * Le rendu est toujours atmosphérique (plein cadre), sans slider.
   */
  layout: {
    type: String,
    default: 'atmosphere',
    validator: (v) => ['atmosphere', 'split', 'classic', 'overlay'].includes(v),
  },
  /** Désactive l'illustration de fond (header texte simple). */
  plain: { type: Boolean, default: false },
  /** Id optionnel du titre (focus programmatique / ancres). */
  titleId: { type: String, default: '' },
});

const backdropSrc = computed(() => {
  if (props.plain) return '';
  return props.image || defaultHeroImage;
});
</script>

<template>
  <header
    class="page-header"
    :class="{
      'page-header--atmosphere': Boolean(backdropSrc),
      'page-header--plain': !backdropSrc,
      'page-header--display': size === 'display',
    }"
    :data-tone="tone"
    data-testid="page-hero"
  >
    <div v-if="backdropSrc" class="page-header__backdrop" aria-hidden="true">
      <div class="page-header__media">
        <img
          class="page-header__image"
          :src="backdropSrc"
          alt=""
          decoding="async"
          :style="{ objectPosition: imagePosition }"
        />
      </div>
      <div class="page-header__veil" />
    </div>

    <div class="page-header__body">
      <div class="page-header__copy">
        <p v-if="kicker" class="page-header__kicker">{{ kicker }}</p>
        <h1
          :id="titleId || undefined"
          class="page-header__title"
          :class="size === 'display' ? 't-display' : 'page-title'"
          :tabindex="titleId ? -1 : undefined"
        >
          {{ title }}
        </h1>
        <p v-if="lead" class="page-header__lead">{{ lead }}</p>
        <div v-if="$slots.meta" class="page-header__meta">
          <slot name="meta" />
        </div>
        <div v-if="$slots.actions" class="page-header__actions">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.aside" class="page-header__aside">
        <slot name="aside" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  position: relative;
  color: var(--color-ink);
}

/* ——— Atmosphère plein cadre (même langage que la landing, sans slider) ——— */

.page-header--atmosphere {
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  /* Annule le padding haut du page-shell pour coller sous la top bar */
  margin-top: calc(clamp(1.25rem, 3.5vw, 2.75rem) * -1);
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
  min-height: clamp(14rem, 38vw, 22rem);
  overflow: hidden;
  color: var(--color-on-fill);
  background: var(--color-bg);
}

.page-header__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.page-header__media {
  position: absolute;
  inset: 0;
}

.page-header__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
  filter: var(--image-filter) saturate(0.92);
  transform: scale(1.03);
  animation: page-header-ken 18s var(--ease-out-quint) both;
  -webkit-mask-image: linear-gradient(
    180deg,
    #000 0%,
    #000 42%,
    rgba(0, 0, 0, 0.7) 68%,
    rgba(0, 0, 0, 0.25) 88%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    #000 0%,
    #000 42%,
    rgba(0, 0, 0, 0.7) 68%,
    rgba(0, 0, 0, 0.25) 88%,
    transparent 100%
  );
}

.page-header__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, transparent 0%, transparent 48%, var(--color-bg) 100%),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-indigo-deep) 78%, transparent) 0%,
      color-mix(in srgb, var(--color-indigo-deep) 28%, transparent) 48%,
      transparent 78%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-indigo-deep) 68%, transparent) 0%,
      color-mix(in srgb, var(--color-indigo-deep) 26%, transparent) 36%,
      color-mix(in srgb, var(--color-bg) 40%, transparent) 62%,
      var(--color-bg) 100%
    );
}

.page-header__body {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1.25rem;
  align-items: end;
  width: 100%;
  max-width: 72rem;
  min-height: inherit;
  margin-inline: auto;
  padding: clamp(1.75rem, 4vw, 2.75rem) var(--space-gutter) clamp(2rem, 5vw, 3.25rem);
}

.page-header__copy {
  align-self: center;
  width: min(38rem, 100%);
  min-width: 0;
}

.page-header__kicker {
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-on-fill) 72%, transparent);
  animation: slide-in-left 420ms var(--ease-out-quint) both;
}

.page-header--plain .page-header__kicker {
  color: var(--color-ink-faint);
}

.page-header__title {
  margin: 0.7rem 0 0;
  color: inherit;
  animation: rise-in 520ms var(--ease-out-quint) both;
}

.page-header--atmosphere .page-header__title {
  color: var(--color-on-fill);
  max-width: 16ch;
}

.page-header--display .page-header__title {
  font-size: clamp(2rem, 1.35rem + 2.2vw, 3rem);
}

.page-header__lead {
  max-width: 34rem;
  margin: 0.85rem 0 0;
  font-size: 1.0625rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-on-fill) 82%, transparent);
  animation: rise-in 520ms var(--ease-out-quint) 70ms both;
}

.page-header--plain .page-header__lead {
  color: var(--color-ink-muted);
}

.page-header__meta {
  margin-top: 1.1rem;
  animation: rise-in 520ms var(--ease-out-quint) 100ms both;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.35rem;
  animation: rise-in 520ms var(--ease-out-quint) 130ms both;
}

/* Ghost / texte sur fond illustration */
.page-header--atmosphere :deep(.btn-ghost) {
  color: var(--color-on-fill);
  border-color: color-mix(in srgb, var(--color-on-fill) 35%, transparent);
}

.page-header--atmosphere :deep(.btn-ghost:not(:disabled):hover) {
  background: color-mix(in srgb, var(--color-on-fill) 12%, transparent);
}

.page-header--atmosphere :deep(.collection-progress),
.page-header--atmosphere :deep(.text-ink-muted) {
  color: color-mix(in srgb, var(--color-on-fill) 82%, transparent);
}

.page-header--atmosphere :deep(.shop-balances__value) {
  color: var(--color-on-fill);
}

.page-header--atmosphere :deep(.shop-balances__label) {
  color: color-mix(in srgb, var(--color-on-fill) 68%, transparent);
}

.page-header__aside {
  min-width: 0;
}

/* ——— Variante plain (pas d'illustration) ——— */

.page-header--plain {
  padding-bottom: clamp(1.25rem, 2.5vw, 2rem);
  border-bottom: 1px solid var(--color-line);
}

.page-header--plain .page-header__body {
  min-height: 0;
  padding: 0;
}

.page-header--plain:has(.page-header__aside) .page-header__body {
  align-items: end;
}

@media (min-width: 768px) {
  .page-header--plain:has(.page-header__aside) .page-header__body {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
  }
}

@keyframes page-header-ken {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(1.03);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-header__image {
    animation: none !important;
    transform: none;
  }

  .page-header__kicker,
  .page-header__title,
  .page-header__lead,
  .page-header__meta,
  .page-header__actions {
    animation: none !important;
  }
}
</style>

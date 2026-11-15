<script setup>
defineOptions({ name: 'PageHeader' })

defineProps({
  title: { type: String, required: true },
  kicker: { type: String, default: '' },
  lead: { type: String, default: '' },
  /** Conservé pour compat ; non affiché dans le split sobre. */
  index: { type: String, default: '' },
  /** Illustration — moitié droite du split. */
  image: { type: String, default: '' },
  imagePosition: { type: String, default: 'center' },
  tone: { type: String, default: 'vermilion' },
  /** `display` pour les écrans d'accueil, `title` ailleurs. */
  size: {
    type: String,
    default: 'title',
    validator: (v) => ['title', 'display'].includes(v),
  },
  /**
   * Composition unifiée : split texte gauche / image droite.
   * `overlay` et `classic` sont acceptés pour compat et rendent le même split.
   */
  layout: {
    type: String,
    default: 'split',
    validator: (v) => ['split', 'classic', 'overlay'].includes(v),
  },
})
</script>

<template>
  <header
    class="page-header"
    :class="{
      'page-header--split': Boolean(image),
      'page-header--plain': !image,
    }"
    :data-tone="tone"
    data-testid="page-hero"
  >
    <div class="page-header__text">
      <p v-if="kicker" class="page-header__kicker">{{ kicker }}</p>
      <h1 class="page-header__title" :class="size === 'display' ? 't-display' : 'page-title'">
        {{ title }}
      </h1>
      <p v-if="lead" class="page-header__lead">{{ lead }}</p>
      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="image" class="page-header__visual" aria-hidden="true">
      <img
        class="page-header__image"
        :src="image"
        alt=""
        decoding="async"
        :style="{ objectPosition: imagePosition }"
      />
    </div>

    <div v-else-if="$slots.aside" class="page-header__aside">
      <slot name="aside" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: grid;
  gap: 0;
  align-items: stretch;
  border-bottom: 1px solid var(--color-line);
}

.page-header--plain {
  padding-bottom: clamp(1.25rem, 2.5vw, 2rem);
}

.page-header--split {
  margin-inline: calc(var(--space-gutter) * -1);
  min-height: clamp(13rem, 34vw, 19rem);
  overflow: hidden;
  background: var(--color-bg);
}

.page-header__text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  min-width: 0;
  padding: clamp(1.35rem, 3.5vw, 2.5rem) var(--space-gutter);
}

.page-header--split .page-header__text {
  background: var(--color-bg);
}

.page-header__kicker {
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
  animation: slide-in-left 420ms var(--ease-out-quint) both;
}

.page-header__title {
  margin: 0.7rem 0 0;
  animation: rise-in 520ms var(--ease-out-quint) both;
}

.page-header__lead {
  max-width: 34rem;
  margin: 0.85rem 0 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
  animation: rise-in 520ms var(--ease-out-quint) 70ms both;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.35rem;
  animation: rise-in 520ms var(--ease-out-quint) 130ms both;
}

.page-header__visual {
  position: relative;
  min-height: clamp(10rem, 42vw, 14rem);
  overflow: hidden;
  /* Decorative image must not cover page actions / Cypress targets */
  pointer-events: none;
}

.page-header__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter);
}

.page-header__aside {
  min-width: 0;
  padding: 0 var(--space-gutter) clamp(1.25rem, 2.5vw, 2rem);
}

@media (min-width: 768px) {
  .page-header--split {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .page-header__visual {
    min-height: 0;
    height: 100%;
  }

  .page-header--plain:has(.page-header__aside) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: end;
  }

  .page-header--plain .page-header__aside {
    padding: 0 0 clamp(1.25rem, 2.5vw, 2rem);
  }
}

@media (max-width: 767px) {
  .page-header--split {
    grid-template-columns: 1fr;
  }

  .page-header__visual {
    order: -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-header__kicker,
  .page-header__title,
  .page-header__lead,
  .page-header__actions {
    animation: none !important;
  }
}
</style>

<script setup>
defineOptions({ name: 'PageHeader' })

defineProps({
  title: { type: String, required: true },
  kicker: { type: String, default: '' },
  lead: { type: String, default: '' },
  /** Numéro de section affiché comme élément graphique (« 03 »). */
  index: { type: String, default: '' },
  /** Illustration optionnelle — réservée à quelques écrans clés. */
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
   * Composition :
   * - `classic` — grille texte + image / formes
   * - `overlay` — panneau sombre superposé à une image plein cadre
   */
  layout: {
    type: String,
    default: 'classic',
    validator: (v) => ['classic', 'overlay'].includes(v),
  },
})
</script>

<template>
  <header
    class="page-header"
    :class="{
      'page-header--visual': image && layout !== 'overlay',
      'page-header--aside': !image && $slots.aside && layout === 'classic',
      'page-header--overlay': layout === 'overlay' && image,
    }"
    :data-tone="tone"
    data-testid="page-hero"
  >
    <div v-if="layout === 'overlay' && image" class="page-header__bleed" aria-hidden="true">
      <img
        class="page-header__bleed-image"
        :src="image"
        alt=""
        decoding="async"
        :style="{ objectPosition: imagePosition }"
      />
      <span class="page-header__bleed-veil" />
      <span class="page-header__bleed-wash" />
    </div>

    <div class="page-header__text" :class="{ 'page-header__text--panel': layout === 'overlay' }">
      <p v-if="kicker || index" class="page-header__kicker">
        <span v-if="index" class="page-header__index">{{ index }}</span>
        <span class="lozenge page-header__mark" aria-hidden="true" />
        <span v-if="kicker">{{ kicker }}</span>
      </p>
      <h1 class="page-header__title" :class="size === 'display' ? 't-display' : 'page-title'">
        {{ title }}
      </h1>
      <p v-if="lead" class="page-header__lead">{{ lead }}</p>
      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <div
      v-if="image && layout === 'classic'"
      class="page-header__visual"
      aria-hidden="true"
    >
      <span class="page-header__orb page-header__orb--a" />
      <span class="page-header__orb page-header__orb--b" />
      <span class="page-header__block" />
      <span class="page-header__frame illustration">
        <img
          class="page-header__image"
          :src="image"
          alt=""
          decoding="async"
          :style="{ objectPosition: imagePosition }"
        />
      </span>
    </div>

    <div v-else-if="layout === 'classic' && $slots.aside" class="page-header__aside">
      <slot name="aside" />
    </div>

    <div v-else-if="layout === 'classic' && index" class="page-header__shapes" aria-hidden="true">
      <span class="page-header__disc" />
      <span class="page-header__numeral">{{ index }}</span>
      <span class="page-header__bar" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: grid;
  gap: 1.5rem;
  align-items: end;
  padding-bottom: clamp(1.5rem, 3vw, 2.25rem);
  border-bottom: 1px solid var(--color-line);
}

.page-header__kicker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
  animation: slide-in-left 420ms var(--ease-out-quint) both;
}

.page-header__index {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  color: var(--tone);
}

.page-header__mark {
  color: var(--tone-fill);
}

.page-header__title {
  margin-top: 0.85rem;
  animation: rise-in 520ms var(--ease-out-quint) both;
}

.page-header__lead {
  max-width: 36rem;
  margin-top: 1rem;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--color-ink-muted);
  animation: rise-in 520ms var(--ease-out-quint) 70ms both;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.5rem;
  animation: rise-in 520ms var(--ease-out-quint) 130ms both;
}

.page-header__visual {
  position: relative;
  order: -1;
  height: clamp(9rem, 36vw, 13rem);
  margin-inline: calc(var(--space-gutter) * -1);
}

.page-header__orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.page-header__orb--a {
  top: -12%;
  right: 8%;
  width: 42%;
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--tone-tint) 70%, transparent);
}

.page-header__orb--b {
  bottom: -18%;
  left: 4%;
  width: 28%;
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--tone-fill) 18%, transparent);
}

.page-header__block {
  display: none;
  background: var(--tone-fill);
}

.page-header__frame {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius-lg);
  animation: fade-in 600ms ease both;
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-ink) 14%, transparent);
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
}

.page-header__shapes {
  display: none;
}

.page-header--overlay {
  position: relative;
  isolation: isolate;
  align-items: stretch;
  min-height: clamp(16rem, 48vw, 22rem);
  padding: 0;
  margin-inline: calc(var(--space-gutter) * -1);
  border-bottom: 0;
  overflow: hidden;
}

.page-header__bleed {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.page-header__bleed-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter);
}

.page-header__bleed-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      100deg,
      color-mix(in srgb, var(--color-ink) 88%, transparent) 0%,
      color-mix(in srgb, var(--color-ink) 55%, transparent) 42%,
      color-mix(in srgb, var(--color-ink) 18%, transparent) 100%
    );
}

.page-header__bleed-wash {
  position: absolute;
  inset: auto -8% -30% auto;
  width: 48%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tone-fill) 28%, transparent);
  filter: blur(2px);
  pointer-events: none;
}

.page-header__text--panel {
  position: relative;
  z-index: 1;
  align-self: end;
  max-width: 28rem;
  margin: clamp(2rem, 6vw, 3.5rem) var(--space-gutter);
  padding: 1.35rem 1.35rem 1.5rem;
  background: color-mix(in srgb, var(--color-ink) 82%, transparent);
  color: var(--color-on-ink);
  animation: rise-in 560ms var(--ease-out-quint) both;
}

.page-header__text--panel .page-header__kicker {
  color: color-mix(in srgb, var(--color-on-ink) 72%, transparent);
}

.page-header__text--panel .page-header__index,
.page-header__text--panel .page-header__mark {
  color: var(--tone-fill);
}

.page-header__text--panel .page-header__title,
.page-header__text--panel .page-title,
.page-header__text--panel .t-display {
  color: var(--color-on-ink);
}

.page-header__text--panel .page-header__lead {
  color: color-mix(in srgb, var(--color-on-ink) 78%, transparent);
}

@media (min-width: 768px) {
  .page-header--visual {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.82fr);
    gap: 2.5rem;
    align-items: center;
  }

  .page-header--aside {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2.5rem;
  }

  .page-header:not(.page-header--visual, .page-header--aside, .page-header--overlay):has(
      .page-header__shapes
    ) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .page-header__visual {
    order: 0;
    height: auto;
    aspect-ratio: 16 / 10;
    margin: 0 0 0.75rem;
  }

  .page-header__block {
    position: absolute;
    display: block;
    inset: 0.75rem -0.75rem -0.75rem 2.25rem;
    border-radius: var(--radius-lg);
    animation: wipe-in 640ms var(--ease-out-quint) both;
  }

  .page-header__frame {
    border-radius: var(--radius-lg);
  }

  .page-header__shapes {
    position: relative;
    display: block;
    width: 11rem;
    height: 7.5rem;
  }

  .page-header__disc {
    position: absolute;
    top: 0;
    right: 0.5rem;
    width: 6.5rem;
    height: 6.5rem;
    border-radius: 50%;
    background: var(--tone-tint);
    animation: pop-in 520ms var(--ease-out-quint) both;
  }

  .page-header__numeral {
    position: absolute;
    right: 2.25rem;
    bottom: 0;
    font-family: var(--font-display);
    font-size: 6.5rem;
    font-weight: 800;
    font-stretch: 76%;
    font-variant-numeric: tabular-nums;
    line-height: 0.8;
    letter-spacing: -0.04em;
    color: var(--tone-fill);
    animation: rise-in 560ms var(--ease-out-quint) 80ms both;
  }

  .page-header__bar {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 0.75rem;
    height: 4.25rem;
    background: var(--color-ink);
    transform-origin: bottom;
    animation: rise-in 520ms var(--ease-out-quint) 160ms both;
  }

  .page-header--overlay {
    margin-inline: calc(var(--space-gutter) * -1);
  }

  .page-header__text--panel {
    max-width: 26rem;
    margin: clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem);
    padding: 1.75rem 1.75rem 1.9rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-header__kicker,
  .page-header__title,
  .page-header__lead,
  .page-header__actions,
  .page-header__frame,
  .page-header__block,
  .page-header__disc,
  .page-header__numeral,
  .page-header__bar,
  .page-header__text--panel {
    animation: none !important;
  }
}
</style>

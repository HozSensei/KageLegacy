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
})
</script>

<template>
  <header
    class="page-header"
    :class="{ 'page-header--visual': image, 'page-header--aside': !image && $slots.aside }"
    :data-tone="tone"
    data-testid="page-hero"
  >
    <div class="page-header__text">
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

    <div v-if="image" class="page-header__visual" aria-hidden="true">
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

    <div v-else-if="$slots.aside" class="page-header__aside">
      <slot name="aside" />
    </div>

    <div v-else-if="index" class="page-header__shapes" aria-hidden="true">
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

/* Illustration : image nette, bord gauche biseauté, aplat décalé derrière */
.page-header__visual {
  position: relative;
  order: -1;
  height: clamp(8.5rem, 34vw, 12rem);
  margin-inline: calc(var(--space-gutter) * -1);
}

.page-header__block {
  display: none;
  background: var(--tone-fill);
}

.page-header__frame {
  width: 100%;
  height: 100%;
  animation: fade-in 600ms ease both;
}

.page-header__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-header__aside {
  min-width: 0;
}

/* Sans illustration : composition de formes et grand numéro */
.page-header__shapes {
  display: none;
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

  .page-header:not(.page-header--visual, .page-header--aside):has(.page-header__shapes) {
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
    animation: wipe-in 640ms var(--ease-out-quint) both;
  }

  .page-header__frame {
    clip-path: polygon(9% 0, 100% 0, 100% 100%, 0 100%);
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
}
</style>

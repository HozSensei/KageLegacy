<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from '../cards/CardDisplay.vue';
import { pickLandingShowcaseCards } from '../../constants/landingShowcaseCards.js';

defineOptions({ name: 'LandingCardCarousel' });

const props = defineProps({
  /** Nombre de cartes visibles dans le rail. */
  visible: { type: Number, default: 3 },
  /** Taille du pool tiré au hasard. */
  poolSize: { type: Number, default: 9 },
  /** Défilement auto (ms) ; 0 = off. */
  autoplayMs: { type: Number, default: 5200 },
});

const { t } = useI18n();

const cards = ref(pickLandingShowcaseCards(props.poolSize));
const index = ref(0);
const faces = ref({});
let timer = null;

const pageCount = computed(() =>
  Math.max(1, cards.value.length - props.visible + 1)
);

const visibleCards = computed(() =>
  cards.value.slice(index.value, index.value + props.visible)
);

function faceFor(slug) {
  return faces.value[slug] || 'front';
}

function toggleFlip(card) {
  const slug = card.slug;
  faces.value = {
    ...faces.value,
    [slug]: faceFor(slug) === 'front' ? 'back' : 'front',
  };
}

function goTo(page) {
  index.value = Math.max(0, Math.min(page, pageCount.value - 1));
}

function next() {
  goTo((index.value + 1) % pageCount.value);
}

function prev() {
  goTo((index.value - 1 + pageCount.value) % pageCount.value);
}

function stopAutoplay() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startAutoplay() {
  stopAutoplay();
  if (!props.autoplayMs || props.autoplayMs < 1000) return;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  timer = setInterval(next, props.autoplayMs);
}

onMounted(startAutoplay);
onBeforeUnmount(stopAutoplay);

watch(index, () => {
  // Relance le timer après interaction manuelle.
  startAutoplay();
});
</script>

<template>
  <div
    class="landing-carousel"
    data-testid="landing-card-carousel"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
  >
    <div class="landing-carousel__rail" role="list">
      <button
        v-for="(card, i) in visibleCards"
        :key="card.slug"
        type="button"
        class="landing-carousel__item"
        role="listitem"
        :style="{ '--i': i }"
        :aria-label="t('landing.carousel.flipHint')"
        @click="toggleFlip(card)"
      >
        <CardDisplay
          :card="card"
          :face="faceFor(card.slug)"
          :tilt="true"
          :compact="true"
        />
      </button>
    </div>

    <div class="landing-carousel__chrome">
      <div class="landing-carousel__dots" role="tablist" :aria-label="t('landing.carousel.pages')">
        <button
          v-for="page in pageCount"
          :key="page"
          type="button"
          class="landing-carousel__dot"
          :class="{ 'is-active': index === page - 1 }"
          :aria-label="t('landing.carousel.page', { n: page })"
          :aria-selected="index === page - 1"
          @click="goTo(page - 1)"
        />
      </div>
      <div class="landing-carousel__nav">
        <button type="button" class="landing-carousel__arrow" :aria-label="t('landing.carousel.prev')" @click="prev">
          ‹
        </button>
        <button type="button" class="landing-carousel__arrow" :aria-label="t('landing.carousel.next')" @click="next">
          ›
        </button>
      </div>
      <p class="landing-carousel__hint">{{ t('landing.carousel.hint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.landing-carousel {
  display: grid;
  gap: 0.85rem;
  justify-items: end;
  width: min(100%, 34rem);
}

.landing-carousel__rail {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.65rem;
  width: 100%;
  min-height: 15.5rem;
  padding-inline-end: 0.25rem;
}

.landing-carousel__item {
  flex: 0 0 auto;
  width: min(9.6rem, 28vw);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  filter: drop-shadow(0 18px 28px color-mix(in srgb, #0b0d14 45%, transparent));
  transform: translateY(calc((2 - var(--i)) * 0.35rem)) rotate(calc((var(--i) - 1) * 2.5deg));
  transition: transform 280ms var(--ease-out-quint);
}

.landing-carousel__item:hover,
.landing-carousel__item:focus-visible {
  z-index: 2;
  transform: translateY(-0.35rem) rotate(0deg) scale(1.03);
  outline: none;
}

.landing-carousel__chrome {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem 1rem;
  align-items: center;
  width: 100%;
  padding-inline: 0.15rem;
}

.landing-carousel__dots {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.landing-carousel__dot {
  width: 0.45rem;
  height: 0.45rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-on-fill) 35%, transparent);
  cursor: pointer;
}

.landing-carousel__dot.is-active {
  width: 1.15rem;
  background: var(--color-gold-fill);
}

.landing-carousel__nav {
  display: flex;
  gap: 0.35rem;
}

.landing-carousel__arrow {
  width: 1.85rem;
  height: 1.85rem;
  border: 1px solid color-mix(in srgb, var(--color-on-fill) 35%, transparent);
  background: color-mix(in srgb, var(--color-indigo-deep) 55%, transparent);
  color: var(--color-on-fill);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

.landing-carousel__arrow:hover {
  background: color-mix(in srgb, var(--color-on-fill) 14%, transparent);
}

.landing-carousel__hint {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--color-on-fill) 65%, transparent);
}

@media (max-width: 639px) {
  .landing-carousel {
    width: 100%;
    justify-items: center;
  }

  .landing-carousel__rail {
    justify-content: center;
    min-height: 13.5rem;
  }

  .landing-carousel__item {
    width: min(7.8rem, 26vw);
  }

  .landing-carousel__item:nth-child(n + 3) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-carousel__item {
    transition: none;
    transform: none;
  }
}
</style>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from '../cards/CardDisplay.vue';
import { pickLandingShowcaseCards } from '../../constants/landingShowcaseCards.js';

defineOptions({ name: 'LandingCardCarousel' });

const props = defineProps({
  /** Taille du pool tiré. */
  poolSize: { type: Number, default: 9 },
  /** Défilement auto (ms) ; 0 = off. */
  autoplayMs: { type: Number, default: 0 },
});

const { t } = useI18n();

const cards = ref(pickLandingShowcaseCards(props.poolSize));
const index = ref(0);
const faces = ref({});
const viewportEl = ref(null);
const trackEl = ref(null);
/** Nombre de cartes entièrement visibles dans le viewport (mesure réelle). */
const fullVisible = ref(2);
let timer = null;
let resizeObserver = null;

const maxIndex = computed(() => Math.max(0, cards.value.length - fullVisible.value));

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

function measureVisible() {
  const viewport = viewportEl.value;
  const track = trackEl.value;
  const slide = track?.querySelector('.landing-slider__slide');
  if (!viewport || !slide) return;

  const gapRaw = getComputedStyle(track).gap || getComputedStyle(track).columnGap || '0';
  const gap = Number.parseFloat(gapRaw) || 0;
  const step = slide.getBoundingClientRect().width + gap;
  if (step <= 0) return;

  fullVisible.value = Math.max(1, Math.floor((viewport.clientWidth + gap) / step));
  if (index.value > maxIndex.value) {
    index.value = maxIndex.value;
  }
}

function goTo(page) {
  index.value = Math.max(0, Math.min(page, maxIndex.value));
}

function next() {
  goTo(index.value >= maxIndex.value ? 0 : index.value + 1);
}

function prev() {
  goTo(index.value <= 0 ? maxIndex.value : index.value - 1);
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

onMounted(async () => {
  await nextTick();
  measureVisible();
  if (typeof ResizeObserver !== 'undefined' && viewportEl.value) {
    resizeObserver = new ResizeObserver(() => measureVisible());
    resizeObserver.observe(viewportEl.value);
  }
  startAutoplay();
});

onBeforeUnmount(() => {
  stopAutoplay();
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watch(index, () => {
  startAutoplay();
});
</script>

<template>
  <div
    class="landing-slider"
    data-testid="landing-card-carousel"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
  >
    <div class="landing-slider__nav" role="group" :aria-label="t('landing.carousel.pages')">
      <button
        type="button"
        class="landing-slider__arrow"
        :aria-label="t('landing.carousel.prev')"
        @click="prev"
      >
        ‹
      </button>
      <button
        type="button"
        class="landing-slider__arrow"
        :aria-label="t('landing.carousel.next')"
        @click="next"
      >
        ›
      </button>
    </div>

    <div ref="viewportEl" class="landing-slider__viewport">
      <ul
        ref="trackEl"
        class="landing-slider__track"
        role="list"
        :style="{ transform: `translateX(calc(-1 * ${index} * (var(--card-w) + var(--gap))))` }"
      >
        <li v-for="card in cards" :key="card.slug" class="landing-slider__slide" role="listitem">
          <CardDisplay
            :card="card"
            :face="faceFor(card.slug)"
            :tilt="true"
            :description="t('landing.carousel.flipHint')"
            @select="toggleFlip(card)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.landing-slider {
  --nav-w: 2.15rem;
  --nav-gap: 0.65rem;
  --gap: 0.75rem;
  /* Même emprise que CollectionGrid (minmax 12.5rem) — pas d’étirement forcé */
  --card-w: 12.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nav-gap);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.landing-slider__nav {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 0 0 var(--nav-w);
  width: var(--nav-w);
  max-width: var(--nav-w);
}

.landing-slider__arrow {
  width: var(--nav-w);
  height: var(--nav-w);
  border: 1px solid color-mix(in srgb, var(--color-on-fill) 35%, transparent);
  background: color-mix(in srgb, var(--color-indigo-deep) 55%, transparent);
  color: var(--color-on-fill);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: background var(--dur-fast) ease;
}

.landing-slider__arrow:hover {
  background: color-mix(in srgb, var(--color-on-fill) 14%, transparent);
}

.landing-slider__viewport {
  /* Remplit le reste après les contrôles ; jamais plus large que le parent. */
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  max-width: calc(100% - var(--nav-w) - var(--nav-gap));
  overflow: hidden;
}

.landing-slider__track {
  display: flex;
  gap: var(--gap);
  margin: 0;
  padding: 0.35rem 0 0.5rem;
  list-style: none;
  transition: transform 420ms var(--ease-out-quint);
  will-change: transform;
}

.landing-slider__slide {
  flex: 0 0 var(--card-w);
  width: var(--card-w);
  filter: drop-shadow(0 18px 32px color-mix(in srgb, #0b0d14 48%, transparent));
}

@media (max-width: 767px) {
  .landing-slider {
    /* ~1,5 carte visible : une carte dominante + peek de la suivante. */
    --card-w: min(15rem, 66%);
    --gap: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-slider__track {
    transition: none;
  }
}
</style>

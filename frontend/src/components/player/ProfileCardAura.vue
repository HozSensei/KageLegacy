<script setup>
import { computed } from 'vue';
import { getProfileCardEffect } from '../../constants/profileCardEffects.js';

defineOptions({ name: 'ProfileCardAura' });

const props = defineProps({
  cardEffectId: { type: String, default: null },
});

const effect = computed(() => getProfileCardEffect(props.cardEffectId)?.effect || null);
const isSheen = computed(() => typeof effect.value === 'string' && effect.value.startsWith('sheen_'));

/** Densité lisible sur une fiche réelle (pas trop de DOM). */
const leafCount = 18;
const rainCount = 28;
const snowCount = 22;
</script>

<template>
  <span v-if="effect" class="card-aura" :class="`card-aura--${effect}`" aria-hidden="true">
    <!-- Reflet foil : bandeau lisse, sans blobs / formes parasites -->
    <template v-if="isSheen">
      <span class="card-aura__sheen-base" />
      <span class="card-aura__sheen-sweep" />
    </template>

    <template v-else-if="effect === 'leaves'">
      <span class="card-aura__weather card-aura__weather--autumn" />
      <span
        v-for="i in leafCount"
        :key="`leaf-${i}`"
        class="card-aura__leaf"
        :style="{ '--i': i }"
      />
    </template>

    <template v-else-if="effect === 'rain'">
      <span class="card-aura__weather card-aura__weather--rain" />
      <span
        v-for="i in rainCount"
        :key="`rain-${i}`"
        class="card-aura__drop"
        :style="{ '--i': i }"
      />
    </template>

    <template v-else-if="effect === 'snow'">
      <span class="card-aura__weather card-aura__weather--snow" />
      <span
        v-for="i in snowCount"
        :key="`snow-${i}`"
        class="card-aura__flake"
        :style="{ '--i': i }"
      />
    </template>

    <template v-else-if="effect === 'mist_fade'">
      <span class="card-aura__haze card-aura__haze--a" />
      <span class="card-aura__haze card-aura__haze--b" />
      <span class="card-aura__haze card-aura__haze--c" />
    </template>
  </span>
</template>

<style scoped>
.card-aura {
  /* Au-dessus du texte / portrait (z-index 5) pour que pluie / feuilles restent visibles */
  position: absolute;
  inset: 0;
  z-index: 8;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

/* —— Reflets —— */
.card-aura__sheen-base {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    118deg,
    transparent 18%,
    color-mix(in srgb, var(--aura-sheen-a) 22%, transparent) 38%,
    color-mix(in srgb, var(--aura-sheen-b) 38%, transparent) 48%,
    color-mix(in srgb, var(--aura-sheen-a) 18%, transparent) 58%,
    transparent 78%
  );
  opacity: 0.55;
  mix-blend-mode: soft-light;
}

.card-aura__sheen-sweep {
  position: absolute;
  top: -10%;
  bottom: -10%;
  left: -35%;
  width: 42%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    color-mix(in srgb, var(--aura-sheen-b) 70%, transparent) 45%,
    transparent 100%
  );
  opacity: 0.65;
  mix-blend-mode: screen;
  filter: blur(0.5px);
  animation: sheen-sweep 3.8s ease-in-out infinite;
}

.card-aura--sheen_gold {
  --aura-sheen-a: #d4a017;
  --aura-sheen-b: #fff1b8;
}

.card-aura--sheen_aurora {
  --aura-sheen-a: #4ec4ff;
  --aura-sheen-b: #d4b8ff;
}

.card-aura--sheen_ruby {
  --aura-sheen-a: #c41e3a;
  --aura-sheen-b: #ffb3c0;
}

/* Voile météo de fond (lisibilité) */
.card-aura__weather {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.card-aura__weather--autumn {
  background: linear-gradient(
    180deg,
    rgb(180 90 30 / 0.12) 0%,
    transparent 35%,
    rgb(120 50 20 / 0.1) 100%
  );
}

.card-aura__weather--rain {
  background: linear-gradient(180deg, rgb(40 70 100 / 0.22) 0%, rgb(20 40 70 / 0.12) 100%);
}

.card-aura__weather--snow {
  background: linear-gradient(180deg, rgb(200 220 255 / 0.18) 0%, rgb(255 255 255 / 0.08) 100%);
}

/* —— Feuilles —— */
.card-aura__leaf {
  position: absolute;
  top: -14%;
  left: calc(2% + (var(--i) - 1) * 5.4%);
  width: 0.85rem;
  height: 1.15rem;
  border-radius: 0.05rem 70% 0.05rem 70%;
  background: linear-gradient(145deg, #e07a2f 0%, #9a3b12 55%, #5c2208 100%);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.15);
  opacity: 0.92;
  animation: leaf-fall calc(4.2s + var(--i) * 0.18s) linear infinite;
  animation-delay: calc(var(--i) * -0.35s);
}

.card-aura__leaf:nth-child(3n) {
  width: 0.7rem;
  height: 0.95rem;
  background: linear-gradient(145deg, #f0b429 0%, #c46a18 60%, #7a3a0c 100%);
}

.card-aura__leaf:nth-child(4n) {
  width: 1rem;
  height: 0.75rem;
  background: linear-gradient(145deg, #c94f2a 0%, #7a2410 100%);
}

/* —— Pluie —— */
.card-aura__drop {
  position: absolute;
  top: -12%;
  left: calc(1% + (var(--i) - 1) * 3.5%);
  width: 2px;
  height: 1.65rem;
  border-radius: 1px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgb(210 230 255 / 0.95) 40%,
    rgb(160 190 220 / 0.55) 100%
  );
  box-shadow: 0 0 3px rgb(180 210 255 / 0.35);
  opacity: 0.9;
  animation: rain-fall calc(0.85s + var(--i) * 0.03s) linear infinite;
  animation-delay: calc(var(--i) * -0.08s);
}

.card-aura__drop:nth-child(3n) {
  height: 1.25rem;
  width: 1.5px;
  left: calc(2% + (var(--i) - 1) * 3.5% + 1%);
}

/* —— Neige —— */
.card-aura__flake {
  position: absolute;
  top: -10%;
  left: calc(3% + (var(--i) - 1) * 4.3%);
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.95);
  box-shadow:
    0 0 6px rgb(255 255 255 / 0.7),
    0 0 1px rgb(180 200 255 / 0.8);
  opacity: 0.95;
  animation: snow-fall calc(4.8s + var(--i) * 0.28s) linear infinite;
  animation-delay: calc(var(--i) * -0.4s);
}

.card-aura__flake:nth-child(3n) {
  width: 0.4rem;
  height: 0.4rem;
}

.card-aura__flake:nth-child(5n) {
  width: 0.7rem;
  height: 0.7rem;
}

/* —— Brume —— */
.card-aura__haze {
  position: absolute;
  width: 75%;
  height: 50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 0.42) 0%, transparent 72%);
  filter: blur(14px);
  animation: mist-fade 6.5s ease-in-out infinite;
}

.card-aura__haze--a {
  left: -14%;
  top: 10%;
}

.card-aura__haze--b {
  right: -16%;
  bottom: 4%;
  animation-delay: 2s;
}

.card-aura__haze--c {
  left: 18%;
  top: 38%;
  width: 60%;
  height: 40%;
  animation-delay: 3.5s;
}

@keyframes sheen-sweep {
  0% {
    transform: translateX(0);
    opacity: 0.12;
  }
  30% {
    opacity: 0.75;
  }
  100% {
    transform: translateX(280%);
    opacity: 0.08;
  }
}

@keyframes leaf-fall {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  100% {
    transform: translate3d(1.4rem, 125%, 0) rotate(260deg);
    opacity: 0.15;
  }
}

@keyframes rain-fall {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0;
  }
  8% {
    opacity: 0.95;
  }
  100% {
    transform: translate3d(0.45rem, 135%, 0);
    opacity: 0.15;
  }
}

@keyframes snow-fall {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: translate3d(-1rem, 130%, 0);
    opacity: 0.2;
  }
}

@keyframes mist-fade {
  0%,
  100% {
    transform: translateX(0) scale(1);
    opacity: 0.2;
  }
  40% {
    transform: translateX(10%) scale(1.1);
    opacity: 0.85;
  }
  70% {
    transform: translateX(16%) scale(1.04);
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-aura__sheen-sweep,
  .card-aura__leaf,
  .card-aura__drop,
  .card-aura__flake,
  .card-aura__haze {
    animation: none !important;
  }

  .card-aura__leaf,
  .card-aura__drop,
  .card-aura__flake {
    opacity: 0.55;
    top: 20%;
  }

  .card-aura__leaf:nth-child(n + 7),
  .card-aura__drop:nth-child(n + 10),
  .card-aura__flake:nth-child(n + 8) {
    display: none;
  }
}
</style>

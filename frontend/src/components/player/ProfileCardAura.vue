<script setup>
import { computed } from 'vue';
import { getProfileCardEffect } from '../../constants/profileCardEffects.js';

defineOptions({ name: 'ProfileCardAura' });

const props = defineProps({
  cardEffectId: { type: String, default: null },
});

const effect = computed(() => getProfileCardEffect(props.cardEffectId)?.effect || null);
const isSheen = computed(() => typeof effect.value === 'string' && effect.value.startsWith('sheen_'));
const isLeaves = computed(() => typeof effect.value === 'string' && effect.value.startsWith('leaves_'));

/**
 * Material Symbols fill (viewBox 0 -960 960 960) — Eco pour le vert, Cannabis sinon.
 * Pas de skew : uniquement taille + rotation à la chute.
 */
const ECO_FILL_PATH =
  'M450-80q-33 0-66.5-7.5T315-109q12-121 70-226t149-185q-110 56-190.5 148T231-162q-4-3-7.5-6.5L216-176q-47-47-71.5-105T120-402q0-68 27-130t75-110q81-81 210-105.5t362-4.5q18 239-6 364.5T684-182q-49 49-109.5 75.5T450-80Z';
const CANNABIS_FILL_PATH =
  'M440-80v-167q-42 27-86.5 47T260-180q-63 0-118.5-28.5T40-280q37-34 79.5-59.5T211-375q-68-55-100-136T79-680q72 1 139 23t122 65v-8q0-91 40.5-171T480-920q58 69 99 149t41 171q0 2-.5 4t-.5 4q56-43 123-64.5T881-680q0 88-32.5 169T748-375q49 10 91.5 35.5T919-280q-46 43-101 71.5T700-180q-50 0-94.5-20T520-247v167h-80Z';

const leafPath = computed(() =>
  effect.value === 'leaves_green' ? ECO_FILL_PATH : CANNABIS_FILL_PATH
);

const leafCount = 14;

/**
 * Pluie — même logique que https://codepen.io/arickle/pen/XKjMZY
 * (incrément + randoHundo / randoFiver), sans jQuery, déterministe.
 */
function buildRainRow(seedOffset = 0) {
  const drops = [];
  let increment = 0;
  let i = 0;
  while (increment < 100) {
    const randoHundo = 1 + ((i * 37 + seedOffset * 13) % 98);
    const randoFiver = 2 + ((i * 3 + seedOffset) % 4);
    increment += randoFiver;
    drops.push({
      id: `${seedOffset}-${i}`,
      left: increment,
      /* CodePen : bottom = randoFiver + randoFiver - 1 + 100 */
      bottom: randoFiver + randoFiver - 1 + 100,
      /* string concat CodePen → 0.5XX s */
      delay: randoHundo / 100,
      duration: Number(`0.5${String(randoHundo).padStart(2, '0')}`),
    });
    i += 1;
  }
  return drops;
}

const rainFront = computed(() => buildRainRow(0));
const rainBack = computed(() => buildRainRow(1));
</script>

<template>
  <span v-if="effect" class="card-aura" :class="`card-aura--${effect}`" aria-hidden="true">
    <template v-if="isSheen">
      <span class="card-aura__sheen-base" />
      <span class="card-aura__sheen-flash" />
    </template>

    <!-- Feuilles Google fill : Eco (vert) / Cannabis (orange, rose) -->
    <template v-else-if="isLeaves">
      <span class="card-aura__weather card-aura__weather--leaves" />
      <span class="card-aura__leaves">
        <svg
          v-for="n in leafCount"
          :key="`leaf-${n}`"
          class="card-aura__leaf"
          :class="`card-aura__leaf--${n}`"
          viewBox="0 -960 960 960"
          aria-hidden="true"
        >
          <path :d="leafPath" />
        </svg>
      </span>
    </template>

    <!-- Pluie — front + back row, stem + splat (arickle/XKjMZY) -->
    <template v-else-if="effect === 'rain'">
      <span class="card-aura__weather card-aura__weather--rain" />
      <span class="card-aura__rain card-aura__rain--back">
        <span
          v-for="drop in rainBack"
          :key="`rain-b-${drop.id}`"
          class="card-aura__drop"
          :style="{
            left: `${drop.left}%`,
            bottom: `${drop.bottom}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }"
        >
          <span
            class="card-aura__stem"
            :style="{
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
            }"
          />
          <span
            class="card-aura__splat"
            :style="{
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
            }"
          />
        </span>
      </span>
      <span class="card-aura__rain card-aura__rain--front">
        <span
          v-for="drop in rainFront"
          :key="`rain-f-${drop.id}`"
          class="card-aura__drop"
          :style="{
            left: `${drop.left}%`,
            bottom: `${drop.bottom}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }"
        >
          <span
            class="card-aura__stem"
            :style="{
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
            }"
          />
          <span
            class="card-aura__splat"
            :style="{
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
            }"
          />
        </span>
      </span>
    </template>

    <!-- Neige douce — tuiles SVG animées (mark_sottek) -->
    <template v-else-if="effect === 'snow'">
      <span class="card-aura__weather card-aura__weather--snow" />
      <span class="card-aura__snow card-aura__snow--far" />
      <span class="card-aura__snow card-aura__snow--near" />
    </template>

    <!-- Brume : deux bancs qui se rejoignent puis s’écartent (carte lisible) -->
    <template v-else-if="effect === 'mist_fade'">
      <span class="card-aura__haze card-aura__haze--left" />
      <span class="card-aura__haze card-aura__haze--right" />
      <span class="card-aura__haze card-aura__haze--low" />
    </template>
  </span>
</template>

<style scoped>
.card-aura {
  position: absolute;
  inset: 0;
  z-index: 8;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  /* Hauteur de référence pour la chute des gouttes (remplace vh du CodePen) */
  container-type: size;
}

/*
 * Reflets : le « gros rectangle » venait d’un color-mix(…, transparent)
 * qui interpolait vers du noir (srgb) — le fondu aux extrémités n’effaçait
 * pas la bande. On varie uniquement l’alpha via rgb(from … / a).
 */
.card-aura__sheen-base {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    118deg,
    rgb(from var(--aura-sheen-a) r g b / 0) 12%,
    rgb(from var(--aura-sheen-a) r g b / 0.2) 36%,
    rgb(from var(--aura-sheen-b) r g b / 0.32) 48%,
    rgb(from var(--aura-sheen-a) r g b / 0.16) 60%,
    rgb(from var(--aura-sheen-a) r g b / 0) 82%
  );
  mix-blend-mode: soft-light;
}

.card-aura__sheen-flash {
  position: absolute;
  top: -35%;
  left: -40%;
  width: 48%;
  height: 170%;
  background: linear-gradient(
    100deg,
    rgb(from var(--aura-sheen-b) r g b / 0) 0%,
    rgb(from var(--aura-sheen-b) r g b / 0) 18%,
    rgb(from var(--aura-sheen-b) r g b / 0.12) 34%,
    rgb(from var(--aura-sheen-b) r g b / 0.38) 44%,
    rgb(from #ffffff r g b / 0.55) 50%,
    rgb(from var(--aura-sheen-b) r g b / 0.38) 56%,
    rgb(from var(--aura-sheen-b) r g b / 0.12) 66%,
    rgb(from var(--aura-sheen-b) r g b / 0) 82%,
    rgb(from var(--aura-sheen-b) r g b / 0) 100%
  );
  transform: rotate(18deg);
  transform-origin: center;
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(0.6px);
  animation: sheen-flash 4.2s ease-in-out infinite;
  /* Double filet de sécurité : masque qui force l’effacement L/R */
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 22%,
    #000 78%,
    transparent 100%
  );
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

.card-aura__weather {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.card-aura__weather--leaves {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--leaf-tint, #6fbf73) 18%, transparent) 0%,
    transparent 45%,
    color-mix(in srgb, var(--leaf-tint, #6fbf73) 10%, transparent) 100%
  );
}

.card-aura--leaves_green {
  --leaf-fill: #5aaa5e;
  --leaf-fill-alt: #8fd68f;
  --leaf-tint: #6fbf73;
}

.card-aura--leaves_orange {
  --leaf-fill: #e07a2f;
  --leaf-fill-alt: #f0b429;
  --leaf-tint: #c45c26;
}

.card-aura--leaves_pink {
  --leaf-fill: #e85a8c;
  --leaf-fill-alt: #ff9cc0;
  --leaf-tint: #d9487a;
}

.card-aura__weather--rain {
  /* Fond sombre comme le CodePen : sans ça les gouttes blanches disparaissent sur paysage clair */
  background: linear-gradient(180deg, rgb(12 18 32 / 0.55) 0%, rgb(8 12 22 / 0.35) 100%);
}

.card-aura__weather--snow {
  background: linear-gradient(180deg, rgb(190 210 240 / 0.2) 0%, rgb(255 255 255 / 0.06) 100%);
}

/* =========================================================
   Feuilles — glyphe cannabis Google (taille + rotation seulement)
   ========================================================= */
.card-aura__leaves {
  position: absolute;
  inset: 0;
}

.card-aura__leaf {
  position: absolute;
  top: -10%;
  width: 1.55rem;
  height: 1.55rem;
  fill: var(--leaf-fill, #5aaa5e);
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.25));
  opacity: 0.92;
  animation: leaf-fall-a 5.4s ease-in-out infinite;
  transform-origin: 50% 50%;
}

.card-aura__leaf:nth-child(2n) {
  fill: var(--leaf-fill-alt, #8fd68f);
  animation-name: leaf-fall-b;
  width: 1.25rem;
  height: 1.25rem;
}

.card-aura__leaf:nth-child(3n) {
  animation-name: leaf-fall-c;
  width: 1.75rem;
  height: 1.75rem;
}

.card-aura__leaf--1 {
  left: 6%;
  animation-delay: 0.15s;
}
.card-aura__leaf--2 {
  left: 16%;
  animation-delay: 1.05s;
}
.card-aura__leaf--3 {
  left: 26%;
  animation-delay: 0.55s;
}
.card-aura__leaf--4 {
  left: 36%;
  animation-delay: 2.1s;
}
.card-aura__leaf--5 {
  left: 46%;
  animation-delay: 1.4s;
}
.card-aura__leaf--6 {
  left: 56%;
  animation-delay: 0.85s;
}
.card-aura__leaf--7 {
  left: 66%;
  animation-delay: 2.7s;
}
.card-aura__leaf--8 {
  left: 76%;
  animation-delay: 1.75s;
}
.card-aura__leaf--9 {
  left: 86%;
  animation-delay: 0.35s;
}
.card-aura__leaf--10 {
  left: 12%;
  animation-delay: 3s;
}
.card-aura__leaf--11 {
  left: 32%;
  animation-delay: 2.35s;
}
.card-aura__leaf--12 {
  left: 52%;
  animation-delay: 3.5s;
}
.card-aura__leaf--13 {
  left: 72%;
  animation-delay: 1.2s;
}
.card-aura__leaf--14 {
  left: 42%;
  animation-delay: 3.9s;
}

@keyframes leaf-fall-a {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
    opacity: 0;
  }
  8% {
    opacity: 0.95;
  }
  100% {
    transform: translate3d(-3.5rem, 28rem, 0) rotate(320deg);
    opacity: 0;
  }
}

@keyframes leaf-fall-b {
  0% {
    transform: translate3d(0, 0, 0) rotate(40deg);
    opacity: 0;
  }
  8% {
    opacity: 0.9;
  }
  100% {
    transform: translate3d(3rem, 27rem, 0) rotate(-280deg);
    opacity: 0;
  }
}

@keyframes leaf-fall-c {
  0% {
    transform: translate3d(0, 0, 0) rotate(-30deg);
    opacity: 0;
  }
  8% {
    opacity: 0.92;
  }
  100% {
    transform: translate3d(-2rem, 26rem, 0) rotate(200deg);
    opacity: 0;
  }
}

/* =========================================================
   Pluie — https://codepen.io/arickle/pen/XKjMZY
   (bottom:100%+ + translateY en cqh à la place de vh)
   ========================================================= */
.card-aura__rain {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.card-aura__rain--back {
  z-index: 1;
  bottom: 12%;
  opacity: 0.55;
}

.card-aura__drop {
  position: absolute;
  bottom: 100%;
  width: 15px;
  height: 120px;
  pointer-events: none;
  animation-name: rain-drop;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.card-aura__stem {
  width: 1.5px;
  height: 60%;
  margin-left: 7px;
  background: linear-gradient(to bottom, rgb(255 255 255 / 0), rgb(255 255 255 / 0.55));
  animation-name: rain-stem;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.card-aura__rain--front .card-aura__stem {
  width: 2px;
  background: linear-gradient(to bottom, rgb(255 255 255 / 0), rgb(255 255 255 / 0.85));
}

.card-aura__splat {
  width: 15px;
  height: 10px;
  border-top: 2px dotted rgb(255 255 255 / 0.65);
  border-radius: 50%;
  opacity: 1;
  transform: scale(0);
  animation-name: rain-splat;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes rain-drop {
  0% {
    transform: translateY(0);
  }
  75% {
    /* Fallback si cqh indisponible : hauteur typique d’une fiche */
    transform: translateY(28rem);
  }
  100% {
    transform: translateY(28rem);
  }
}

@supports (height: 1cqh) {
  @keyframes rain-drop {
    0% {
      transform: translateY(0);
    }
    75% {
      transform: translateY(100cqh);
    }
    100% {
      transform: translateY(100cqh);
    }
  }
}

@keyframes rain-stem {
  0%,
  65% {
    opacity: 1;
  }
  75%,
  100% {
    opacity: 0;
  }
}

@keyframes rain-splat {
  0%,
  80% {
    opacity: 1;
    transform: scale(0);
  }
  90% {
    opacity: 0.5;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

/* =========================================================
   Neige — adapté de mark_sottek (tuiles SVG + sway)
   ========================================================= */
.card-aura__snow {
  position: absolute;
  left: -20%;
  right: -20%;
  bottom: -20%;
  pointer-events: none;
  opacity: 0.9;
  will-change: transform;
}

.card-aura__snow--far {
  --snow-tile: 220px;
  --snow-speed: 16s;
  --snow-sway: 7s;
  top: calc(-20% - 220px);
  animation:
    snow-fall var(--snow-speed) linear infinite,
    snow-sway var(--snow-sway) ease-in-out infinite alternate;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cdefs%3E%3CradialGradient id='f' cx='.5' cy='.5' r='.5'%3E%3Cstop offset='0' stop-color='%23fff' stop-opacity='1'/%3E%3Cstop offset='.55' stop-color='%23fff' stop-opacity='.85'/%3E%3Cstop offset='1' stop-color='%23fff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='30' cy='40' r='1.6' fill='url(%23f)' opacity='.7'/%3E%3Ccircle cx='90' cy='20' r='1.1' fill='url(%23f)' opacity='.55'/%3E%3Ccircle cx='150' cy='55' r='1.8' fill='url(%23f)' opacity='.65'/%3E%3Ccircle cx='200' cy='30' r='1.2' fill='url(%23f)' opacity='.5'/%3E%3Ccircle cx='50' cy='100' r='1.4' fill='url(%23f)' opacity='.6'/%3E%3Ccircle cx='120' cy='90' r='1.9' fill='url(%23f)' opacity='.75'/%3E%3Ccircle cx='180' cy='110' r='1.3' fill='url(%23f)' opacity='.55'/%3E%3Ccircle cx='20' cy='160' r='1.5' fill='url(%23f)' opacity='.65'/%3E%3Ccircle cx='80' cy='170' r='1.2' fill='url(%23f)' opacity='.5'/%3E%3Ccircle cx='140' cy='150' r='1.7' fill='url(%23f)' opacity='.7'/%3E%3Ccircle cx='200' cy='180' r='1.4' fill='url(%23f)' opacity='.6'/%3E%3Ccircle cx='110' cy='200' r='1.1' fill='url(%23f)' opacity='.45'/%3E%3C/svg%3E")
    repeat 0 0 / 220px 220px;
}

.card-aura__snow--near {
  --snow-tile: 320px;
  --snow-speed: 10s;
  --snow-sway: 5s;
  top: calc(-20% - 320px);
  opacity: 0.95;
  animation:
    snow-fall var(--snow-speed) linear infinite,
    snow-sway var(--snow-sway) ease-in-out infinite alternate;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cdefs%3E%3CradialGradient id='f' cx='.5' cy='.5' r='.5'%3E%3Cstop offset='0' stop-color='%23fff' stop-opacity='1'/%3E%3Cstop offset='.55' stop-color='%23fff' stop-opacity='.85'/%3E%3Cstop offset='1' stop-color='%23fff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='40' cy='50' r='3.2' fill='url(%23f)' opacity='.75'/%3E%3Ccircle cx='120' cy='30' r='2.4' fill='url(%23f)' opacity='.65'/%3E%3Ccircle cx='210' cy='70' r='3.6' fill='url(%23f)' opacity='.8'/%3E%3Ccircle cx='280' cy='40' r='2.6' fill='url(%23f)' opacity='.6'/%3E%3Ccircle cx='60' cy='150' r='2.8' fill='url(%23f)' opacity='.7'/%3E%3Ccircle cx='160' cy='130' r='3.4' fill='url(%23f)' opacity='.85'/%3E%3Ccircle cx='250' cy='160' r='2.5' fill='url(%23f)' opacity='.65'/%3E%3Ccircle cx='30' cy='240' r='3' fill='url(%23f)' opacity='.7'/%3E%3Ccircle cx='140' cy='250' r='2.7' fill='url(%23f)' opacity='.75'/%3E%3Ccircle cx='230' cy='230' r='3.5' fill='url(%23f)' opacity='.8'/%3E%3Ccircle cx='290' cy='280' r='2.4' fill='url(%23f)' opacity='.55'/%3E%3Ccircle cx='100' cy='290' r='2.9' fill='url(%23f)' opacity='.7'/%3E%3C/svg%3E")
    repeat 0 0 / 320px 320px;
  filter: drop-shadow(0 0 1px rgb(20 30 50 / 0.35));
}

@keyframes snow-fall {
  to {
    transform: translateY(var(--snow-tile));
  }
}

@keyframes snow-sway {
  from {
    translate: -12px 0;
  }
  to {
    translate: 12px 0;
  }
}

/*
 * Brume dissipée : bancs gauches/droits qui se rejoignent puis s’écartent.
 * Phase « écartée » ~ claire pour laisser lire la fiche (plus de voile figé).
 */
.card-aura__haze {
  position: absolute;
  top: -5%;
  height: 110%;
  width: 78%;
  border-radius: 45% 55% 50% 50%;
  background: radial-gradient(
    ellipse at center,
    rgb(245 248 255 / 0.92) 0%,
    rgb(220 230 245 / 0.55) 48%,
    rgb(220 230 245 / 0) 72%
  );
  filter: blur(16px);
  will-change: transform, opacity;
}

.card-aura__haze--left {
  left: -8%;
  animation: mist-part-left 9s ease-in-out infinite;
}

.card-aura__haze--right {
  right: -8%;
  left: auto;
  border-radius: 55% 45% 50% 50%;
  animation: mist-part-right 9s ease-in-out infinite;
}

.card-aura__haze--low {
  left: 10%;
  right: 10%;
  top: auto;
  bottom: -18%;
  width: auto;
  height: 55%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgb(235 242 255 / 0.7) 0%,
    rgb(220 230 245 / 0) 70%
  );
  filter: blur(20px);
  animation: mist-part-low 9s ease-in-out infinite;
}

@keyframes sheen-flash {
  0% {
    transform: translateX(0) rotate(18deg);
    opacity: 0;
  }
  10% {
    opacity: 0.9;
  }
  35% {
    opacity: 0.55;
  }
  55% {
    transform: translateX(260%) rotate(18deg);
    opacity: 0;
  }
  100% {
    transform: translateX(260%) rotate(18deg);
    opacity: 0;
  }
}

/* Couverture → écartement (carte lisible) → retour */
@keyframes mist-part-left {
  0%,
  12% {
    transform: translate3d(28%, 0, 0) scale(1.05);
    opacity: 0.95;
  }
  38%,
  62% {
    transform: translate3d(-72%, -4%, 0) scale(1.15);
    opacity: 0.12;
  }
  88%,
  100% {
    transform: translate3d(28%, 0, 0) scale(1.05);
    opacity: 0.95;
  }
}

@keyframes mist-part-right {
  0%,
  12% {
    transform: translate3d(-28%, 0, 0) scale(1.05);
    opacity: 0.95;
  }
  38%,
  62% {
    transform: translate3d(72%, 3%, 0) scale(1.15);
    opacity: 0.12;
  }
  88%,
  100% {
    transform: translate3d(-28%, 0, 0) scale(1.05);
    opacity: 0.95;
  }
}

@keyframes mist-part-low {
  0%,
  12% {
    transform: translate3d(0, -18%, 0) scale(1.1);
    opacity: 0.75;
  }
  38%,
  62% {
    transform: translate3d(0, 55%, 0) scale(1.2);
    opacity: 0.05;
  }
  88%,
  100% {
    transform: translate3d(0, -18%, 0) scale(1.1);
    opacity: 0.75;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-aura__sheen-flash,
  .card-aura__leaf,
  .card-aura__drop,
  .card-aura__stem,
  .card-aura__splat,
  .card-aura__snow,
  .card-aura__haze {
    animation: none !important;
  }

  .card-aura__sheen-flash {
    opacity: 0.35;
    left: 35%;
  }

  /* Figé mais écarté : la fiche reste lisible */
  .card-aura__haze--left {
    transform: translate3d(-55%, 0, 0);
    opacity: 0.25;
  }

  .card-aura__haze--right {
    transform: translate3d(55%, 0, 0);
    opacity: 0.25;
  }

  .card-aura__haze--low {
    transform: translate3d(0, 40%, 0);
    opacity: 0.15;
  }

  .card-aura__leaf {
    opacity: 0.6;
    top: 22%;
  }

  .card-aura__leaf--7,
  .card-aura__leaf--8,
  .card-aura__leaf--9,
  .card-aura__leaf--10,
  .card-aura__leaf--11,
  .card-aura__leaf--12,
  .card-aura__leaf--13,
  .card-aura__leaf--14 {
    display: none;
  }

  .card-aura__snow {
    opacity: 0.45;
  }
}
</style>

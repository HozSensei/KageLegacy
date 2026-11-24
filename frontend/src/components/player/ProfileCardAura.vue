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
 * Pluie style CodePen arickle/XKjMZY — gouttes pré-générées (pas de jQuery).
 * Positions / délais déterministes pour éviter le flicker au re-render.
 */
const rainDrops = computed(() => {
  const drops = [];
  let x = 1;
  let i = 0;
  while (x < 99 && i < 42) {
    const step = 1.5 + ((i * 5) % 3);
    const delay = ((i * 29) % 95) / 100;
    const duration = 0.45 + ((i * 11) % 40) / 100;
    const layer = i % 3; // 0 front / 1 mid / 2 back
    drops.push({
      id: i,
      left: x,
      delay,
      duration,
      layer,
    });
    x += step;
    i += 1;
  }
  return drops;
});
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

    <!-- Pluie — stem + splat (arickle), densifiée pour lisibilité sur fiche -->
    <template v-else-if="effect === 'rain'">
      <span class="card-aura__weather card-aura__weather--rain" />
      <span class="card-aura__rain">
        <span
          v-for="drop in rainDrops"
          :key="`rain-${drop.id}`"
          class="card-aura__drop"
          :class="`card-aura__drop--l${drop.layer}`"
          :style="{
            left: `${drop.left}%`,
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

    <template v-else-if="effect === 'mist_fade'">
      <span class="card-aura__haze-veil" />
      <span class="card-aura__haze card-aura__haze--a" />
      <span class="card-aura__haze card-aura__haze--b" />
      <span class="card-aura__haze card-aura__haze--c" />
      <span class="card-aura__haze card-aura__haze--d" />
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
  background: linear-gradient(180deg, rgb(20 35 60 / 0.42) 0%, rgb(12 20 38 / 0.22) 100%);
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
   Pluie — adapté de https://codepen.io/arickle/pen/XKjMZY
   (traits plus épais / blancs pour rester lisibles sur une fiche)
   ========================================================= */
.card-aura__rain {
  position: absolute;
  inset: 0;
}

.card-aura__drop {
  position: absolute;
  top: -18%;
  width: 0.85rem;
  height: 4.5rem;
  pointer-events: none;
  animation-name: rain-drop;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  transform: rotate(12deg);
}

.card-aura__drop--l1 {
  opacity: 0.72;
  height: 3.6rem;
}

.card-aura__drop--l2 {
  opacity: 0.48;
  height: 2.8rem;
}

.card-aura__stem {
  width: 2.5px;
  height: 70%;
  margin-left: 0.35rem;
  border-radius: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgb(255 255 255 / 0.55) 35%,
    rgb(230 245 255 / 0.95) 100%
  );
  box-shadow: 0 0 3px rgb(180 210 255 / 0.55);
  animation-name: rain-stem;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.card-aura__drop--l1 .card-aura__stem {
  width: 2px;
}

.card-aura__drop--l2 .card-aura__stem {
  width: 1.5px;
  box-shadow: none;
}

.card-aura__splat {
  width: 0.9rem;
  height: 0.45rem;
  margin-left: -0.05rem;
  border-top: 2px dotted rgb(255 255 255 / 0.85);
  border-radius: 50%;
  opacity: 1;
  transform: scale(0);
  animation-name: rain-splat;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes rain-drop {
  0% {
    transform: translate3d(0, 0, 0) rotate(12deg);
  }
  72% {
    transform: translate3d(0.6rem, 32rem, 0) rotate(12deg);
  }
  100% {
    transform: translate3d(0.6rem, 32rem, 0) rotate(12deg);
  }
}

@keyframes rain-stem {
  0%,
  62% {
    opacity: 1;
  }
  74%,
  100% {
    opacity: 0;
  }
}

@keyframes rain-splat {
  0%,
  72% {
    opacity: 1;
    transform: scale(0);
  }
  82% {
    opacity: 0.75;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
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

/* —— Brume : voile permanent + volutes plus opaques —— */
.card-aura__haze-veil {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    165deg,
    rgb(230 238 248 / 0.38) 0%,
    rgb(255 255 255 / 0.18) 45%,
    rgb(210 222 238 / 0.32) 100%
  );
  mix-blend-mode: soft-light;
}

.card-aura__haze {
  position: absolute;
  width: 85%;
  height: 58%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgb(255 255 255 / 0.78) 0%,
    rgb(230 238 250 / 0.45) 42%,
    transparent 74%
  );
  filter: blur(18px);
  animation: mist-fade 5.8s ease-in-out infinite;
}

.card-aura__haze--a {
  left: -18%;
  top: 4%;
}

.card-aura__haze--b {
  right: -20%;
  bottom: -2%;
  animation-delay: 1.6s;
}

.card-aura__haze--c {
  left: 12%;
  top: 32%;
  width: 70%;
  height: 48%;
  animation-delay: 3s;
}

.card-aura__haze--d {
  left: 28%;
  bottom: 8%;
  width: 55%;
  height: 36%;
  animation-delay: 4.2s;
  animation-duration: 7s;
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

@keyframes mist-fade {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.55;
  }
  35% {
    transform: translate3d(8%, -4%, 0) scale(1.12);
    opacity: 0.95;
  }
  65% {
    transform: translate3d(14%, 2%, 0) scale(1.06);
    opacity: 0.7;
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

  .card-aura__haze,
  .card-aura__haze-veil {
    opacity: 0.7;
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

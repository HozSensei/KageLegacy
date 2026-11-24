<script setup>
import { computed } from 'vue';
import { getProfileCardEffect } from '../../constants/profileCardEffects.js';

defineOptions({ name: 'ProfileCardAura' });

const props = defineProps({
  cardEffectId: { type: String, default: null },
});

const effect = computed(() => getProfileCardEffect(props.cardEffectId)?.effect || null);
const isSheen = computed(() => typeof effect.value === 'string' && effect.value.startsWith('sheen_'));

/** Feuilles style CodePen uurrnn/WNLVdN (forme organique + 3 trajectoires). */
const leafCount = 15;

/**
 * Pluie style CodePen arickle/XKjMZY — gouttes pré-générées (pas de jQuery).
 * Positions / délais déterministes pour éviter le flicker au re-render.
 */
const rainDrops = computed(() => {
  const drops = [];
  let x = 2;
  let i = 0;
  while (x < 98 && i < 26) {
    const step = 2 + ((i * 7) % 4);
    const delay = ((i * 37) % 90) / 100;
    const duration = 0.55 + ((i * 13) % 45) / 100;
    drops.push({
      id: i,
      left: x,
      delay,
      duration,
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
      <span class="card-aura__sheen-sweep" />
    </template>

    <!-- Feuilles mortes — forme feuille (skew + pétiole) + chute en dérive -->
    <template v-else-if="effect === 'leaves'">
      <span class="card-aura__weather card-aura__weather--autumn" />
      <span class="card-aura__leaves">
        <i v-for="n in leafCount" :key="`leaf-${n}`" />
      </span>
    </template>

    <!-- Pluie — stem + splat (arickle) -->
    <template v-else-if="effect === 'rain'">
      <span class="card-aura__weather card-aura__weather--rain" />
      <span class="card-aura__rain">
        <span
          v-for="drop in rainDrops"
          :key="`rain-${drop.id}`"
          class="card-aura__drop"
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
      <span class="card-aura__haze card-aura__haze--a" />
      <span class="card-aura__haze card-aura__haze--b" />
      <span class="card-aura__haze card-aura__haze--c" />
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

.card-aura__weather {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.card-aura__weather--autumn {
  background: linear-gradient(
    180deg,
    rgb(180 90 30 / 0.14) 0%,
    transparent 40%,
    rgb(100 40 15 / 0.12) 100%
  );
}

.card-aura__weather--rain {
  background: linear-gradient(180deg, rgb(30 50 80 / 0.28) 0%, rgb(15 25 45 / 0.14) 100%);
}

.card-aura__weather--snow {
  background: linear-gradient(180deg, rgb(190 210 240 / 0.2) 0%, rgb(255 255 255 / 0.06) 100%);
}

/* =========================================================
   Feuilles — adapté de https://codepen.io/uurrnn/pen/WNLVdN
   (couleurs automne, échelle fiche)
   ========================================================= */
.card-aura__leaves {
  position: absolute;
  inset: 0;
  text-align: right;
}

.card-aura__leaves i {
  position: absolute;
  top: -8%;
  display: inline-block;
  width: 1.4rem;
  height: 1.05rem;
  background: linear-gradient(to bottom right, #c45c26, #7a2e0c);
  transform: skew(20deg) rotate(180deg);
  border-radius: 5% 40% 70%;
  box-shadow: inset 0 0 1px rgb(40 20 10 / 0.6);
  opacity: 0.85;
  animation: leaf-fall-a 5.2s ease-in-out infinite;
}

.card-aura__leaves i::before {
  position: absolute;
  content: '';
  top: 0.78rem;
  right: 0.12rem;
  height: 0.28rem;
  width: 0.35rem;
  transform: rotate(49deg);
  border-radius: 0% 15% 15% 0%;
  border: 1px solid rgb(60 30 10 / 0.45);
  border-left: 0;
  background: linear-gradient(to right, #9a3b12, #5c2208);
}

.card-aura__leaves i::after {
  content: '';
  position: absolute;
  left: 0.55rem;
  top: 0;
  height: 0.9rem;
  width: 0.12rem;
  background: linear-gradient(to right, rgb(0 0 0 / 0.22), transparent);
  transform: rotate(125deg);
  border-radius: 50%;
}

.card-aura__leaves i:nth-of-type(2n) {
  animation-name: leaf-fall-b;
  background: linear-gradient(to bottom right, #d4a017, #8a5a10);
}

.card-aura__leaves i:nth-of-type(3n) {
  animation-name: leaf-fall-c;
}

.card-aura__leaves i:nth-of-type(2n+1) {
  width: 0.85rem;
  height: 0.65rem;
  opacity: 0.7;
}

.card-aura__leaves i:nth-of-type(2n+1)::before {
  width: 0.22rem;
  height: 0.16rem;
  top: 0.45rem;
  right: 0;
}

.card-aura__leaves i:nth-of-type(2n+1)::after {
  width: 0.08rem;
  height: 0.45rem;
  left: 0.32rem;
}

.card-aura__leaves i:nth-of-type(3n+2) {
  width: 1.1rem;
  height: 0.85rem;
  background: linear-gradient(to bottom right, #e07a2f, #6b2a0c);
  opacity: 0.9;
}

.card-aura__leaves i:nth-of-type(4n+1) {
  background: linear-gradient(to bottom right, #b8860b, #564500);
}

.card-aura__leaves i:nth-of-type(1) {
  left: 8%;
  animation-delay: 0.2s;
}
.card-aura__leaves i:nth-of-type(2) {
  left: 18%;
  animation-delay: 1.1s;
}
.card-aura__leaves i:nth-of-type(3) {
  left: 28%;
  animation-delay: 0.6s;
}
.card-aura__leaves i:nth-of-type(4) {
  left: 38%;
  animation-delay: 2.2s;
}
.card-aura__leaves i:nth-of-type(5) {
  left: 48%;
  animation-delay: 1.5s;
}
.card-aura__leaves i:nth-of-type(6) {
  left: 58%;
  animation-delay: 0.9s;
}
.card-aura__leaves i:nth-of-type(7) {
  left: 68%;
  animation-delay: 2.8s;
}
.card-aura__leaves i:nth-of-type(8) {
  left: 78%;
  animation-delay: 1.8s;
}
.card-aura__leaves i:nth-of-type(9) {
  left: 88%;
  animation-delay: 0.4s;
}
.card-aura__leaves i:nth-of-type(10) {
  left: 12%;
  animation-delay: 3.1s;
}
.card-aura__leaves i:nth-of-type(11) {
  left: 32%;
  animation-delay: 2.4s;
}
.card-aura__leaves i:nth-of-type(12) {
  left: 52%;
  animation-delay: 3.6s;
}
.card-aura__leaves i:nth-of-type(13) {
  left: 72%;
  animation-delay: 1.3s;
}
.card-aura__leaves i:nth-of-type(14) {
  left: 42%;
  animation-delay: 4s;
}
.card-aura__leaves i:nth-of-type(15) {
  left: 62%;
  animation-delay: 2s;
}

@keyframes leaf-fall-a {
  0% {
    transform: skew(20deg) translate3d(0, 0, 0) rotate(180deg);
    opacity: 0;
  }
  8% {
    opacity: 0.9;
  }
  100% {
    transform: skew(20deg) translate3d(-4.5rem, 28rem, 0) rotate(270deg);
    opacity: 0;
  }
}

@keyframes leaf-fall-b {
  0% {
    transform: skew(20deg) translate3d(0, 0, 0) rotate(90deg);
    opacity: 0;
  }
  8% {
    opacity: 0.85;
  }
  100% {
    transform: skew(20deg) translate3d(-5.5rem, 27rem, 0) rotate(0deg);
    opacity: 0;
  }
}

@keyframes leaf-fall-c {
  0% {
    transform: skew(20deg) translate3d(0, 0, 0) rotate(-20deg);
    opacity: 0;
  }
  8% {
    opacity: 0.8;
  }
  100% {
    transform: skew(20deg) translate3d(-3rem, 26rem, 0) rotate(-70deg);
    opacity: 0;
  }
}

/* =========================================================
   Pluie — adapté de https://codepen.io/arickle/pen/XKjMZY
   ========================================================= */
.card-aura__rain {
  position: absolute;
  inset: 0;
}

.card-aura__drop {
  position: absolute;
  top: -12%;
  width: 0.7rem;
  height: 3.25rem;
  pointer-events: none;
  animation-name: rain-drop;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.card-aura__stem {
  width: 1.5px;
  height: 60%;
  margin-left: 0.32rem;
  background: linear-gradient(to bottom, transparent, rgb(220 235 255 / 0.85));
  animation-name: rain-stem;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.card-aura__splat {
  width: 0.7rem;
  height: 0.4rem;
  border-top: 2px dotted rgb(220 235 255 / 0.65);
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
    /* Distance en rem : % serait relatif à la goutte, pas à la fiche */
    transform: translateY(26rem);
  }
  100% {
    transform: translateY(26rem);
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
    opacity: 0.55;
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
  .card-aura__leaves i,
  .card-aura__drop,
  .card-aura__stem,
  .card-aura__splat,
  .card-aura__snow,
  .card-aura__haze {
    animation: none !important;
  }

  .card-aura__leaves i {
    opacity: 0.55;
    top: 25%;
  }

  .card-aura__leaves i:nth-of-type(n + 6) {
    display: none;
  }

  .card-aura__snow {
    opacity: 0.45;
  }
}
</style>

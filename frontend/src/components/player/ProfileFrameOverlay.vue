<script setup>
import { computed } from 'vue';
import { getProfileFrame } from '../../constants/profileFrames.js';

defineOptions({ name: 'ProfileFrameOverlay' });

const props = defineProps({
  frameId: { type: String, default: null },
  /** `avatar` = cercle ; `card` = rectangle */
  variant: {
    type: String,
    default: 'avatar',
    validator: value => ['avatar', 'card'].includes(value),
  },
});

const effect = computed(() => getProfileFrame(props.frameId)?.effect || null);
</script>

<template>
  <span
    v-if="effect"
    class="frame-overlay"
    :class="[`frame-overlay--${variant}`, `frame-overlay--${effect}`]"
    aria-hidden="true"
  >
    <span class="frame-overlay__ring" />

    <!-- Flammes (pics + braises montantes) -->
    <template v-if="effect === 'ember'">
      <span class="frame-overlay__flame frame-overlay__flame--1" />
      <span class="frame-overlay__flame frame-overlay__flame--2" />
      <span class="frame-overlay__flame frame-overlay__flame--3" />
      <span class="frame-overlay__ember frame-overlay__ember--a" />
      <span class="frame-overlay__ember frame-overlay__ember--b" />
      <span class="frame-overlay__ember frame-overlay__ember--c" />
    </template>

    <!-- Éclairs (zigzag SVG) -->
    <svg
      v-else-if="effect === 'volt'"
      class="frame-overlay__bolts"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <path class="frame-overlay__bolt frame-overlay__bolt--a" d="M62 8 38 48h18L34 92 66 46H48Z" />
      <path class="frame-overlay__bolt frame-overlay__bolt--b" d="M28 18 18 42h10L14 72 40 40H28Z" />
      <path class="frame-overlay__bolt frame-overlay__bolt--c" d="M78 22 70 44h8L64 78 88 42H76Z" />
    </svg>

    <!-- Brume -->
    <template v-else-if="effect === 'mist'">
      <span class="frame-overlay__fog frame-overlay__fog--a" />
      <span class="frame-overlay__fog frame-overlay__fog--b" />
      <span class="frame-overlay__fog frame-overlay__fog--c" />
    </template>

    <!-- Ombre tournoyante -->
    <template v-else-if="effect === 'shadow'">
      <span class="frame-overlay__swirl" />
      <span class="frame-overlay__void" />
    </template>

    <!-- Feuilles (glyphe cannabis stylisé) -->
    <template v-else-if="effect === 'leaf'">
      <svg
        v-for="n in 5"
        :key="n"
        class="frame-overlay__leaf"
        :class="`frame-overlay__leaf--${n}`"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3c1.2 2.4 2.1 3.6 2.1 5.2 0 .9-.3 1.7-.8 2.3 1.4-.2 2.6-.9 3.4-1.9.3 1.8-.4 3.4-1.7 4.4 1.1.1 2.1.6 2.8 1.4-.9 1.5-2.5 2.4-4.2 2.5.6 1 .9 2.1.7 3.2L12 21l-1.3-1.9c-.2-1.1.1-2.2.7-3.2-1.7-.1-3.3-1-4.2-2.5.7-.8 1.7-1.3 2.8-1.4-1.3-1-2-2.6-1.7-4.4.8 1 2 1.7 3.4 1.9-.5-.6-.8-1.4-.8-2.3C9.9 6.6 10.8 5.4 12 3z"
        />
      </svg>
    </template>
  </span>
</template>

<style scoped>
.frame-overlay {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}

.frame-overlay--avatar {
  aspect-ratio: 1;
  inset: -12%;
  border-radius: 50%;
}

.frame-overlay--card {
  inset: -3%;
  border-radius: inherit;
}

.frame-overlay__ring {
  position: absolute;
  inset: 10%;
  border: 2px solid currentColor;
  box-shadow:
    0 0 10px color-mix(in srgb, currentColor 55%, transparent),
    inset 0 0 8px color-mix(in srgb, currentColor 35%, transparent);
}

.frame-overlay--avatar .frame-overlay__ring {
  border-radius: 50%;
}

.frame-overlay--card .frame-overlay__ring {
  inset: 2%;
  border-radius: 0.85rem;
}

/* —— Ember —— */
.frame-overlay--ember {
  color: #ff7a18;
}

.frame-overlay--ember .frame-overlay__ring {
  border-color: #ff9a3c;
  animation: frame-pulse 1.5s ease-in-out infinite;
}

.frame-overlay__flame {
  position: absolute;
  bottom: 6%;
  width: 18%;
  height: 34%;
  border-radius: 50% 50% 20% 20% / 70% 70% 30% 30%;
  background: linear-gradient(to top, #ff4500 0%, #ff9a3c 45%, #ffe08a 78%, transparent 100%);
  filter: blur(0.4px);
  transform-origin: 50% 100%;
  animation: flame-flicker 0.85s ease-in-out infinite;
  opacity: 0.95;
}

.frame-overlay__flame--1 {
  left: 18%;
  animation-delay: 0s;
}

.frame-overlay__flame--2 {
  left: 41%;
  width: 22%;
  height: 42%;
  animation-delay: 0.18s;
}

.frame-overlay__flame--3 {
  left: 64%;
  animation-delay: 0.32s;
}

.frame-overlay__ember {
  position: absolute;
  width: 10%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #ffe08a 0%, #ff6a00 55%, transparent 70%);
  animation: ember-rise 2.2s ease-in infinite;
}

.frame-overlay__ember--a {
  left: 22%;
  bottom: 20%;
  animation-delay: 0s;
}

.frame-overlay__ember--b {
  left: 48%;
  bottom: 18%;
  width: 8%;
  animation-delay: 0.7s;
}

.frame-overlay__ember--c {
  left: 72%;
  bottom: 22%;
  width: 7%;
  animation-delay: 1.3s;
}

/* —— Volt —— */
.frame-overlay--volt {
  color: #5ad0ff;
}

.frame-overlay--volt .frame-overlay__ring {
  border-color: #9aecff;
  animation: frame-flicker 0.7s steps(2, end) infinite;
}

.frame-overlay__bolts {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.frame-overlay__bolt {
  fill: #9aecff;
  stroke: #ffffff;
  stroke-width: 1.2;
  filter: drop-shadow(0 0 3px #5ad0ff);
  opacity: 0;
  animation: bolt-flash 1.6s ease-in-out infinite;
}

.frame-overlay__bolt--a {
  animation-delay: 0s;
}

.frame-overlay__bolt--b {
  fill: #7de3ff;
  animation-delay: 0.55s;
}

.frame-overlay__bolt--c {
  fill: #dff7ff;
  animation-delay: 1.05s;
}

/* —— Mist —— */
.frame-overlay--mist {
  color: #c5d4e2;
}

.frame-overlay--mist .frame-overlay__ring {
  border-color: #e8f1f8;
  animation: frame-pulse 2.6s ease-in-out infinite;
}

.frame-overlay__fog {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 0.72) 0%, rgb(190 210 230 / 0.35) 45%, transparent 70%);
  filter: blur(3px);
  animation: fog-drift 4.2s ease-in-out infinite;
}

.frame-overlay__fog--a {
  width: 55%;
  height: 40%;
  left: -5%;
  top: 35%;
}

.frame-overlay__fog--b {
  width: 50%;
  height: 36%;
  right: -8%;
  top: 42%;
  animation-delay: 1.2s;
}

.frame-overlay__fog--c {
  width: 60%;
  height: 32%;
  left: 20%;
  bottom: 8%;
  animation-delay: 2.1s;
}

/* —— Shadow —— */
.frame-overlay--shadow {
  color: #8b74ff;
}

.frame-overlay--shadow .frame-overlay__ring {
  border-color: #a794ff;
  box-shadow:
    0 0 16px #5b3dff88,
    inset 0 0 14px #1a0a3888;
  animation: frame-pulse 2s ease-in-out infinite;
}

.frame-overlay__swirl {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0 12%,
    #7c5cffaa 18%,
    transparent 28% 48%,
    #2a104acc 55%,
    transparent 65% 82%,
    #9b84ff88 90%,
    transparent 100%
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 7px));
  animation: frame-spin 3.2s linear infinite;
}

.frame-overlay--card .frame-overlay__swirl {
  border-radius: 0.85rem;
  mask: none;
  opacity: 0.55;
}

.frame-overlay__void {
  position: absolute;
  inset: 18%;
  border-radius: 50%;
  background: radial-gradient(circle, transparent 40%, #1a0a3866 75%, transparent 100%);
  animation: frame-pulse 2.4s ease-in-out infinite reverse;
}

.frame-overlay--card .frame-overlay__void {
  border-radius: 0.7rem;
}

/* —— Leaf —— */
.frame-overlay--leaf {
  color: #6fbf73;
}

.frame-overlay--leaf .frame-overlay__ring {
  border-color: #8fd68f;
  animation: frame-pulse 2.2s ease-in-out infinite;
}

.frame-overlay__leaf {
  position: absolute;
  width: 22%;
  height: 22%;
  fill: #7dcf6a;
  filter: drop-shadow(0 0 2px #5aaa5e88);
  animation: leaf-orbit 4s linear infinite;
  transform-origin: 50% 50%;
}

.frame-overlay__leaf--1 {
  top: 2%;
  left: 39%;
  animation-delay: 0s;
}

.frame-overlay__leaf--2 {
  top: 28%;
  right: 0%;
  animation-delay: -0.8s;
  width: 18%;
  height: 18%;
}

.frame-overlay__leaf--3 {
  bottom: 6%;
  left: 38%;
  animation-delay: -1.6s;
}

.frame-overlay__leaf--4 {
  top: 30%;
  left: 0%;
  animation-delay: -2.4s;
  width: 18%;
  height: 18%;
}

.frame-overlay__leaf--5 {
  top: 8%;
  right: 12%;
  animation-delay: -3.2s;
  width: 16%;
  height: 16%;
  fill: #b6f0a0;
}

@keyframes frame-pulse {
  0%,
  100% {
    opacity: 0.78;
  }
  50% {
    opacity: 1;
  }
}

@keyframes frame-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes frame-flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@keyframes flame-flicker {
  0%,
  100% {
    transform: scaleY(1) scaleX(1);
    opacity: 0.9;
  }
  40% {
    transform: scaleY(1.12) scaleX(0.92);
    opacity: 1;
  }
  70% {
    transform: scaleY(0.92) scaleX(1.06);
    opacity: 0.85;
  }
}

@keyframes ember-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translateY(-120%) scale(0.35);
    opacity: 0;
  }
}

@keyframes bolt-flash {
  0%,
  8%,
  100% {
    opacity: 0;
  }
  10%,
  18% {
    opacity: 1;
  }
  22% {
    opacity: 0.25;
  }
  26% {
    opacity: 0.85;
  }
  32% {
    opacity: 0;
  }
}

@keyframes fog-drift {
  0%,
  100% {
    transform: translateX(0) scale(1);
    opacity: 0.45;
  }
  50% {
    transform: translateX(8%) scale(1.08);
    opacity: 0.85;
  }
}

@keyframes leaf-orbit {
  0% {
    transform: rotate(0deg) translateX(0) rotate(0deg);
  }
  100% {
    transform: rotate(360deg) translateX(0) rotate(-360deg);
  }
}

.frame-overlay--avatar .frame-overlay__leaf--1 {
  animation-name: leaf-spin;
}

.frame-overlay--avatar .frame-overlay__leaf--2 {
  animation-name: leaf-spin;
}

.frame-overlay--avatar .frame-overlay__leaf--3 {
  animation-name: leaf-spin;
}

.frame-overlay--avatar .frame-overlay__leaf--4 {
  animation-name: leaf-spin;
}

.frame-overlay--avatar .frame-overlay__leaf--5 {
  animation-name: leaf-spin;
}

@keyframes leaf-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame-overlay__ring,
  .frame-overlay__flame,
  .frame-overlay__ember,
  .frame-overlay__bolt,
  .frame-overlay__fog,
  .frame-overlay__swirl,
  .frame-overlay__void,
  .frame-overlay__leaf {
    animation: none !important;
  }

  .frame-overlay__bolt {
    opacity: 0.85;
  }
}
</style>

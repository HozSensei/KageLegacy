<script setup>
import { computed } from 'vue';
import { getProfileFrame } from '../../constants/profileFrames.js';

defineOptions({ name: 'ProfileCardAura' });

const props = defineProps({
  frameId: { type: String, default: null },
});

const effect = computed(() => getProfileFrame(props.frameId)?.effect || null);
</script>

<template>
  <span v-if="effect" class="card-aura" :class="`card-aura--${effect}`" aria-hidden="true">
    <!-- Reflet type carte rare/légendaire (balayage sur toute la fiche) -->
    <span class="card-aura__sheen" />
    <span class="card-aura__sheen card-aura__sheen--pass" />
    <span class="card-aura__glitter" />

    <template v-if="effect === 'mist'">
      <span class="card-aura__haze card-aura__haze--a" />
      <span class="card-aura__haze card-aura__haze--b" />
    </template>
  </span>
</template>

<style scoped>
.card-aura {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

/* Reflet de base (toujours visible, comme les cartes rare+) */
.card-aura__sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    112deg,
    transparent 14%,
    color-mix(in srgb, var(--aura-sheen-a, #fff) 18%, transparent) 34%,
    color-mix(in srgb, var(--aura-sheen-b, #fff) 42%, transparent) 48%,
    color-mix(in srgb, var(--aura-sheen-a, #fff) 16%, transparent) 58%,
    transparent 72%
  );
  opacity: 0.72;
  mix-blend-mode: soft-light;
}

/* Second passage animé (balayage foil) */
.card-aura__sheen--pass {
  width: 55%;
  inset: 0 auto 0 -20%;
  background: linear-gradient(
    105deg,
    transparent 20%,
    color-mix(in srgb, var(--aura-sheen-b, #fff) 55%, transparent) 48%,
    transparent 72%
  );
  opacity: 0.55;
  mix-blend-mode: screen;
  animation: sheen-pass 4.2s ease-in-out infinite;
}

.card-aura__glitter {
  position: absolute;
  width: 7rem;
  height: 7rem;
  left: var(--aura-x, 50%);
  top: var(--aura-y, 40%);
  translate: -50% -50%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, #fff 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 70% 40%, #fff 0 1px, transparent 2px),
    radial-gradient(circle at 45% 70%, #fff 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 60% 20%, currentColor 0 1px, transparent 2px),
    radial-gradient(circle, color-mix(in srgb, currentColor 45%, transparent) 0%, transparent 70%);
  opacity: calc(var(--aura-active, 0) * 0.95);
  transition: opacity 0.15s ease;
}

.card-aura--ember {
  color: #ffb347;
  --aura-sheen-a: #ff7a18;
  --aura-sheen-b: #ffe08a;
}

.card-aura--volt {
  color: #9aecff;
  --aura-sheen-a: #5ad0ff;
  --aura-sheen-b: #dff7ff;
}

.card-aura--mist {
  color: #e8f1f8;
  --aura-sheen-a: #c9d8e6;
  --aura-sheen-b: #ffffff;
}

.card-aura--shadow {
  color: #c4b5ff;
  --aura-sheen-a: #7c5cff;
  --aura-sheen-b: #e2d8ff;
}

.card-aura__haze {
  position: absolute;
  width: 70%;
  height: 45%;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 0.28) 0%, transparent 70%);
  filter: blur(8px);
  animation: aura-haze 5s ease-in-out infinite;
}

.card-aura__haze--a {
  left: -10%;
  top: 20%;
}

.card-aura__haze--b {
  right: -12%;
  bottom: 10%;
  animation-delay: 1.5s;
}

@keyframes sheen-pass {
  0% {
    transform: translateX(0);
    opacity: 0.15;
  }
  35% {
    opacity: 0.7;
  }
  100% {
    transform: translateX(220%);
    opacity: 0.1;
  }
}

@keyframes aura-haze {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.4;
  }
  50% {
    transform: translateX(12%);
    opacity: 0.75;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-aura__sheen--pass,
  .card-aura__haze {
    animation: none !important;
  }

  .card-aura__glitter {
    opacity: 0 !important;
  }
}
</style>

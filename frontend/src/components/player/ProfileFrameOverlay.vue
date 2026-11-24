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
const usesSwirl = computed(() => ['ember', 'volt', 'shadow'].includes(effect.value));
</script>

<template>
  <span
    v-if="effect"
    class="frame-overlay"
    :class="[`frame-overlay--${variant}`, `frame-overlay--${effect}`]"
    aria-hidden="true"
  >
    <span class="frame-overlay__ring" />

    <!-- Ombre / Braise / Volt : même base (anneau conique), teintes différentes -->
    <template v-if="usesSwirl">
      <span class="frame-overlay__swirl" />
      <span class="frame-overlay__void" />
    </template>

    <!-- Brume -->
    <template v-else-if="effect === 'mist'">
      <span class="frame-overlay__fog frame-overlay__fog--a" />
      <span class="frame-overlay__fog frame-overlay__fog--b" />
      <span class="frame-overlay__fog frame-overlay__fog--c" />
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
    0 0 12px color-mix(in srgb, currentColor 55%, transparent),
    inset 0 0 10px color-mix(in srgb, currentColor 35%, transparent);
  animation: frame-pulse 2s ease-in-out infinite;
}

.frame-overlay--avatar .frame-overlay__ring {
  border-radius: 50%;
}

.frame-overlay--card .frame-overlay__ring {
  inset: 2%;
  border-radius: 0.85rem;
}

.frame-overlay__swirl {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0 12%,
    color-mix(in srgb, var(--frame-swirl-a, currentColor) 70%, transparent) 18%,
    transparent 28% 48%,
    color-mix(in srgb, var(--frame-swirl-b, currentColor) 55%, transparent) 55%,
    transparent 65% 82%,
    color-mix(in srgb, var(--frame-swirl-a, currentColor) 60%, transparent) 90%,
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
  background: radial-gradient(
    circle,
    transparent 40%,
    color-mix(in srgb, var(--frame-void, currentColor) 35%, transparent) 75%,
    transparent 100%
  );
  animation: frame-pulse 2.4s ease-in-out infinite reverse;
}

.frame-overlay--card .frame-overlay__void {
  border-radius: 0.7rem;
}

/* —— Ember (base ombre, teinte feu) —— */
.frame-overlay--ember {
  color: #ff9a3c;
  --frame-swirl-a: #ff7a18;
  --frame-swirl-b: #ff4500;
  --frame-void: #7a1e00;
}

.frame-overlay--ember .frame-overlay__ring {
  border-color: #ffb347;
  box-shadow:
    0 0 16px #ff7a1888,
    inset 0 0 12px #ff450066;
}

/* —— Volt (base ombre, teinte électrique) —— */
.frame-overlay--volt {
  color: #7de3ff;
  --frame-swirl-a: #9aecff;
  --frame-swirl-b: #3bb7ff;
  --frame-void: #0a3a55;
}

.frame-overlay--volt .frame-overlay__ring {
  border-color: #b8f3ff;
  box-shadow:
    0 0 16px #3bb7ff99,
    inset 0 0 12px #9aecff66;
  animation: frame-pulse 1.1s ease-in-out infinite, frame-flicker 0.85s steps(2, end) infinite;
}

.frame-overlay--volt .frame-overlay__swirl {
  animation-duration: 2.2s;
}

/* —— Mist —— */
.frame-overlay--mist {
  color: #c5d4e2;
}

.frame-overlay--mist .frame-overlay__ring {
  border-color: #e8f1f8;
  box-shadow: 0 0 16px #9fb6c988;
}

.frame-overlay__fog {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgb(255 255 255 / 0.72) 0%,
    rgb(190 210 230 / 0.35) 45%,
    transparent 70%
  );
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
  --frame-swirl-a: #7c5cff;
  --frame-swirl-b: #2a104a;
  --frame-void: #1a0a38;
}

.frame-overlay--shadow .frame-overlay__ring {
  border-color: #a794ff;
  box-shadow:
    0 0 16px #5b3dff88,
    inset 0 0 14px #1a0a3888;
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
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.25);
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

@media (prefers-reduced-motion: reduce) {
  .frame-overlay__ring,
  .frame-overlay__fog,
  .frame-overlay__swirl,
  .frame-overlay__void {
    animation: none !important;
  }
}
</style>

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
    <span class="frame-overlay__spark frame-overlay__spark--a" />
    <span class="frame-overlay__spark frame-overlay__spark--b" />
    <span class="frame-overlay__spark frame-overlay__spark--c" />
  </span>
</template>

<style scoped>
.frame-overlay {
  position: absolute;
  inset: -8%;
  pointer-events: none;
  z-index: 2;
}

.frame-overlay--card {
  inset: -4%;
}

.frame-overlay__ring,
.frame-overlay__spark {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.frame-overlay--avatar .frame-overlay__ring,
.frame-overlay--avatar .frame-overlay__spark {
  border-radius: 50%;
}

.frame-overlay--card .frame-overlay__ring,
.frame-overlay--card .frame-overlay__spark {
  border-radius: 0.85rem;
}

.frame-overlay__ring {
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 35%, transparent);
}

.frame-overlay__spark {
  opacity: 0.85;
}

/* Ember */
.frame-overlay--ember {
  color: #ff7a18;
}
.frame-overlay--ember .frame-overlay__ring {
  border-color: #ff9a3c;
  box-shadow:
    0 0 12px #ff7a1888,
    inset 0 0 10px #ffb34755;
  animation: frame-pulse 1.6s ease-in-out infinite;
}
.frame-overlay--ember .frame-overlay__spark--a {
  background: radial-gradient(circle at 20% 15%, #ffe08a 0 8%, transparent 18%),
    radial-gradient(circle at 80% 20%, #ff6a00 0 6%, transparent 16%),
    radial-gradient(circle at 50% 0%, #ffb347 0 10%, transparent 22%);
  animation: frame-orbit 2.4s linear infinite;
}
.frame-overlay--ember .frame-overlay__spark--b {
  background: radial-gradient(circle at 10% 70%, #ff4500 0 5%, transparent 14%),
    radial-gradient(circle at 90% 75%, #ffd166 0 6%, transparent 15%);
  animation: frame-orbit 3.2s linear infinite reverse;
}

/* Volt */
.frame-overlay--volt {
  color: #5ad0ff;
}
.frame-overlay--volt .frame-overlay__ring {
  border-color: #7de3ff;
  box-shadow:
    0 0 14px #3bb7ff99,
    inset 0 0 8px #9aecff66;
  animation: frame-flicker 0.9s steps(2, end) infinite;
}
.frame-overlay--volt .frame-overlay__spark--a {
  background: conic-gradient(
    from 40deg,
    transparent 0 20%,
    #9aecff 20% 22%,
    transparent 22% 55%,
    #5ad0ff 55% 57%,
    transparent 57% 100%
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  animation: frame-spin 1.4s linear infinite;
}
.frame-overlay--volt .frame-overlay__spark--b {
  background: conic-gradient(
    from 200deg,
    transparent 0 30%,
    #ffffff 30% 31%,
    transparent 31% 70%,
    #7de3ff 70% 72%,
    transparent 72% 100%
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 8px));
  animation: frame-spin 2s linear infinite reverse;
}

/* Mist */
.frame-overlay--mist {
  color: #b8c9d9;
}
.frame-overlay--mist .frame-overlay__ring {
  border-color: #d7e4ef;
  box-shadow: 0 0 16px #9fb6c988;
  animation: frame-pulse 2.8s ease-in-out infinite;
}
.frame-overlay--mist .frame-overlay__spark--a {
  background: radial-gradient(circle at 30% 40%, #ffffffaa 0 18%, transparent 40%),
    radial-gradient(circle at 70% 60%, #c9d8e6aa 0 16%, transparent 38%);
  filter: blur(2px);
  animation: frame-drift 4s ease-in-out infinite;
}

/* Shadow */
.frame-overlay--shadow {
  color: #7c5cff;
}
.frame-overlay--shadow .frame-overlay__ring {
  border-color: #9b84ff;
  box-shadow:
    0 0 18px #5b3dff88,
    inset 0 0 12px #2a104a88;
  animation: frame-pulse 2s ease-in-out infinite;
}
.frame-overlay--shadow .frame-overlay__spark--a {
  background: conic-gradient(from 0deg, transparent, #7c5cff88, transparent, #2a104a88, transparent);
  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 6px));
  animation: frame-spin 3.5s linear infinite;
}

/* Leaf */
.frame-overlay--leaf {
  color: #6fbf73;
}
.frame-overlay--leaf .frame-overlay__ring {
  border-color: #8fd68f;
  box-shadow: 0 0 12px #5aaa5e77;
  animation: frame-pulse 2.2s ease-in-out infinite;
}
.frame-overlay--leaf .frame-overlay__spark--a {
  background: radial-gradient(circle at 15% 30%, #b6f0a0 0 5%, transparent 12%),
    radial-gradient(circle at 85% 35%, #7dcf6a 0 5%, transparent 12%),
    radial-gradient(circle at 50% 90%, #c8f7a8 0 6%, transparent 14%);
  animation: frame-orbit 3.6s linear infinite;
}

@keyframes frame-pulse {
  0%,
  100% {
    opacity: 0.75;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes frame-orbit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
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

@keyframes frame-drift {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.55;
  }
  50% {
    transform: translateY(-4%) scale(1.05);
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame-overlay__ring,
  .frame-overlay__spark {
    animation: none !important;
  }
}
</style>

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
    <span class="card-aura__sheen" />
    <span class="card-aura__glitter" />

    <template v-if="effect === 'leaf'">
      <svg
        v-for="n in 6"
        :key="`fall-${n}`"
        class="card-aura__fall-leaf"
        :class="`card-aura__fall-leaf--${n}`"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3c1.2 2.4 2.1 3.6 2.1 5.2 0 .9-.3 1.7-.8 2.3 1.4-.2 2.6-.9 3.4-1.9.3 1.8-.4 3.4-1.7 4.4 1.1.1 2.1.6 2.8 1.4-.9 1.5-2.5 2.4-4.2 2.5.6 1 .9 2.1.7 3.2L12 21l-1.3-1.9c-.2-1.1.1-2.2.7-3.2-1.7-.1-3.3-1-4.2-2.5.7-.8 1.7-1.3 2.8-1.4-1.3-1-2-2.6-1.7-4.4.8 1 2 1.7 3.4 1.9-.5-.6-.8-1.4-.8-2.3C9.9 6.6 10.8 5.4 12 3z"
        />
      </svg>
    </template>

    <template v-else-if="effect === 'mist'">
      <span class="card-aura__haze card-aura__haze--a" />
      <span class="card-aura__haze card-aura__haze--b" />
    </template>

    <template v-else-if="effect === 'ember'">
      <span
        v-for="n in 5"
        :key="`spark-${n}`"
        class="card-aura__spark"
        :class="`card-aura__spark--${n}`"
      />
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

.card-aura__sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    112deg,
    transparent 18%,
    rgb(255 255 255 / 0.08) 42%,
    rgb(255 255 255 / 0.22) 50%,
    transparent 64%
  );
  opacity: 0.55;
  mix-blend-mode: soft-light;
}

.card-aura--ember .card-aura__sheen {
  background: linear-gradient(
    112deg,
    transparent 16%,
    #ff7a1828 36%,
    #ffe08a55 48%,
    #ff450022 58%,
    transparent 72%
  );
  opacity: 0.8;
}

.card-aura--volt .card-aura__sheen {
  background: linear-gradient(
    112deg,
    transparent 16%,
    #5ad0ff33 34%,
    #dff7ff66 48%,
    #3bb7ff28 60%,
    transparent 72%
  );
  opacity: 0.85;
}

.card-aura--mist .card-aura__sheen {
  background: linear-gradient(
    112deg,
    transparent 20%,
    #ffffff22 40%,
    #c9d8e644 52%,
    transparent 70%
  );
}

.card-aura--shadow .card-aura__sheen {
  background: linear-gradient(
    112deg,
    transparent 16%,
    #7c5cff33 34%,
    #b8a6ff55 48%,
    #2a104a33 62%,
    transparent 74%
  );
  opacity: 0.9;
}

.card-aura--leaf .card-aura__sheen {
  background: linear-gradient(
    112deg,
    transparent 18%,
    #6fbf7330 38%,
    #c8f7a855 50%,
    transparent 68%
  );
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
}
.card-aura--volt {
  color: #9aecff;
}
.card-aura--mist {
  color: #e8f1f8;
}
.card-aura--shadow {
  color: #c4b5ff;
}
.card-aura--leaf {
  color: #b6f0a0;
}

.card-aura__fall-leaf {
  position: absolute;
  width: 1.1rem;
  height: 1.1rem;
  fill: #7dcf6a;
  opacity: 0.85;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));
  animation: aura-fall 5.5s linear infinite;
}

.card-aura__fall-leaf--1 {
  left: 8%;
  animation-delay: 0s;
  animation-duration: 5.2s;
}
.card-aura__fall-leaf--2 {
  left: 28%;
  width: 0.9rem;
  height: 0.9rem;
  animation-delay: -1.1s;
  animation-duration: 6s;
}
.card-aura__fall-leaf--3 {
  left: 48%;
  animation-delay: -2.2s;
  fill: #b6f0a0;
}
.card-aura__fall-leaf--4 {
  left: 66%;
  width: 1rem;
  height: 1rem;
  animation-delay: -3.4s;
  animation-duration: 4.8s;
}
.card-aura__fall-leaf--5 {
  left: 82%;
  animation-delay: -0.6s;
  animation-duration: 5.8s;
}
.card-aura__fall-leaf--6 {
  left: 38%;
  width: 0.85rem;
  height: 0.85rem;
  animation-delay: -4.1s;
  fill: #5aaa5e;
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

.card-aura__spark {
  position: absolute;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: #ffe08a;
  box-shadow: 0 0 6px #ff7a18;
  animation: aura-ember 3.2s ease-in infinite;
}

.card-aura__spark--1 {
  left: 15%;
  bottom: 10%;
}
.card-aura__spark--2 {
  left: 35%;
  bottom: 8%;
  animation-delay: 0.6s;
}
.card-aura__spark--3 {
  left: 55%;
  bottom: 12%;
  animation-delay: 1.2s;
}
.card-aura__spark--4 {
  left: 72%;
  bottom: 6%;
  animation-delay: 1.8s;
}
.card-aura__spark--5 {
  left: 88%;
  bottom: 14%;
  animation-delay: 2.4s;
}

@keyframes aura-fall {
  0% {
    transform: translateY(-15%) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.9;
  }
  100% {
    transform: translateY(110%) rotate(220deg);
    opacity: 0;
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

@keyframes aura-ember {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translateY(-8rem) scale(0.4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-aura__fall-leaf,
  .card-aura__haze,
  .card-aura__spark {
    animation: none !important;
  }

  .card-aura__glitter {
    opacity: 0 !important;
  }
}
</style>

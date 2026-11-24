<script setup>
import { computed } from 'vue';
import { getProfileCardEffect } from '../../constants/profileCardEffects.js';

defineOptions({ name: 'ProfileCardAura' });

const props = defineProps({
  cardEffectId: { type: String, default: null },
});

const effect = computed(() => getProfileCardEffect(props.cardEffectId)?.effect || null);
const isSheen = computed(() => typeof effect.value === 'string' && effect.value.startsWith('sheen_'));
const particleCount = 12;
</script>

<template>
  <span v-if="effect" class="card-aura" :class="`card-aura--${effect}`" aria-hidden="true">
    <template v-if="isSheen">
      <span class="card-aura__sheen" />
      <span class="card-aura__sheen card-aura__sheen--pass" />
      <span class="card-aura__glitter" />
    </template>

    <template v-else-if="effect === 'leaves'">
      <span
        v-for="i in particleCount"
        :key="`leaf-${i}`"
        class="card-aura__leaf"
        :style="{ '--i': i }"
      />
    </template>

    <template v-else-if="effect === 'rain'">
      <span
        v-for="i in particleCount"
        :key="`rain-${i}`"
        class="card-aura__drop"
        :style="{ '--i': i }"
      />
    </template>

    <template v-else-if="effect === 'snow'">
      <span
        v-for="i in particleCount"
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
    transparent 14%,
    color-mix(in srgb, var(--aura-sheen-a, #fff) 18%, transparent) 34%,
    color-mix(in srgb, var(--aura-sheen-b, #fff) 42%, transparent) 48%,
    color-mix(in srgb, var(--aura-sheen-a, #fff) 16%, transparent) 58%,
    transparent 72%
  );
  opacity: 0.72;
  mix-blend-mode: soft-light;
}

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

.card-aura--sheen_gold {
  color: #ffe08a;
  --aura-sheen-a: #d4a017;
  --aura-sheen-b: #fff1b8;
}

.card-aura--sheen_aurora {
  color: #9ef0ff;
  --aura-sheen-a: #5ad0ff;
  --aura-sheen-b: #c9a8ff;
}

.card-aura--sheen_ruby {
  color: #ff8a9a;
  --aura-sheen-a: #c41e3a;
  --aura-sheen-b: #ffb3c0;
}

.card-aura__leaf {
  position: absolute;
  top: -12%;
  left: calc(4% + (var(--i) - 1) * 7.5%);
  width: 0.55rem;
  height: 0.85rem;
  border-radius: 0 70% 0 70%;
  background: linear-gradient(135deg, #c45c26, #8b3a1a);
  opacity: 0.75;
  animation: leaf-fall calc(5.5s + var(--i) * 0.22s) linear infinite;
  animation-delay: calc(var(--i) * -0.45s);
}

.card-aura__leaf:nth-child(odd) {
  background: linear-gradient(135deg, #d4a017, #a05a1a);
  width: 0.45rem;
  height: 0.7rem;
}

.card-aura__drop {
  position: absolute;
  top: -10%;
  left: calc(3% + (var(--i) - 1) * 8%);
  width: 1px;
  height: 1.1rem;
  border-radius: 1px;
  background: linear-gradient(180deg, transparent, rgb(180 210 230 / 0.85));
  opacity: 0.65;
  animation: rain-fall calc(1.1s + var(--i) * 0.05s) linear infinite;
  animation-delay: calc(var(--i) * -0.12s);
}

.card-aura__flake {
  position: absolute;
  top: -8%;
  left: calc(5% + (var(--i) - 1) * 7.2%);
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.9);
  box-shadow: 0 0 4px rgb(255 255 255 / 0.45);
  opacity: 0.8;
  animation: snow-fall calc(6s + var(--i) * 0.35s) linear infinite;
  animation-delay: calc(var(--i) * -0.5s);
}

.card-aura__haze {
  position: absolute;
  width: 70%;
  height: 45%;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 0.32) 0%, transparent 70%);
  filter: blur(10px);
  animation: mist-fade 6.5s ease-in-out infinite;
}

.card-aura__haze--a {
  left: -10%;
  top: 15%;
}

.card-aura__haze--b {
  right: -14%;
  bottom: 8%;
  animation-delay: 2s;
}

.card-aura__haze--c {
  left: 20%;
  top: 40%;
  width: 55%;
  height: 35%;
  animation-delay: 3.5s;
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

@keyframes leaf-fall {
  0% {
    transform: translateY(0) rotate(0deg) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.85;
  }
  100% {
    transform: translateY(120%) rotate(220deg) translateX(1.2rem);
    opacity: 0;
  }
}

@keyframes rain-fall {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  15% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(130%) translateX(0.35rem);
    opacity: 0;
  }
}

@keyframes snow-fall {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  12% {
    opacity: 0.85;
  }
  100% {
    transform: translateY(125%) translateX(-0.8rem);
    opacity: 0;
  }
}

@keyframes mist-fade {
  0%,
  100% {
    transform: translateX(0) scale(1);
    opacity: 0.15;
  }
  40% {
    transform: translateX(8%) scale(1.08);
    opacity: 0.7;
  }
  70% {
    transform: translateX(14%) scale(1.02);
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-aura__sheen--pass,
  .card-aura__leaf,
  .card-aura__drop,
  .card-aura__flake,
  .card-aura__haze {
    animation: none !important;
  }

  .card-aura__glitter {
    opacity: 0 !important;
  }

  .card-aura__leaf,
  .card-aura__drop,
  .card-aura__flake {
    opacity: 0.35;
  }
}
</style>

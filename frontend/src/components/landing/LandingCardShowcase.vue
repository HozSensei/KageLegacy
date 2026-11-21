<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from '../cards/CardDisplay.vue';

defineOptions({ name: 'LandingCardShowcase' });

defineProps({
  cards: {
    type: Array,
    required: true,
  },
  /** `onFill` : hint clair sur fond indigo / hero. */
  tone: {
    type: String,
    default: 'default',
    validator: v => v === 'default' || v === 'onFill',
  },
  /** Affiche le hint de flip sous la rangée. */
  showHint: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const faces = ref({});

function faceFor(slug) {
  return faces.value[slug] || 'front';
}

function toggleFlip(card) {
  const slug = card.slug;
  faces.value = {
    ...faces.value,
    [slug]: faceFor(slug) === 'front' ? 'back' : 'front',
  };
}
</script>

<template>
  <div
    class="landing-showcase"
    :class="{ 'landing-showcase--on-fill': tone === 'onFill' }"
    data-testid="landing-card-showcase"
  >
    <p v-if="showHint" class="landing-showcase__hint">{{ t('landing.showcase.hint') }}</p>
    <ul class="landing-showcase__row" role="list">
      <li
        v-for="(card, index) in cards"
        :key="card.slug"
        class="landing-showcase__slot"
        :style="{ '--i': index }"
        role="listitem"
      >
        <CardDisplay
          :card="card"
          :face="faceFor(card.slug)"
          :tilt="true"
          :description="t('landing.showcase.flipHint')"
          @select="toggleFlip(card)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.landing-showcase {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  width: 100%;
}

.landing-showcase__row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.landing-showcase__slot {
  flex: 1 1 0;
  min-width: 0;
  max-width: 16rem;
  transition: transform 320ms var(--ease-out-quint);
  filter: drop-shadow(0 18px 32px color-mix(in srgb, var(--color-ink) 22%, transparent));
}

.landing-showcase__slot:hover,
.landing-showcase__slot:focus-within {
  z-index: 2;
  transform: translateY(-0.35rem);
}

.landing-showcase__hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
  text-align: center;
}

.landing-showcase--on-fill .landing-showcase__hint {
  color: color-mix(in srgb, var(--color-on-fill) 68%, transparent);
}

.landing-showcase--on-fill .landing-showcase__slot {
  filter: drop-shadow(0 20px 36px color-mix(in srgb, #0b0d14 48%, transparent));
}

@media (max-width: 639px) {
  .landing-showcase__row {
    gap: 0.55rem;
  }

  .landing-showcase__slot {
    max-width: none;
  }

  .landing-showcase__slot:nth-child(n + 3) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-showcase__slot {
    transition: none;
  }

  .landing-showcase__slot:hover,
  .landing-showcase__slot:focus-within {
    transform: none;
  }
}
</style>

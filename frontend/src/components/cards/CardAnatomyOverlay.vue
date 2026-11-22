<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from './CardDisplay.vue';
import { CARD_ANATOMY_DEMO, CARD_ANATOMY_STEPS } from '../../constants/cardAnatomyDemo.js';

defineOptions({ name: 'CardAnatomyOverlay' });

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['dismiss']);

const { t } = useI18n();
const stepIndex = ref(0);
const primaryBtn = ref(null);

const stepId = computed(() => CARD_ANATOMY_STEPS[stepIndex.value] || CARD_ANATOMY_STEPS[0]);
const stepCount = CARD_ANATOMY_STEPS.length;
const isLast = computed(() => stepIndex.value >= stepCount - 1);

const title = computed(() => t(`cards.anatomyGuide.steps.${stepId.value}.title`));
const body = computed(() => t(`cards.anatomyGuide.steps.${stepId.value}.body`));

function goNext() {
  if (isLast.value) {
    emit('dismiss');
    return;
  }
  stepIndex.value += 1;
}

function goBack() {
  if (stepIndex.value > 0) stepIndex.value -= 1;
}

function onKeydown(event) {
  if (!props.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('dismiss');
  } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
    if (event.target?.closest?.('a')) return;
    event.preventDefault();
    goNext();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    goBack();
  }
}

function setBodyScrollLocked(locked) {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
}

watch(
  () => props.open,
  async value => {
    setBodyScrollLocked(Boolean(value));
    if (!value) return;
    stepIndex.value = 0;
    await nextTick();
    primaryBtn.value?.focus?.();
  },
  { immediate: true }
);

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  setBodyScrollLocked(false);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop anatomy-overlay"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'card-anatomy-title'"
      data-testid="card-anatomy-overlay"
      @click.self="emit('dismiss')"
    >
      <div class="modal-panel anatomy-overlay__panel">
        <div class="anatomy-overlay__scroll">
          <p class="page-kicker">{{ t('cards.anatomyGuide.kicker') }}</p>
          <h2 id="card-anatomy-title" class="t-heading mt-2">
            {{ t('cards.anatomyGuide.title') }}
          </h2>
          <p class="anatomy-overlay__progress" data-testid="card-anatomy-progress">
            {{ t('cards.anatomyGuide.progress', { current: stepIndex + 1, total: stepCount }) }}
          </p>

          <div class="anatomy-overlay__layout">
            <div class="anatomy-overlay__card" data-testid="card-anatomy-demo">
              <CardDisplay
                :card="CARD_ANATOMY_DEMO"
                size="large"
                disabled
                :highlight-region="stepId"
              />
            </div>

            <div class="anatomy-overlay__copy">
              <h3 class="anatomy-overlay__step-title" data-testid="card-anatomy-step-title">
                {{ title }}
              </h3>
              <p class="anatomy-overlay__step-body">{{ body }}</p>

              <ul
                v-if="stepId === 'figures'"
                class="anatomy-overlay__swatches"
                data-testid="card-anatomy-swatches"
              >
                <li class="anatomy-overlay__swatch anatomy-overlay__swatch--damage">
                  <span class="anatomy-overlay__swatch-gem" aria-hidden="true" />
                  {{ t('cards.anatomyGuide.swatches.damage') }}
                </li>
                <li class="anatomy-overlay__swatch anatomy-overlay__swatch--block">
                  <span class="anatomy-overlay__swatch-gem" aria-hidden="true" />
                  {{ t('cards.anatomyGuide.swatches.block') }}
                </li>
                <li class="anatomy-overlay__swatch anatomy-overlay__swatch--heal">
                  <span class="anatomy-overlay__swatch-gem" aria-hidden="true" />
                  {{ t('cards.anatomyGuide.swatches.heal') }}
                </li>
              </ul>

              <p v-if="stepId === 'effects'" class="anatomy-overlay__rules-link">
                <a
                  href="/rules#cards"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="card-anatomy-rules-link"
                >
                  {{ t('cards.anatomyGuide.rulesLink') }}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div class="anatomy-overlay__actions">
          <button type="button" class="btn-ghost" data-testid="card-anatomy-skip" @click="emit('dismiss')">
            {{ t('cards.anatomyGuide.skip') }}
          </button>
          <div class="anatomy-overlay__nav">
            <button
              type="button"
              class="btn-ghost"
              :disabled="stepIndex === 0"
              data-testid="card-anatomy-back"
              @click="goBack"
            >
              {{ t('cards.anatomyGuide.back') }}
            </button>
            <button
              ref="primaryBtn"
              type="button"
              class="btn-primary"
              data-testid="card-anatomy-next"
              @click="goNext"
            >
              {{ isLast ? t('cards.anatomyGuide.done') : t('cards.anatomyGuide.next') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.anatomy-overlay {
  align-items: end;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
}

.anatomy-overlay__panel {
  display: flex;
  flex-direction: column;
  width: min(52rem, 100%);
  max-height: min(40rem, calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.anatomy-overlay__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: clamp(1rem, 3.5vw, 1.75rem) clamp(1rem, 3.5vw, 2rem) 1rem;
}

.anatomy-overlay__progress {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.anatomy-overlay__layout {
  display: grid;
  grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
  gap: clamp(1rem, 3vw, 1.75rem);
  align-items: center;
  margin-top: 1.25rem;
}

.anatomy-overlay__card {
  width: min(100%, 16rem);
  margin-inline: auto;
  pointer-events: none;
}

.anatomy-overlay__step-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.15rem, 2.5vw, 1.45rem);
  font-weight: 800;
  color: var(--color-ink);
}

.anatomy-overlay__step-body {
  margin-top: 0.65rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.anatomy-overlay__swatches {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.anatomy-overlay__swatch {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.95rem;
  color: var(--color-ink);
}

.anatomy-overlay__swatch-gem {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  transform: rotate(45deg);
  border: 1px solid #f5d78e;
  box-shadow: inset 0 0 0 2px #0c4a6e55;
}

.anatomy-overlay__swatch--damage .anatomy-overlay__swatch-gem {
  background: linear-gradient(135deg, #fecaca, #dc2626 55%, #7f1d1d);
}

.anatomy-overlay__swatch--block .anatomy-overlay__swatch-gem {
  background: linear-gradient(135deg, #fde68a, #92400e 55%, #451a03);
}

.anatomy-overlay__swatch--heal .anatomy-overlay__swatch-gem {
  background: linear-gradient(135deg, #bbf7d0, #16a34a 55%, #14532d);
}

.anatomy-overlay__rules-link {
  margin-top: 1rem;
}

.anatomy-overlay__rules-link a {
  color: var(--color-vermilion, #c43c2c);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.anatomy-overlay__actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding:
    0.85rem clamp(1rem, 3.5vw, 2rem)
    max(0.85rem, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--color-line);
  background: var(--color-bg-card);
}

.anatomy-overlay__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
}

@media (min-width: 641px) {
  .anatomy-overlay {
    align-items: center;
    padding: 1.25rem;
  }
}

@media (max-width: 640px) {
  .anatomy-overlay__layout {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 0.85rem;
    margin-top: 0.85rem;
  }

  .anatomy-overlay__card {
    width: min(100%, 10.75rem);
  }

  .anatomy-overlay__copy {
    width: 100%;
  }

  .anatomy-overlay__actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .anatomy-overlay__nav {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    width: 100%;
    margin-left: 0;
  }

  .anatomy-overlay__nav .btn-primary,
  .anatomy-overlay__actions > .btn-ghost {
    width: 100%;
  }
}

@media (max-height: 720px) and (max-width: 640px) {
  .anatomy-overlay__card {
    width: min(100%, 9.25rem);
  }
}
</style>

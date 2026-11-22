<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MISSION_GUIDE_STEPS } from '../../constants/missionGuideSteps.js';

defineOptions({ name: 'MissionGuideOverlay' });

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['dismiss']);

const { t } = useI18n();
const stepIndex = ref(0);
const dontShowAgain = ref(true);
const primaryBtn = ref(null);

const stepId = computed(() => MISSION_GUIDE_STEPS[stepIndex.value] || MISSION_GUIDE_STEPS[0]);
const stepCount = MISSION_GUIDE_STEPS.length;
const isLast = computed(() => stepIndex.value >= stepCount - 1);
const title = computed(() => t(`combat.missionGuide.steps.${stepId.value}.title`));
const body = computed(() => t(`combat.missionGuide.steps.${stepId.value}.body`));

function finish() {
  emit('dismiss', { dontShowAgain: dontShowAgain.value });
}

function goNext() {
  if (isLast.value) {
    finish();
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
    // Overlay non dismissible hors navigation / fin du guide.
    event.preventDefault();
  } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
    if (event.target?.closest?.('input, label')) return;
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
    dontShowAgain.value = true;
    await nextTick();
    primaryBtn.value?.focus?.();
  },
  { immediate: true },
);

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  setBodyScrollLocked(false);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop mission-guide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-guide-title"
      data-testid="mission-guide-overlay"
    >
      <div class="modal-panel mission-guide__panel">
        <div class="mission-guide__scroll">
          <p class="page-kicker">{{ t('combat.missionGuide.kicker') }}</p>
          <h2 id="mission-guide-title" class="t-heading mt-2">
            {{ t('combat.missionGuide.title') }}
          </h2>
          <p class="mission-guide__progress">
            {{ t('combat.missionGuide.progress', { current: stepIndex + 1, total: stepCount }) }}
          </p>
          <h3 class="mission-guide__step-title">{{ title }}</h3>
          <p class="mission-guide__step-body">{{ body }}</p>
        </div>
        <div class="mission-guide__actions">
          <label class="mission-guide__persist">
            <input
              v-model="dontShowAgain"
              type="checkbox"
              data-testid="mission-guide-dont-show"
            />
            <span>{{ t('combat.missionGuide.dontShowAgain') }}</span>
          </label>
          <div class="mission-guide__nav">
            <button
              type="button"
              class="btn-ghost"
              :disabled="stepIndex === 0"
              data-testid="mission-guide-back"
              @click="goBack"
            >
              {{ t('combat.missionGuide.back') }}
            </button>
            <button
              ref="primaryBtn"
              type="button"
              class="btn-primary"
              data-testid="mission-guide-next"
              @click="goNext"
            >
              {{ isLast ? t('combat.missionGuide.done') : t('combat.missionGuide.next') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mission-guide {
  align-items: end;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
}

.mission-guide__panel {
  display: flex;
  flex-direction: column;
  width: min(34rem, 100%);
  max-height: min(36rem, calc(100dvh - 1.5rem));
  padding: 0;
  overflow: hidden;
}

.mission-guide__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(1rem, 3.5vw, 1.75rem);
}

.mission-guide__progress {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.mission-guide__step-title {
  margin: 1.1rem 0 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
}

.mission-guide__step-body {
  margin-top: 0.65rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.mission-guide__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem clamp(1rem, 3.5vw, 1.75rem) max(0.85rem, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--color-line);
}

.mission-guide__persist {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink);
  cursor: pointer;
  user-select: none;
}

.mission-guide__persist input {
  width: 1.05rem;
  height: 1.05rem;
  accent-color: var(--color-vermilion, #c43c2c);
  cursor: pointer;
}

.mission-guide__nav {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

@media (min-width: 641px) {
  .mission-guide {
    align-items: center;
    padding: 1.25rem;
  }
}

@media (max-width: 640px) {
  .mission-guide__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .mission-guide__nav {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    width: 100%;
    margin-left: 0;
  }
}
</style>

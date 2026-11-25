<script setup>
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { DEFAULT_NINJA_CARD_BACKGROUND_COLOR } from '@shared/character/profileColors.js';
import { NINJA_CARD_BACKGROUNDS } from '../../constants/ninjaCardBackgrounds.js';
import { safeNinjaProfileColor } from '../../utils/ninjaProfile.js';

defineOptions({ name: 'NinjaCardBackgroundPicker' });

const backgroundId = defineModel({ type: String, default: null });
const backgroundColor = defineModel('backgroundColor', { type: String, default: null });
const { t } = useI18n();
const groupName = useId();

function setDefaultColor(event) {
  backgroundColor.value = safeNinjaProfileColor(event.target.value);
}

function resetDefaultColor() {
  backgroundColor.value = null;
}
</script>

<template>
  <fieldset class="bg-picker" data-testid="ninja-card-background-picker">
    <legend class="field__label">{{ t('player.appearance.background') }}</legend>
    <p class="bg-picker__hint">{{ t('player.appearance.backgroundHint') }}</p>
    <div class="bg-picker__rail" role="radiogroup" :aria-label="t('player.appearance.background')">
      <label
        class="bg-picker__option"
        :class="{ 'is-selected': backgroundId == null }"
        data-testid="ninja-card-background-default"
      >
        <input
          type="radio"
          class="sr-only"
          :name="groupName"
          :checked="backgroundId == null"
          @change="backgroundId = null"
        />
        <span
          class="bg-picker__swatch bg-picker__swatch--default"
          :style="{
            '--default-swatch': backgroundColor ?? DEFAULT_NINJA_CARD_BACKGROUND_COLOR,
          }"
          aria-hidden="true"
        />
        <span class="bg-picker__caption">{{ t('player.appearance.default') }}</span>
      </label>
      <label
        v-for="(entry, index) in NINJA_CARD_BACKGROUNDS"
        :key="entry.id"
        class="bg-picker__option"
        :class="{ 'is-selected': backgroundId === entry.id }"
        :data-testid="`ninja-card-background-${entry.id}`"
      >
        <input
          type="radio"
          class="sr-only"
          :name="groupName"
          :value="entry.id"
          :checked="backgroundId === entry.id"
          @change="backgroundId = entry.id"
        />
        <img
          class="bg-picker__swatch"
          :src="entry.src"
          alt=""
          width="120"
          height="72"
          loading="lazy"
        />
        <span class="bg-picker__caption">{{
          t('player.appearance.backgroundOption', { number: index + 1 })
        }}</span>
      </label>
    </div>

    <div
      v-if="backgroundId == null"
      class="bg-picker__tint"
      data-testid="ninja-card-background-tint"
    >
      <label class="field">
        <span class="field__label">{{ t('player.appearance.backgroundColor') }}</span>
        <span class="bg-picker__tint-value">
          <input
            type="color"
            data-testid="ninja-card-background-color"
            :value="backgroundColor ?? DEFAULT_NINJA_CARD_BACKGROUND_COLOR"
            :aria-label="t('player.appearance.backgroundColor')"
            @input="setDefaultColor"
          />
          <span>{{ backgroundColor ?? t('player.appearance.default') }}</span>
        </span>
      </label>
      <button
        v-if="backgroundColor"
        type="button"
        class="btn-ghost"
        data-testid="ninja-card-background-color-reset"
        :aria-label="
          t('player.appearance.resetColor', { label: t('player.appearance.backgroundColor') })
        "
        @click="resetDefaultColor"
      >
        {{ t('player.appearance.default') }}
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.bg-picker {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0;
}

.bg-picker__hint {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

.bg-picker__rail {
  display: flex;
  gap: 0.65rem;
  padding: 0.15rem 0.1rem 0.45rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}

.bg-picker__option {
  display: grid;
  gap: 0.35rem;
  flex: 0 0 7.5rem;
  width: 7.5rem;
  min-width: 0;
  cursor: pointer;
  scroll-snap-align: start;
}

.bg-picker__swatch {
  display: block;
  width: 100%;
  aspect-ratio: 5 / 3;
  object-fit: cover;
  border: 2px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  background: #1d2238;
}

.bg-picker__swatch--default {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.08), transparent 55%),
    var(--default-swatch, #1d2238);
}

.bg-picker__option.is-selected .bg-picker__swatch {
  border-color: var(--color-vermilion);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-vermilion) 35%, transparent);
}

.bg-picker__caption {
  font-size: 0.8125rem;
  font-weight: 700;
}

.bg-picker__tint,
.bg-picker__tint-value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.bg-picker__tint {
  align-items: end;
  margin-top: 0.35rem;
}

.bg-picker__tint-value input {
  width: 2.45rem;
  height: 2.45rem;
  padding: 0.18rem;
  border: 1px solid var(--color-line-strong);
  background: var(--color-bg-card);
  cursor: pointer;
}

.bg-picker__tint-value span {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
</style>

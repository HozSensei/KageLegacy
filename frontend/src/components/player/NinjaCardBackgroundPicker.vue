<script setup>
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { NINJA_CARD_BACKGROUNDS } from '../../constants/ninjaCardBackgrounds.js';

defineOptions({ name: 'NinjaCardBackgroundPicker' });

const backgroundId = defineModel({ type: String, default: null });
const { t } = useI18n();
const groupName = useId();
</script>

<template>
  <fieldset class="bg-picker" data-testid="ninja-card-background-picker">
    <legend class="field__label">{{ t('player.appearance.background') }}</legend>
    <p class="bg-picker__hint">{{ t('player.appearance.backgroundHint') }}</p>
    <div class="bg-picker__grid" role="radiogroup" :aria-label="t('player.appearance.background')">
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
        <span class="bg-picker__swatch bg-picker__swatch--default" aria-hidden="true" />
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

.bg-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.65rem;
}

.bg-picker__option {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  cursor: pointer;
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
    #1d2238;
}

.bg-picker__option.is-selected .bg-picker__swatch {
  border-color: var(--color-vermilion);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-vermilion) 35%, transparent);
}

.bg-picker__caption {
  font-size: 0.8125rem;
  font-weight: 700;
}
</style>

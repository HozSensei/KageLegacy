<script setup>
import { useI18n } from 'vue-i18n';
import { safeNinjaProfileColor } from '../../utils/ninjaProfile.js';

defineOptions({ name: 'NinjaProfileColorField' });

defineProps({
  label: { type: String, required: true },
  defaultSwatch: { type: String, required: true },
});
const color = defineModel({ type: String, default: null });
const { t } = useI18n();
</script>

<template>
  <div class="color-field">
    <label class="field">
      <span class="field__label">{{ label }}</span>
      <span class="color-field__value">
        <input
          type="color"
          :value="color ?? defaultSwatch"
          @input="color = safeNinjaProfileColor($event.target.value)"
        />
        <span>{{ color ?? t('player.appearance.default') }}</span>
      </span>
    </label>
    <button
      v-if="color"
      type="button"
      class="btn-ghost"
      :aria-label="t('player.appearance.resetColor', { label })"
      @click="color = null"
    >
      {{ t('player.appearance.default') }}
    </button>
  </div>
</template>

<style scoped>
.color-field,
.color-field__value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.color-field {
  align-items: end;
}

.color-field__value input {
  width: 2.45rem;
  height: 2.45rem;
  padding: 0.18rem;
  border: 1px solid var(--color-line-strong);
  background: var(--color-bg-card);
  cursor: pointer;
}

.color-field__value span {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
</style>

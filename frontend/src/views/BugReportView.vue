<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/ui/PageHeader.vue';
import { BUG_REPORT_LOCATION_OPTIONS } from '../constants/bugReportLocations.js';
import { parseApiResponse, readApiError } from '../utils/http.js';
import { useToast } from '../composables/useToast.js';

defineOptions({ name: 'BugReportView' });

const { t } = useI18n();
const toast = useToast();
const API_BASE = import.meta.env.VITE_API_URL || '';

const location = ref('hub');
const locationOther = ref('');
const description = ref('');
const submitting = ref(false);
const error = ref('');
const success = ref(false);

const needsOther = computed(() => location.value === 'other');
const canSubmit = computed(() => {
  if (description.value.trim().length < 10) return false;
  if (needsOther.value && !locationOther.value.trim()) return false;
  return true;
});

async function onSubmit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  error.value = '';
  success.value = false;
  try {
    const res = await fetch(`${API_BASE}/api/bug-reports`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: location.value,
        locationOther: needsOther.value ? locationOther.value.trim() : null,
        description: description.value.trim(),
      }),
    });
    const { ok, body } = await parseApiResponse(res);
    if (!ok) throw new Error(await readApiError(res, body));
    success.value = true;
    description.value = '';
    locationOther.value = '';
    toast.push({
      title: t('bugReport.successTitle'),
      body: t('bugReport.successBody'),
      kind: 'success',
    });
  } catch (cause) {
    error.value = cause.message || t('bugReport.error');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="page-shell" data-testid="bug-report-page">
    <PageHeader tone="ink" :title="t('bugReport.title')" :lead="t('bugReport.lead')" />

    <p v-if="error" class="alert alert--error mt-6" role="alert">{{ error }}</p>
    <p v-if="success" class="alert alert--success mt-6" role="status">{{ t('bugReport.successBody') }}</p>

    <form class="panel mt-8 bug-report-form" @submit.prevent="onSubmit">
      <label class="field">
        <span class="field__label">{{ t('bugReport.locationLabel') }}</span>
        <select v-model="location" class="input-field" data-testid="bug-report-location" required>
          <option
            v-for="option in BUG_REPORT_LOCATION_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ t(option.labelKey) }}
          </option>
        </select>
      </label>

      <label v-if="needsOther" class="field mt-4">
        <span class="field__label">{{ t('bugReport.locationOtherLabel') }}</span>
        <input
          v-model="locationOther"
          class="input-field"
          type="text"
          maxlength="120"
          autocomplete="off"
          data-testid="bug-report-location-other"
          :placeholder="t('bugReport.locationOtherPlaceholder')"
          required
        />
      </label>

      <label class="field mt-4">
        <span class="field__label">{{ t('bugReport.descriptionLabel') }}</span>
        <textarea
          v-model="description"
          class="input-field bug-report-form__textarea"
          rows="8"
          maxlength="4000"
          data-testid="bug-report-description"
          :placeholder="t('bugReport.descriptionPlaceholder')"
          required
        />
        <span class="field__hint">{{ t('bugReport.descriptionHint') }}</span>
      </label>

      <button
        type="submit"
        class="btn-primary mt-6"
        :disabled="submitting || !canSubmit"
        data-testid="bug-report-submit"
      >
        {{ submitting ? t('bugReport.sending') : t('bugReport.submit') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.bug-report-form {
  max-width: 40rem;
}

.bug-report-form__textarea {
  min-height: 10rem;
  resize: vertical;
}
</style>

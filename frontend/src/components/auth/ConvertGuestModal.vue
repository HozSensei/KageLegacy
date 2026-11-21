<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';
import GoogleSignInButton from './GoogleSignInButton.vue';

defineOptions({ name: 'ConvertGuestModal' });

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'converted']);

const { t } = useI18n();
const auth = useAuthStore();

const password = ref('');
const email = ref('');
const error = ref(null);
const saving = ref(false);

async function submit() {
  saving.value = true;
  error.value = null;
  const ok = await auth.convertGuest({
    password: password.value,
    email: email.value.trim(),
  });
  saving.value = false;
  if (ok) {
    emit('converted');
    emit('close');
  } else {
    error.value = auth.error;
  }
}

async function onGoogleCredential(idToken) {
  saving.value = true;
  error.value = null;
  const ok = await auth.loginWithGoogle({ idToken });
  saving.value = false;
  if (ok) {
    emit('converted');
    emit('close');
  } else {
    error.value = auth.error;
  }
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <form class="modal-panel" @submit.prevent="submit">
      <h2 class="t-heading">{{ t('guest.convertTitle') }}</h2>
      <p class="mt-3 text-ink-muted">{{ t('guest.convertLead') }}</p>

      <div class="mt-6 space-y-4">
        <label class="field">
          <span class="field__label">{{ t('auth.email') }}</span>
          <input
            v-model="email"
            type="email"
            required
            data-testid="guest-convert-email"
            class="input-field"
          />
        </label>
        <label class="field">
          <span class="field__label">{{ t('auth.password') }}</span>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            data-testid="guest-convert-password"
            class="input-field"
          />
        </label>
      </div>

      <p v-if="error" class="alert alert--error mt-4">{{ error }}</p>

      <div class="mt-6 flex gap-3">
        <button type="button" class="btn-ghost flex-1" @click="emit('close')">
          {{ t('guest.later') }}
        </button>
        <button
          type="submit"
          class="btn-primary flex-1"
          :disabled="saving"
          data-testid="guest-convert-submit"
        >
          {{ saving ? t('auth.loading') : t('guest.convert') }}
        </button>
      </div>

      <div class="guest-convert__google mt-5">
        <p class="guest-convert__or">{{ t('auth.or') }}</p>
        <GoogleSignInButton
          :disabled="saving"
          @credential="onGoogleCredential"
          @error="msg => (error = msg)"
        />
      </div>
    </form>
  </div>
</template>

<style scoped>
.guest-convert__or {
  margin-bottom: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-ink-muted);
}
</style>

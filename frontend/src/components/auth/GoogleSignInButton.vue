<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'GoogleSignInButton' });

const props = defineProps({
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['credential', 'error']);

const { t, locale } = useI18n();
const API_BASE = import.meta.env.VITE_API_URL || '';

const buttonHost = ref(null);
const available = ref(false);
const loadingConfig = ref(true);
const clientId = ref(null);
let scriptPromise = null;

function loadGisScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS load failed'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function renderButton() {
  if (!available.value || !clientId.value || !buttonHost.value || !window.google?.accounts?.id) {
    return;
  }
  buttonHost.value.innerHTML = '';
  window.google.accounts.id.initialize({
    client_id: clientId.value,
    callback: response => {
      if (!response?.credential) {
        emit('error', t('auth.googleError'));
        return;
      }
      emit('credential', response.credential);
    },
    ux_mode: 'popup',
  });
  window.google.accounts.id.renderButton(buttonHost.value, {
    theme: 'outline',
    size: 'large',
    shape: 'rectangular',
    text: 'continue_with',
    width: Math.min(320, buttonHost.value.clientWidth || 320),
    locale: locale.value === 'en' ? 'en' : 'fr',
  });
}

async function bootstrap() {
  loadingConfig.value = true;
  try {
    const res = await fetch(`${API_BASE}/api/auth/providers`, { credentials: 'include' });
    if (!res.ok) {
      available.value = false;
      return;
    }
    const data = await res.json();
    if (!data?.google?.enabled || !data.google.clientId) {
      available.value = false;
      return;
    }
    clientId.value = data.google.clientId;
    await loadGisScript();
    available.value = true;
    renderButton();
  } catch {
    available.value = false;
  } finally {
    loadingConfig.value = false;
  }
}

onMounted(() => {
  bootstrap();
});

watch([locale, () => props.disabled], () => {
  if (available.value) renderButton();
});

onBeforeUnmount(() => {
  if (buttonHost.value) buttonHost.value.innerHTML = '';
});
</script>

<template>
  <div v-if="available || loadingConfig" class="google-signin" data-testid="google-signin">
    <div v-if="loadingConfig" class="google-signin__placeholder">{{ t('auth.loading') }}</div>
    <div
      v-show="available && !loadingConfig"
      ref="buttonHost"
      class="google-signin__host"
      :class="{ 'google-signin__host--disabled': disabled }"
      aria-label="Google"
    />
  </div>
</template>

<style scoped>
.google-signin {
  width: 100%;
}

.google-signin__placeholder {
  display: grid;
  place-items: center;
  min-height: 2.5rem;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
}

.google-signin__host {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 2.5rem;
}

.google-signin__host--disabled {
  pointer-events: none;
  opacity: 0.55;
}
</style>

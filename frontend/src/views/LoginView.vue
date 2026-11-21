<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue';
import NinjaAvatarPicker from '../components/player/NinjaAvatarPicker.vue';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue';
import { DEFAULT_NINJA_AVATAR_ID, STARTING_NINJA_RANK } from '../constants/ninjaAvatars.js';
import { writeStoredLocale } from '../utils/localeStorage.js';
import gateImage from '../assets/illustrations/village-gate.webp';

defineOptions({ name: 'LoginView' });

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const mode = ref(route.path.includes('register') ? 'register' : 'login');

const email = ref('');
const password = ref('');
const characterName = ref('');
const avatarId = ref(DEFAULT_NINJA_AVATAR_ID);
const language = ref(locale.value === 'en' ? 'en' : 'fr');

function onLocaleChange(lang) {
  const code = lang === 'en' ? 'en' : 'fr';
  language.value = code;
  locale.value = code;
  writeStoredLocale(code);
}

const title = computed(() =>
  mode.value === 'register' ? t('auth.registerTitle') : t('auth.loginTitle')
);
const showDemoHint = !import.meta.env.PROD;

function switchMode(next) {
  mode.value = next;
  auth.error = null;
  router.replace(next === 'register' ? '/register' : '/login');
}

function afterAuthSuccess(preferLanguage) {
  const lang = preferLanguage || auth.profile?.language || locale.value;
  if (lang === 'en' || lang === 'fr') {
    locale.value = lang;
    writeStoredLocale(lang);
  }
  router.push('/home');
}

async function submit() {
  const ok =
    mode.value === 'login'
      ? await auth.login(email.value.trim(), password.value)
      : await auth.register({
          email: email.value.trim(),
          password: password.value,
          characterName: characterName.value.trim(),
          language: language.value,
          avatarId: avatarId.value,
        });
  if (ok) {
    afterAuthSuccess(mode.value === 'login' ? auth.profile?.language || locale.value : language.value);
  }
}

async function onGoogleCredential(idToken) {
  const ok = await auth.loginWithGoogle({
    idToken,
    language: language.value,
    avatarId: mode.value === 'register' ? avatarId.value : undefined,
  });
  if (ok) afterAuthSuccess(auth.profile?.language || language.value);
}
</script>

<template>
  <div class="auth">
    <aside class="auth__side" aria-hidden="true">
      <span class="auth__frame illustration">
        <img class="auth__image" :src="gateImage" alt="" decoding="async" />
      </span>
      <div class="auth__side-text">
        <BrandMark size="2.5rem" />
        <p class="auth__slogan">{{ t('landing.title') }}</p>
      </div>
    </aside>

    <main class="auth__main">
      <div class="auth__theme">
        <LocaleSwitcher @change="onLocaleChange" />
        <ThemeToggle />
      </div>
      <div class="auth__card">
        <router-link to="/" class="auth__brand" :aria-label="t('auth.backHome')">
          <BrandMark size="1.5rem" class="text-vermilion" />
          <span>{{ t('app.name') }}</span>
        </router-link>

        <h1 class="page-title auth__title">{{ title }}</h1>

        <p v-if="auth.error" class="alert alert--error mt-6" data-testid="login-error">
          {{ auth.error }}
        </p>

        <form class="auth__form" data-testid="login-form" @submit.prevent="submit">
          <label class="field">
            <span class="field__label">{{
              mode === 'register' ? t('auth.email') : t('auth.emailOrUsername')
            }}</span>
            <input
              v-model="email"
              :type="mode === 'register' ? 'email' : 'text'"
              :autocomplete="mode === 'register' ? 'email' : 'username'"
              required
              data-testid="login-username"
              class="input-field"
            />
          </label>

          <label v-if="mode === 'register'" class="field">
            <span class="field__label">{{ t('player.nameLabel') }}</span>
            <input
              v-model="characterName"
              type="text"
              required
              minlength="2"
              maxlength="100"
              data-testid="register-character-name"
              class="input-field"
            />
          </label>

          <label v-if="mode === 'register'" class="field">
            <span class="field__label">{{ t('profile.language') }}</span>
            <select
              v-model="language"
              required
              data-testid="register-language"
              class="input-field"
              @change="onLocaleChange(language)"
            >
              <option value="fr">{{ t('locale.fr') }} — Français</option>
              <option value="en">{{ t('locale.en') }} — English</option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">{{ t('auth.password') }}</span>
            <input
              v-model="password"
              type="password"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              required
              minlength="6"
              data-testid="login-password"
              class="input-field"
            />
          </label>

          <NinjaAvatarPicker
            v-if="mode === 'register'"
            v-model="avatarId"
            :rank="STARTING_NINJA_RANK"
          />

          <button
            type="submit"
            data-testid="login-submit"
            class="btn-primary btn-lg btn-block"
            :disabled="auth.loading"
          >
            {{
              auth.loading
                ? t('auth.loading')
                : mode === 'register'
                  ? t('auth.register')
                  : t('auth.login')
            }}
          </button>
        </form>

        <div class="auth__divider" role="separator">
          <span>{{ t('auth.or') }}</span>
        </div>

        <GoogleSignInButton
          :disabled="auth.loading"
          @credential="onGoogleCredential"
          @error="msg => (auth.error = msg)"
        />

        <div class="auth__switch">
          <template v-if="mode === 'login'">
            <p>{{ t('auth.noAccount') }}</p>
            <button type="button" class="link-arrow" @click="switchMode('register')">
              {{ t('auth.createAccount') }}
            </button>
          </template>
          <template v-else>
            <p>{{ t('auth.hasAccount') }}</p>
            <button type="button" class="link-arrow" @click="switchMode('login')">
              {{ t('auth.signIn') }}
            </button>
          </template>
        </div>

        <p v-if="showDemoHint" class="auth__demo">{{ t('auth.demoHint') }}</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
}

.auth__side {
  display: none;
}

.auth__main {
  position: relative;
  display: grid;
  place-items: center;
  padding: 2rem var(--space-gutter) 3rem;
}

.auth__theme {
  position: absolute;
  top: 1rem;
  right: var(--space-gutter);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auth__card {
  width: min(26rem, 100%);
  animation: rise-in 520ms var(--ease-out-quint) both;
}

.auth__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-ink);
  text-decoration: none;
}

.auth__title {
  margin-top: 2rem;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-top: 2rem;
}

.auth__divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0;
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
}

.auth__divider::before,
.auth__divider::after {
  content: '';
  height: 1px;
  background: var(--color-line);
}

.auth__switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.75rem;
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-line);
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.auth__demo {
  margin-top: 1.25rem;
  font-size: 0.75rem;
  color: var(--color-ink-faint);
}

@media (min-width: 1024px) {
  .auth {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
  }

  .auth__side {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
    background: var(--color-indigo-deep);
    color: var(--color-on-fill);
  }

  .auth__frame {
    position: absolute;
    inset: 0 0 auto 0;
    height: 62%;
    clip-path: polygon(0 0, 100% 0, 100% 82%, 0 100%);
    animation: fade-in 700ms ease both;
  }

  .auth__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 40% center;
  }

  .auth__side-text {
    position: relative;
    padding: 0 clamp(2rem, 4vw, 3.5rem) clamp(2.5rem, 5vw, 4rem);
    color: var(--color-gold-fill);
  }

  .auth__slogan {
    max-width: 12ch;
    margin-top: 1.5rem;
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 1.5rem + 2.6vw, 4rem);
    font-weight: 800;
    font-stretch: 76%;
    line-height: 0.92;
    letter-spacing: -0.02em;
    color: var(--color-on-fill);
    animation: rise-in 620ms var(--ease-out-quint) 120ms both;
  }
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import BrandMark from '../components/ui/BrandMark.vue'
import ThemeToggle from '../components/ui/ThemeToggle.vue'
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue'
import { writeStoredLocale } from '../utils/localeStorage.js'
import gateImage from '../assets/illustrations/village-gate.webp'

defineOptions({ name: 'LoginView' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const mode = ref(route.path.includes('register') ? 'register' : 'login')
const invitePoolId = ref(route.query.invitePoolId ? Number(route.query.invitePoolId) : null)
const username = ref('')
const password = ref('')
const senseiName = ref('')
const language = ref(locale.value === 'en' ? 'en' : 'fr')
const villageId = ref('leaf')

function onLocaleChange(lang) {
  const code = lang === 'en' ? 'en' : 'fr'
  language.value = code
  locale.value = code
  writeStoredLocale(code)
}

const villageOptions = ['leaf', 'sand', 'mist', 'stone']

const title = computed(() =>
  mode.value === 'register' ? t('auth.registerTitle') : t('auth.loginTitle')
)
const showDemoHint = !import.meta.env.PROD

function switchMode(next) {
  mode.value = next
  auth.error = null
  router.replace(next === 'register' ? '/register' : '/login')
}

async function submit() {
  const ok =
    mode.value === 'login'
      ? await auth.login(username.value.trim(), password.value)
      : await auth.register({
          username: username.value.trim(),
          password: password.value,
          senseiName: senseiName.value.trim(),
          language: language.value,
          invitePoolId: invitePoolId.value || undefined,
          villageId: villageId.value,
        })
  if (ok) {
    const lang =
      mode.value === 'login'
        ? auth.sensei?.language || locale.value
        : language.value
    if (lang === 'en' || lang === 'fr') {
      locale.value = lang
      writeStoredLocale(lang)
    }
    router.push('/home')
  }
}

onMounted(() => {
  if (route.path.includes('register')) mode.value = 'register'
  if (route.query.invitePoolId) {
    mode.value = 'register'
    invitePoolId.value = Number(route.query.invitePoolId)
  }
})
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

        <p v-if="mode === 'register' && invitePoolId" class="alert alert--info mt-6">
          {{ t('auth.inviteLead', { poolId: invitePoolId }) }}
        </p>

        <p v-if="auth.error" class="alert alert--error mt-6" data-testid="login-error">{{ auth.error }}</p>

        <form class="auth__form" data-testid="login-form" @submit.prevent="submit">
          <label class="field">
            <span class="field__label">{{ t('auth.username') }}</span>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              required
              data-testid="login-username"
              class="input-field"
            />
          </label>

          <label v-if="mode === 'register'" class="field">
            <span class="field__label">{{ t('auth.senseiName') }}</span>
            <input
              v-model="senseiName"
              type="text"
              required
              data-testid="register-sensei-name"
              class="input-field"
            />
          </label>

          <label v-if="mode === 'register'" class="field">
            <span class="field__label">{{ t('auth.village') }}</span>
            <select v-model="villageId" required data-testid="register-village" class="input-field">
              <option v-for="id in villageOptions" :key="id" :value="id">
                {{ t(`village.names.${id}`) }}
              </option>
            </select>
            <span class="field__hint">{{ t('auth.villageHint') }}</span>
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

          <button type="submit" data-testid="login-submit" class="btn-primary btn-lg btn-block" :disabled="auth.loading">
            {{ auth.loading ? t('auth.loading') : mode === 'register' ? t('auth.register') : t('auth.login') }}
          </button>
        </form>

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

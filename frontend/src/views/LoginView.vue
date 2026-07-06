<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const mode = ref(route.path.includes('register') ? 'register' : 'login')
const username = ref('')
const password = ref('')
const senseiName = ref('')
const language = ref('fr')

const title = computed(() =>
  mode.value === 'register' ? t('auth.registerTitle') : t('auth.loginTitle')
)

function switchMode(next) {
  mode.value = next
  auth.error = null
  router.replace(next === 'register' ? '/register' : '/login')
}

async function submit() {
  let ok = false
  if (mode.value === 'login') {
    ok = await auth.login(username.value.trim(), password.value)
  } else {
    ok = await auth.register({
      username: username.value.trim(),
      password: password.value,
      senseiName: senseiName.value.trim(),
      language: language.value,
    })
  }
  if (ok) router.push('/')
}

onMounted(() => {
  if (route.path.includes('register')) mode.value = 'register'
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
    <div class="w-full max-w-md border border-line bg-bg-card p-8 sm:p-10">
      <p class="page-kicker text-center">Kage Legacy</p>
      <h1 class="page-title mt-3 text-center">{{ title }}</h1>

      <p v-if="auth.error" class="mt-6 text-sm text-fire">{{ auth.error }}</p>

      <form class="mt-8 space-y-5" @submit.prevent="submit">
        <label class="block text-sm">
          <span class="text-ink-muted">{{ t('auth.username') }}</span>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            required
            class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        <label v-if="mode === 'register'" class="block text-sm">
          <span class="text-ink-muted">{{ t('auth.senseiName') }}</span>
          <input
            v-model="senseiName"
            type="text"
            required
            class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        <label class="block text-sm">
          <span class="text-ink-muted">{{ t('auth.password') }}</span>
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            required
            minlength="6"
            class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        <button
          type="submit"
          class="w-full border border-accent bg-accent/10 py-2.5 text-sm text-accent transition hover:bg-accent/20 disabled:opacity-50"
          :disabled="auth.loading"
        >
          {{ auth.loading ? t('auth.loading') : mode === 'register' ? t('auth.register') : t('auth.login') }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-ink-muted">
        <template v-if="mode === 'login'">
          {{ t('auth.noAccount') }}
          <button type="button" class="text-accent underline-offset-4 hover:underline" @click="switchMode('register')">
            {{ t('auth.createAccount') }}
          </button>
        </template>
        <template v-else>
          {{ t('auth.hasAccount') }}
          <button type="button" class="text-accent underline-offset-4 hover:underline" @click="switchMode('login')">
            {{ t('auth.signIn') }}
          </button>
        </template>
      </p>

      <p class="mt-6 text-center text-xs text-ink-faint">
        {{ t('auth.demoHint') }}
      </p>
    </div>
  </div>
</template>

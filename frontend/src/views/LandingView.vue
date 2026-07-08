<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

defineOptions({ name: 'LandingView' })

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const features = [
  'landing.features.cycle',
  'landing.features.squad',
  'landing.features.league',
  'landing.features.chronicle',
]

const timeline = [
  'landing.timeline.start',
  'landing.timeline.mid',
  'landing.timeline.operation',
  'landing.timeline.end',
]

async function playAsGuest() {
  const ok = await auth.loginAsGuest()
  if (ok) router.push('/bureau')
}
</script>

<template>
  <div class="min-h-screen bg-bg" data-testid="landing-page">
    <header class="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
      <p class="font-display text-xl text-ink">{{ t('app.name') }}</p>
      <div class="flex items-center gap-4 text-[11px] uppercase tracking-[0.14em]">
        <router-link to="/login" class="text-ink-muted hover:text-ink">{{ t('auth.login') }}</router-link>
        <router-link to="/register" class="text-accent hover:underline">{{ t('auth.register') }}</router-link>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-6 pb-20 pt-8 sm:px-10 sm:pt-16">
      <section class="lg:grid lg:grid-cols-12 lg:gap-16">
        <div class="lg:col-span-7">
          <h1 class="page-title">{{ t('landing.title') }}</h1>
          <p class="page-lead mt-6 max-w-xl">{{ t('landing.lead') }}</p>

          <ul class="mt-10 space-y-4">
            <li
              v-for="key in features"
              :key="key"
              class="border-l-2 border-accent/50 pl-4 text-sm leading-7 text-ink-muted"
            >
              {{ t(key) }}
            </li>
          </ul>

          <div class="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              class="border border-accent bg-accent/10 px-6 py-3 text-sm text-accent transition hover:bg-accent/20"
              data-testid="landing-guest"
              :disabled="auth.loading"
              @click="playAsGuest"
            >
              {{ auth.loading ? t('auth.loading') : t('landing.playGuest') }}
            </button>
            <router-link
              to="/register"
              class="btn-ghost px-6 py-3 text-center text-sm"
            >
              {{ t('landing.createAccount') }}
            </router-link>
          </div>

          <p class="mt-4 text-xs text-ink-faint">{{ t('landing.guestHint') }}</p>
          <p v-if="auth.error" class="mt-4 text-sm text-fire">{{ auth.error }}</p>
        </div>

        <aside class="mt-14 border border-line bg-bg-card p-8 lg:col-span-5 lg:mt-0">
          <p class="section-label">{{ t('landing.asideTitle') }}</p>
          <p class="mt-4 text-sm leading-7 text-ink-muted">{{ t('landing.asideBody') }}</p>
          <dl class="mt-8 space-y-4 text-sm">
            <div>
              <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('landing.timelineTitle') }}</dt>
              <dd class="mt-1 text-ink-muted">{{ t('landing.timelineRealtime') }}</dd>
            </div>
            <div
              v-for="key in timeline"
              :key="key"
              class="border-l border-line/80 pl-4"
            >
              <dd class="text-ink-muted leading-relaxed">{{ t(key) }}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  </div>
</template>

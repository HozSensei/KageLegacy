<script setup>
import { computed, onMounted, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSquadStore } from '../stores/squad'
import { useAuthStore } from '../stores/auth'
import { useGameClockLabel } from '../composables/useGameClockLabel.js'
import NotificationBell from '../components/notifications/NotificationBell.vue'

defineOptions({ name: 'AppLayout' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSquadStore()
const auth = useAuthStore()

const navItems = [
  { name: 'bureau', path: '/', label: 'nav.bureau' },
  { name: 'squad', path: '/squad', label: 'nav.squad' },
  { name: 'league', path: '/league', label: 'nav.league' },
  { name: 'market', path: '/market', label: 'nav.market' },
  { name: 'exchanges', path: '/exchanges', label: 'nav.exchanges' },
  { name: 'inventory', path: '/inventory', label: 'nav.inventory' },
  { name: 'operation', path: '/operation', label: 'nav.operation' },
]

const cycleLabel = useGameClockLabel(toRef(store, 'gameClock'))

const activeLabel = computed(() => {
  const item = navItems.find((n) =>
    n.path === '/' ? route.path === '/' : route.path.startsWith(n.path)
  )
  return item ? t(item.label) : ''
})

function isActive(path) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

async function logout() {
  await auth.logout()
  store.sensei = null
  router.push('/login')
}

onMounted(async () => {
  if (!auth.checked) await auth.fetchMe()
  if (!store.sensei) store.fetchSquad()
})
</script>

<template>
  <div class="min-h-screen bg-bg">
    <header class="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 sm:px-10">
        <div class="min-w-0">
          <p class="page-kicker truncate">
            {{ t('app.name') }} <span class="text-ink-faint/60">/</span> {{ activeLabel }}
          </p>
        </div>

        <nav class="hidden items-center gap-8 md:flex">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            class="nav-link"
            :class="{ 'nav-link-active': isActive(item.path) }"
            :data-testid="`nav-${item.name}`"
          >
            {{ t(item.label) }}
          </router-link>
        </nav>

        <div class="flex shrink-0 items-center gap-4">
          <NotificationBell v-if="auth.user || store.sensei" />
          <span v-if="auth.user" class="hidden text-[11px] text-ink-muted sm:inline">
            {{ auth.sensei?.name || auth.user.username }}
          </span>
          <router-link
            v-if="!auth.user"
            to="/login"
            class="text-[11px] uppercase tracking-[0.14em] text-accent hover:underline"
          >
            {{ t('auth.login') }}
          </router-link>
          <button
            v-else
            type="button"
            class="text-[11px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink-muted"
            data-testid="logout-button"
            @click="logout"
          >
            {{ t('auth.logout') }}
          </button>
          <span v-if="store.gameClock" class="hidden text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:inline" data-testid="header-game-clock">
            {{ cycleLabel }}
          </span>
          <div class="flex gap-1 text-[11px] uppercase tracking-[0.14em]">
            <button
              class="px-1.5 py-0.5 transition"
              data-testid="locale-fr"
              :class="locale === 'fr' ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'"
              @click="locale = 'fr'"
            >{{ t('locale.fr') }}</button>
            <span class="text-ink-faint/40">/</span>
            <button
              class="px-1.5 py-0.5 transition"
              data-testid="locale-en"
              :class="locale === 'en' ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'"
              @click="locale = 'en'"
            >{{ t('locale.en') }}</button>
          </div>
        </div>
      </div>

      <!-- Mobile nav -->
      <nav class="flex gap-5 overflow-x-auto border-t border-line px-6 py-2.5 md:hidden">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="shrink-0 nav-link"
          :class="{ 'nav-link-active': isActive(item.path) }"
          :data-testid="`nav-${item.name}`"
        >
          {{ t(item.label) }}
        </router-link>
      </nav>
    </header>

    <main class="relative z-10 pb-16">
      <router-view />
    </main>
  </div>
</template>

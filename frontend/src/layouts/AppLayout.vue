<script setup>
import { computed, onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSquadStore } from '../stores/squad'
import { useAuthStore } from '../stores/auth'
import { useGameClockLabel } from '../composables/useGameClockLabel.js'
import NotificationBell from '../components/notifications/NotificationBell.vue'
import ConvertGuestModal from '../components/auth/ConvertGuestModal.vue'

defineOptions({ name: 'AppLayout' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSquadStore()
const auth = useAuthStore()
const showConvert = ref(false)

const navItems = [
  { name: 'bureau', path: '/bureau', label: 'nav.bureau' },
  { name: 'squad', path: '/squad', label: 'nav.squad' },
  { name: 'missions', path: '/missions', label: 'nav.missions' },
  { name: 'training', path: '/training', label: 'nav.training' },
  { name: 'league', path: '/league', label: 'nav.league' },
  { name: 'market', path: '/market', label: 'nav.market' },
  { name: 'exchanges', path: '/exchanges', label: 'nav.exchanges' },
  { name: 'inventory', path: '/inventory', label: 'nav.inventory' },
  { name: 'operation', path: '/operation', label: 'nav.operation' },
]

const cycleLabel = useGameClockLabel(toRef(store, 'gameClock'))

function isActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const guestDaysLeft = computed(() => {
  if (!auth.user?.guestExpiresAt) return null
  const ms = new Date(auth.user.guestExpiresAt) - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
})

async function logout() {
  await auth.logout()
  store.sensei = null
  router.push('/')
}

onMounted(async () => {
  if (!auth.checked) await auth.fetchMe()
  if (!store.sensei) store.fetchSquad()
})
</script>

<template>
  <div class="min-h-screen bg-bg">
    <header class="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-10 sm:py-4">
        <p class="shrink-0 font-display text-lg text-ink sm:text-xl">
          {{ t('app.name') }}
        </p>

        <nav class="hidden min-w-0 flex-1 items-center justify-center gap-6 overflow-x-auto md:flex lg:gap-8">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            class="nav-link shrink-0"
            :class="{ 'nav-link-active': isActive(item.path) }"
            :data-testid="`nav-${item.name}`"
          >
            {{ t(item.label) }}
          </router-link>
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span v-if="auth.user" class="hidden max-w-[8rem] truncate text-[11px] text-ink-muted lg:inline">
            {{ auth.sensei?.name || auth.user.username }}
          </span>
          <button
            v-if="auth.user"
            type="button"
            class="hidden text-[11px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink-muted sm:inline"
            data-testid="logout-button"
            @click="logout"
          >
            {{ t('auth.logout') }}
          </button>
          <span
            v-if="store.gameClock"
            class="hidden text-[11px] uppercase tracking-[0.14em] text-ink-faint md:inline"
            data-testid="header-game-clock"
          >
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
          <NotificationBell v-if="auth.user || store.sensei" />
        </div>
      </div>

      <nav class="flex gap-5 overflow-x-auto border-t border-line px-4 py-2.5 md:hidden">
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

    <div
      v-if="auth.user?.isGuest"
      class="border-b border-accent/30 bg-accent/5 px-4 py-2 text-center text-xs text-ink-muted sm:px-10"
    >
      {{ t('guest.banner', { days: guestDaysLeft ?? '?' }) }}
      <button type="button" class="ml-2 text-accent underline-offset-4 hover:underline" @click="showConvert = true">
        {{ t('guest.convertCta') }}
      </button>
    </div>

    <main class="relative z-10 pb-16">
      <router-view />
    </main>

    <ConvertGuestModal :open="showConvert" @close="showConvert = false" @converted="store.fetchSquad()" />
  </div>
</template>

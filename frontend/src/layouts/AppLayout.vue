<script setup>
import { computed, onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSquadStore } from '../stores/squad'
import { useAuthStore } from '../stores/auth'
import { useEliteStore } from '../stores/elite'
import { useGameClockLabel } from '../composables/useGameClockLabel.js'
import AppNavDrawer from '../components/layout/AppNavDrawer.vue'
import NotificationBell from '../components/notifications/NotificationBell.vue'
import ProfileMenu from '../components/layout/ProfileMenu.vue'
import PageHero from '../components/layout/PageHero.vue'
import ConvertGuestModal from '../components/auth/ConvertGuestModal.vue'
defineOptions({ name: 'AppLayout' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSquadStore()
const auth = useAuthStore()
const elite = useEliteStore()
const showConvert = ref(false)

const baseNavItems = [
  { name: 'bureau', path: '/bureau', label: 'nav.bureau' },
  { name: 'profile', path: '/profil', label: 'nav.profile' },
  { name: 'squad', path: '/squad', label: 'nav.squad' },
  { name: 'clan', path: '/clan', label: 'nav.clan' },
  { name: 'missions', path: '/missions', label: 'nav.missions' },
  { name: 'training', path: '/training', label: 'nav.training' },
  { name: 'league', path: '/league', label: 'nav.league' },
  { name: 'market', path: '/market', label: 'nav.market' },
  { name: 'exchanges', path: '/exchanges', label: 'nav.exchanges' },
  { name: 'inventory', path: '/inventory', label: 'nav.inventory' },
  { name: 'operation', path: '/operation', label: 'nav.operation' },
]

const eliteToolsNavItem = {
  name: 'elite-tools',
  path: '/elite/outils',
  label: 'nav.eliteTools',
  elite: true,
}

const navItems = computed(() => {
  if (!elite.subscription?.isActive) return baseNavItems
  return [...baseNavItems, eliteToolsNavItem]
})

const cycleLabel = useGameClockLabel(toRef(store, 'gameClock'))

function isActive(path) {
  if (path === '/profil') {
    return route.path === '/profil' || (route.name === 'sensei-profile' && auth.user && String(route.params.userId) === String(auth.user.id))
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

const guestDaysLeft = computed(() => {
  if (!auth.user?.guestExpiresAt) return null
  const ms = new Date(auth.user.guestExpiresAt) - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
})

const pageHero = computed(() => {
  const record = [...route.matched].reverse().find((r) => r.meta?.hero)
  return record?.meta.hero ?? null
})

async function onAccountDeleted() {
  auth.user = null
  auth.sensei = null
  auth.checked = true
  store.clearSquad()
  await router.replace({ name: 'home' })
  if (router.currentRoute.value.name !== 'home') {
    window.location.assign('/')
  }
}

async function logout() {
  await auth.logout()
  store.sensei = null
  router.push('/')
}

onMounted(async () => {
  if (!auth.checked) await auth.fetchMe()
  if (auth.sensei?.language && ['fr', 'en'].includes(auth.sensei.language)) {
    locale.value = auth.sensei.language
  }
  if (!store.sensei) store.fetchSquad()
  if (auth.user && !elite.subscription) elite.fetchElite()
})
</script>

<template>
  <div class="min-h-screen bg-bg">
    <header class="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-10 sm:py-3.5">
        <AppNavDrawer v-if="auth.user" :nav-items="navItems" :is-active="isActive" />

        <router-link to="/bureau" class="shrink-0 font-display text-lg text-ink transition hover:text-accent sm:text-xl">
          {{ t('app.name') }}
        </router-link>

        <span
          v-if="auth.user && store.gameClock"
          class="hidden shrink-0 text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:inline"
          data-testid="header-game-clock"
        >
          {{ cycleLabel }}
        </span>

        <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell v-if="auth.user" />
          <ProfileMenu
            v-if="auth.user"
            @logout="logout"
            @convert="showConvert = true"
            @deleted="onAccountDeleted"
          />
          <router-link
            v-else
            to="/register"
            class="border border-accent bg-accent/10 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-accent transition hover:bg-accent/20"
            data-testid="header-register-cta"
          >
            {{ t('auth.register') }}
          </router-link>
        </div>
      </div>
    </header>

    <PageHero
      v-if="pageHero"
      :image="pageHero.image"
      :title="t(pageHero.titleKey)"
    />

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

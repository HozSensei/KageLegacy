<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSquadStore } from '../stores/squad'
import { useAuthStore } from '../stores/auth'
import { useEliteStore } from '../stores/elite'
import { useNavStructure } from '../composables/useNavStructure'
import { useNotificationWatcher } from '../composables/useNotificationWatcher'
import AppNavDrawer from '../components/layout/AppNavDrawer.vue'
import NotificationBell from '../components/notifications/NotificationBell.vue'
import ToastContainer from '../components/notifications/ToastContainer.vue'
import ProfileMenu from '../components/layout/ProfileMenu.vue'
import AppNavRail from '../components/layout/AppNavRail.vue'
import BrandMark from '../components/ui/BrandMark.vue'
import ThemeToggle from '../components/ui/ThemeToggle.vue'
import { sectionOf } from '../constants/sections'
import ConvertGuestModal from '../components/auth/ConvertGuestModal.vue'
import { writeStoredLocale } from '../utils/localeStorage.js'
defineOptions({ name: 'AppLayout' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSquadStore()
const auth = useAuthStore()
const elite = useEliteStore()
const showConvert = ref(false)

const baseNavItems = [
  { name: 'hub', path: '/home', label: 'nav.home' },
  { name: 'profile', path: '/profil', label: 'nav.profile' },
  { name: 'collection', path: '/collection', label: 'nav.collection' },
  { name: 'decks', path: '/decks', label: 'nav.decks' },
  { name: 'talents', path: '/talents', label: 'nav.talents' },
  { name: 'missions', path: '/missions', label: 'nav.missions' },
  { name: 'shop', path: '/shop', label: 'nav.shop' },
  { name: 'battle-pass', path: '/battle-pass', label: 'nav.battlePass' },
  { name: 'pvp', path: '/pvp', label: 'nav.pvp' },
  { name: 'leaderboard', path: '/classement', label: 'nav.leaderboard' },
]

const eliteToolsNavItem = {
  name: 'elite-tools',
  path: '/elite/outils',
  label: 'nav.eliteTools',
  elite: true,
}

const adminNavItem = {
  name: 'admin',
  path: '/admin',
  label: 'nav.admin',
  admin: true,
}

const navItems = computed(() => {
  const items = [...baseNavItems]
  if (elite.featureEnabled && elite.subscription?.isActive) items.push(eliteToolsNavItem)
  if (auth.user?.isAdmin) items.push(adminNavItem)
  return items
})

function isActive(path) {
  if (path === '/home') {
    return route.path === '/home' || route.path === '/bureau' || route.name === 'hub'
  }
  if (path === '/profil') {
    return route.path === '/profil' || route.name === 'profile' || route.name === 'character-creation'
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

const { groups: navGroups, currentSectionLabel } = useNavStructure({
  navItems,
  isActive,
  t,
})

useNotificationWatcher()

const guestDaysLeft = computed(() => {
  if (!auth.user?.guestExpiresAt) return null
  const ms = new Date(auth.user.guestExpiresAt) - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
})

const currentSection = computed(() => {
  const active = navItems.value.find((item) => isActive(item.path))
  return active ? sectionOf(active.name) : null
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
    writeStoredLocale(auth.sensei.language)
  }
  if (!store.sensei) store.fetchSquad()
  if (auth.user && !elite.subscription) elite.fetchElite()
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--rail': auth.user }">
    <AppNavRail v-if="auth.user" :nav-groups="navGroups" :is-active="isActive" />

    <header class="app-bar">
      <div class="app-bar__inner">
        <AppNavDrawer v-if="auth.user" :nav-groups="navGroups" :is-active="isActive" />

        <router-link to="/home" class="app-bar__brand">
          <BrandMark size="1.5rem" class="app-bar__mark" />
          <span class="app-bar__wordmark">{{ t('app.name') }}</span>
        </router-link>

        <p
          v-if="auth.user && currentSectionLabel"
          class="app-bar__section"
          :data-tone="currentSection?.tone"
        >
          <span v-if="currentSection?.index" class="app-bar__section-index" aria-hidden="true">
            {{ currentSection.index }}
          </span>
          <span class="truncate" data-testid="nav-current-section">{{ currentSectionLabel }}</span>
        </p>

        <div class="app-bar__tools">
          <ThemeToggle />
          <NotificationBell v-if="auth.user" />
          <ProfileMenu
            v-if="auth.user"
            @logout="logout"
            @convert="showConvert = true"
            @deleted="onAccountDeleted"
          />
          <router-link v-else to="/register" class="btn-primary btn-sm" data-testid="header-register-cta">
            {{ t('auth.register') }}
          </router-link>
        </div>
      </div>
    </header>

    <div v-if="auth.user?.isGuest" class="guest-band">
      <span class="lozenge" aria-hidden="true" />
      <span>{{ t('guest.banner', { days: guestDaysLeft ?? '?' }) }}</span>
      <button type="button" class="guest-band__cta" @click="showConvert = true">
        {{ t('guest.convertCta') }}
      </button>
    </div>

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <ToastContainer v-if="auth.user" />

    <ConvertGuestModal :open="showConvert" @close="showConvert = false" @converted="store.fetchSquad()" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
}

.app-shell--rail {
  padding-left: var(--shell-rail);
}

.app-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg);
}

.app-bar__inner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  max-width: 72rem;
  min-height: 3.5rem;
  margin-inline: auto;
  padding: 0.4rem var(--space-gutter);
}

.app-bar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  flex: none;
  color: var(--color-ink);
  text-decoration: none;
}

.app-bar__mark {
  color: var(--color-vermilion);
  transition: transform var(--dur-base) var(--ease-out-quint);
}

.app-bar__brand:hover .app-bar__mark {
  transform: rotate(90deg);
}

.app-bar__wordmark {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: -0.01em;
}

.app-bar__section {
  display: none;
  align-items: baseline;
  gap: 0.45rem;
  min-width: 0;
  margin-left: 0.5rem;
  padding-left: 0.9rem;
  border-left: 1px solid var(--color-line-strong);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.app-bar__section-index {
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  color: var(--tone);
}

.app-bar__tools {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: none;
  margin-left: auto;
}

.guest-band {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem 0.7rem;
  padding: 0.5rem var(--space-gutter);
  background: var(--color-gold-tint);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-ink);
}

.guest-band .lozenge {
  color: var(--color-gold-fill);
}

.guest-band__cta {
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
  color: var(--color-ink);
}

.guest-band__cta:hover {
  color: var(--color-accent);
}

.app-main {
  position: relative;
  padding-bottom: 3rem;
}

@media (min-width: 640px) {
  .app-bar__section {
    display: flex;
  }
}

@media (max-width: 380px) {
  .app-bar__wordmark {
    display: none;
  }
}
</style>

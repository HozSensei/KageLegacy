<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '../stores/auth';
import { usePlayerStore } from '../stores/player';

import { useNavStructure } from '../composables/useNavStructure';

import AppNavDrawer from '../components/layout/AppNavDrawer.vue';

import ProfileMenu from '../components/layout/ProfileMenu.vue';
import SiteFooter from '../components/layout/SiteFooter.vue';
import BrandMark from '../components/ui/BrandMark.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { useShopStore } from '../stores/shop';
import { useVillageRewardsStore } from '../stores/villageRewards.js';
import { useOnboardingStore } from '../stores/onboarding.js';
import { useNotificationsStore } from '../stores/notifications.js';
import { useNotificationCopy } from '../composables/useNotificationCopy.js';
import { useToast } from '../composables/useToast.js';
import { sectionOf } from '../constants/sections';
import ConvertGuestModal from '../components/auth/ConvertGuestModal.vue';
import NotificationBell from '../components/notifications/NotificationBell.vue';
import ToastContainer from '../components/notifications/ToastContainer.vue';
import { writeStoredLocale } from '../utils/localeStorage.js';
defineOptions({ name: 'AppLayout' });

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const isCombatLayout = computed(() => route.meta.combatLayout === true);

const auth = useAuthStore();
const player = usePlayerStore();

const shop = useShopStore();
const villageRewards = useVillageRewardsStore();
const onboarding = useOnboardingStore();
const notifications = useNotificationsStore();
const toast = useToast();
const notificationCopy = useNotificationCopy();
const showConvert = ref(false);

const baseNavItems = [
  { name: 'hub', path: '/home', label: 'nav.home' },
  { name: 'profile', path: '/profil', label: 'nav.profile' },
  { name: 'village', path: '/village', label: 'village.title' },
  { name: 'rules', path: '/rules', label: 'rules.link' },
  { name: 'collection', path: '/collection', label: 'nav.collection' },
  { name: 'decks', path: '/decks', label: 'nav.decks' },
  { name: 'talents', path: '/talents', label: 'nav.talents' },
  { name: 'missions', path: '/missions', label: 'nav.missions' },
  { name: 'shop', path: '/shop', label: 'nav.shop' },
  { name: 'battle-pass', path: '/battle-pass', label: 'nav.battlePass' },
  { name: 'journal', path: '/journal', label: 'nav.journal' },
  { name: 'leaderboard', path: '/classement', label: 'nav.leaderboard' },
  { name: 'coop', path: '/coop', label: 'coop.title' },
  { name: 'deck-duels', path: '/deck-duels', label: 'nav.deckDuels' },
];

const adminNavItem = {
  name: 'admin',
  path: '/admin',
  label: 'nav.admin',
  admin: true,
};

const navItems = computed(() => {
  const items = [...baseNavItems];

  if (auth.user?.isAdmin) items.push(adminNavItem);
  return items;
});

function isActive(path) {
  if (path === '/home') {
    return route.path === '/home' || route.name === 'hub';
  }
  if (path === '/profil') {
    return (
      route.path === '/profil' || route.name === 'profile' || route.name === 'character-creation'
    );
  }
  return route.path === path || route.path.startsWith(`${path}/`);
}

const { groups: navGroups, currentSectionLabel } = useNavStructure({
  navItems,
  isActive,
  t,
});

const guestDaysLeft = computed(() => {
  if (!auth.user?.guestExpiresAt) return null;
  const ms = new Date(auth.user.guestExpiresAt) - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

const currentSection = computed(() => {
  const active = navItems.value.find(item => isActive(item.path));
  return active ? sectionOf(active.name) : null;
});

function clearSessionStores() {
  auth.user = null;
  auth.profile = null;
  auth.checked = true;
  player.reset();
  onboarding.reset();
  villageRewards.reset?.();
  notifications.reset?.();
}

async function onAccountDeleted() {
  clearSessionStores();

  await router.replace({ name: 'home' });
  if (router.currentRoute.value.name !== 'home') {
    window.location.assign('/');
  }
}

async function logout() {
  await auth.logout();
  clearSessionStores();
  router.push('/');
}

let notificationSync = Promise.resolve();

function refreshNotifications() {
  if (!auth.user || document.hidden || isCombatLayout.value) return;
  if (route.name !== 'village') {
    void villageRewards.refresh();
  }
  const userId = auth.user.id;
  notificationSync = notificationSync.then(async () => {
    if (auth.user?.id !== userId) return;
    const { fresh } = await notifications.fetchNotifications();
    for (const note of fresh || []) {
      toast.push({
        title: notificationCopy.title(note),
        body: notificationCopy.body(note),
        kind: 'event',
      });
    }
  });
}

let balanceLoad = Promise.resolve();
function refreshBalances() {
  const userId = auth.user?.id;
  balanceLoad = balanceLoad.then(() =>
    userId != null && auth.user?.id === userId ? shop.fetchBalances() : null
  );
  return balanceLoad;
}

watch([() => auth.user?.id, () => route.path], refreshNotifications, { immediate: true });
watch(
  () => villageRewards.rewards?.[0]?.weekStart,
  week => {
    if (week) void refreshBalances();
  }
);

onMounted(async () => {
  document.addEventListener('visibilitychange', refreshNotifications);
  if (!auth.checked) await auth.fetchMe();
  if (auth.profile?.language && ['fr', 'en'].includes(auth.profile.language)) {
    locale.value = auth.profile.language;
    writeStoredLocale(auth.profile.language);
  }

  if (auth.user) await refreshBalances();
});

onUnmounted(() => document.removeEventListener('visibilitychange', refreshNotifications));
</script>

<template>
  <div class="app-shell" :data-combat-layout="isCombatLayout || undefined">
    <header class="app-bar">
      <div class="app-bar__inner">
        <AppNavDrawer v-if="auth.user" :nav-groups="navGroups" :is-active="isActive" />

        <router-link to="/home" class="app-bar__brand" :aria-label="t('app.name')">
          <BrandMark size="1.5rem" class="app-bar__mark" />
          <span class="app-bar__wordmark">{{ t('app.name') }}</span>
        </router-link>

        <p
          v-if="auth.user && !isCombatLayout && currentSectionLabel"
          class="app-bar__section"
          :data-tone="currentSection?.tone"
        >
          <span v-if="currentSection?.index" class="app-bar__section-index" aria-hidden="true">
            {{ currentSection.index }}
          </span>
          <span class="truncate" data-testid="nav-current-section">{{ currentSectionLabel }}</span>
        </p>

        <div class="app-bar__tools">
          <template v-if="!isCombatLayout">
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
              class="btn-primary btn-sm"
              data-testid="header-register-cta"
            >
              {{ t('auth.register') }}
            </router-link>
          </template>

          <div v-if="auth.user" id="combat-header-tools" class="app-bar__combat-tools" />
        </div>
      </div>
    </header>

    <div v-if="auth.user?.isGuest && !isCombatLayout" class="guest-band">
      <span class="lozenge" aria-hidden="true" />
      <span>{{ t('guest.banner', { days: guestDaysLeft ?? '?' }) }}</span>
      <button type="button" class="guest-band__cta" @click="showConvert = true">
        {{ t('guest.convertCta') }}
      </button>
    </div>

    <main class="app-main" :class="{ 'app-main--combat': isCombatLayout }">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.name" />
        </Transition>
      </router-view>
    </main>

    <SiteFooter v-if="!isCombatLayout" tone="paper" />

    <ConvertGuestModal v-if="!isCombatLayout" :open="showConvert" @close="showConvert = false" />
    <ToastContainer v-if="auth.user" />

    <router-link
      v-if="auth.user && !isCombatLayout && route.name !== 'bug-report'"
      to="/bug-report"
      class="bug-fab"
      data-testid="bug-report-fab"
      :aria-label="t('bugReport.fabLabel')"
      :title="t('bugReport.fabLabel')"
    >
      <AppIcon name="bug" size="1.35rem" :stroke-width="0" />
    </router-link>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
}

.bug-fab {
  position: fixed;
  right: 1rem;
  bottom: 1.5rem;
  z-index: 45;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface, var(--color-bg));
  color: var(--color-ink);
  text-decoration: none;
}

.bug-fab:hover {
  border-color: var(--color-ink);
}

.app-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg);
}

.app-bar__inner {
  position: relative;
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

.app-bar__combat-tools:not(:has(> *)) {
  display: none;
}

.app-bar__rewards {
  position: relative;
}

.app-bar__unread-dot {
  position: absolute;
  inset-block-start: 0.35rem;
  inset-inline-end: 0.35rem;
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid var(--color-bg);
  border-radius: 50%;
  background: var(--color-vermilion);
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
  flex: 1 0 auto;
  padding-bottom: 3rem;
}

.app-main--combat {
  padding-bottom: 0;
}

@media (min-width: 640px) {
  .app-bar__section {
    display: flex;
  }
}

@media (max-width: 540px) {
  .app-bar__inner:has(.app-bar__combat-tools > *) .app-bar__brand {
    flex-shrink: 1;
    min-width: 0;
  }

  .app-bar__inner:has(.app-bar__combat-tools > *) .app-bar__wordmark {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 380px) {
  .app-bar__wordmark {
    display: none;
  }
}
</style>

import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import LandingView from '../views/LandingView.vue';
import LoginView from '../views/LoginView.vue';
import RulesView from '../views/RulesView.vue';

import HubView from '../views/HubView.vue';
import Profile from '../views/Profile.vue';
import CharacterCreation from '../views/CharacterCreation.vue';
import CollectionView from '../views/CollectionView.vue';
import DeckBuilderView from '../views/DeckBuilderView.vue';
import TalentTreeView from '../views/TalentTreeView.vue';
import MissionsCombatView from '../views/MissionsCombatView.vue';
import MissionRunView from '../views/MissionRunView.vue';
import CombatView from '../views/CombatView.vue';
import ShopView from '../views/ShopView.vue';
import BattlePassView from '../views/BattlePassView.vue';
import JournalView from '../views/JournalView.vue';
import PvpQueueView from '../views/PvpQueueView.vue';
import PvpDuelView from '../views/PvpDuelView.vue';
import LeaderboardView from '../views/LeaderboardView.vue';
import AdminView from '../views/AdminView.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.meta.combatLayout) return { top: 0 };
    return false;
  },
  routes: [
    { path: '/', name: 'home', component: LandingView },
    { path: '/rules', name: 'rules', component: RulesView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: LoginView },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'home',
          name: 'hub',
          component: HubView,
        },

        {
          path: 'character-creation',
          name: 'character-creation',
          component: CharacterCreation,
        },
        {
          path: 'profil',
          name: 'profile',
          component: Profile,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'collection',
          name: 'collection',
          component: CollectionView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'decks',
          name: 'decks',
          component: DeckBuilderView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'talents',
          name: 'talents',
          component: TalentTreeView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'missions',
          name: 'missions',
          component: MissionsCombatView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'missions/run/:id',
          name: 'mission-run',
          component: MissionRunView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'combat/:id',
          name: 'combat',
          component: CombatView,
          meta: {
            requiresCharacter: true,
            combatLayout: true,
          },
        },
        {
          path: 'shop',
          name: 'shop',
          component: ShopView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'battle-pass',
          name: 'battle-pass',
          component: BattlePassView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'journal',
          name: 'journal',
          component: JournalView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'pvp',
          name: 'pvp',
          component: PvpQueueView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'pvp/duel/:id',
          name: 'pvp-duel',
          component: PvpDuelView,
          meta: {
            requiresCharacter: true,
            combatLayout: true,
          },
        },
        {
          path: 'classement',
          name: 'leaderboard',
          component: LeaderboardView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'admin',
          name: 'admin',
          component: AdminView,
          meta: { requiresAdmin: true },
        },
      ],
    },
  ],
});

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/rules']);

router.beforeEach(async to => {
  const auth = useAuthStore();

  if (PUBLIC_PATHS.has(to.path)) {
    if (!auth.checked) await auth.fetchMe();
    if (auth.user && (to.path === '/' || to.path === '/login' || to.path === '/register')) {
      return { path: '/home' };
    }
    return true;
  }

  if (!auth.checked) await auth.fetchMe();
  if (!auth.user) return { path: '/' };
  if (to.meta.requiresAdmin && !auth.user.isAdmin) return { path: '/home' };

  // Hub + character creation are reachable without a character (empty-state / onboarding).
  const allowWithoutCharacter = new Set(['hub', 'character-creation', 'admin']);
  if (!allowWithoutCharacter.has(to.name)) {
    const { usePlayerStore } = await import('../stores/player');
    const player = usePlayerStore();
    if (!player.checked) await player.fetchPlayer();
    if (player.hasConfirmedCharacterAbsence && to.meta.requiresCharacter !== false) {
      return { name: 'character-creation' };
    }
  }

  return true;
});

export default router;
